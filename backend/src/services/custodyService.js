const db = require('../config/db');
const { OTP_MAX_ATTEMPTS } = require('../utils/otp');
const { isRoleAllowedForHandover } = require('../config/custodyRoles');

// Pickup OTP pre-flight. Runs outside the custodial transaction so a rejected
// attempt is still counted after the rollback that follows a failed handover.
async function assertPickupOtpUsable(shipmentId, verificationToken) {
  const res = await db.query(
    `SELECT pickup_otp, pickup_otp_expires_at, pickup_otp_attempts, pickup_otp_consumed_at
     FROM shipments WHERE id = $1`,
    [shipmentId]
  );
  if (res.rows.length === 0) return; // the transaction reports the missing shipment

  const otp = res.rows[0];
  if (otp.pickup_otp_consumed_at) {
    throw new Error('This Pickup OTP has already been used for this parcel.');
  }
  if (otp.pickup_otp_expires_at && new Date(otp.pickup_otp_expires_at).getTime() <= Date.now()) {
    throw new Error('This Pickup OTP has expired. Request a new one before pickup.');
  }

  const attempts = Number(otp.pickup_otp_attempts || 0);
  if (attempts >= OTP_MAX_ATTEMPTS) {
    throw new Error('Too many incorrect Pickup OTP attempts. This code is now locked; request a new one.');
  }

  if (verificationToken !== otp.pickup_otp) {
    await db.query(
      'UPDATE shipments SET pickup_otp_attempts = COALESCE(pickup_otp_attempts, 0) + 1 WHERE id = $1',
      [shipmentId]
    );
    const remaining = OTP_MAX_ATTEMPTS - attempts - 1;
    throw new Error(
      remaining > 0
        ? `Invalid Pickup OTP provided by sender. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Invalid Pickup OTP. No attempts remaining; this code is now locked.'
    );
  }
}

/**
 * Executes an atomic custody transfer with verification token validation,
 * state machine progression, bay assignment, and immutable ledger logging.
 */
async function processCustodyTransfer({
  shipmentId,
  handoverType,
  verificationMethod,
  verificationToken,
  actorId,
  actorRole,
  lat = null,
  lng = null,
  bayCode = null,
  notes = ''
}) {
  // Defence in depth: even if a route forgets its gate, the service refuses a
  // transition the caller's role is not entitled to perform.
  if (!isRoleAllowedForHandover(handoverType, actorRole)) {
    throw new Error(`Role '${actorRole}' may not perform a ${handoverType} custody handover.`);
  }

  if (handoverType === 'SENDER_TO_RIDER') {
    await assertPickupOtpUsable(shipmentId, verificationToken);
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Fetch active shipment
    const shipRes = await client.query(
      'SELECT * FROM shipments WHERE id = $1 FOR UPDATE',
      [shipmentId]
    );

    if (shipRes.rows.length === 0) {
      throw new Error(`Shipment with ID ${shipmentId} not found.`);
    }

    const shipment = shipRes.rows[0];
    let newStatus = shipment.status;
    let prevHolderType = 'NONE';
    let prevHolderId = null;
    let newHolderType = 'HUB';
    let newHolderId = null;

    // Lookup rider entity ID if actor is a rider
    let riderEntityId = null;
    if (actorRole === 'rider') {
      const rRes = await client.query('SELECT id FROM riders WHERE user_id = $1 OR id = $1', [actorId]);
      if (rRes.rows.length > 0) {
        riderEntityId = rRes.rows[0].id;
      }
    }

    // 1. Process Handover Specific Business Logic & OTP/QR Verification
    switch (handoverType) {
      case 'SENDER_TO_RIDER': {
        // Pickup OTP expiry, attempt ceiling and single-use are enforced before
        // the transaction opens; reaching here means the code is usable.
        newStatus = 'PICKED_UP_FROM_SENDER';
        prevHolderType = 'SENDER';
        prevHolderId = shipment.sender_id;
        newHolderType = 'RIDER';
        newHolderId = riderEntityId || actorId;

        await client.query(
          `UPDATE shipments 
           SET status = 'IN_TRANSIT_TO_HUB', 
               picked_up_at = NOW(), 
               assigned_rider_id = COALESCE(assigned_rider_id, $1), 
               pickup_otp_consumed_at = NOW(), 
               pickup_otp_attempts = 0, 
               updated_at = NOW() 
           WHERE id = $2`,
          [riderEntityId, shipmentId]
        );
        newStatus = 'IN_TRANSIT_TO_HUB';
        break;
      }

      case 'RIDER_TO_HUB': {
        // Hub intake: Verify QR token or tracking code
        if (verificationToken !== shipment.collection_qr_token && verificationToken !== shipment.tracking_code) {
          throw new Error('Invalid QR token or tracking code for Hub intake.');
        }

        prevHolderType = 'RIDER';
        prevHolderId = shipment.assigned_rider_id;
        newHolderType = 'HUB';
        newHolderId = shipment.destination_hub_id || actorId;

        let bayId = null;
        if (bayCode && shipment.destination_hub_id) {
          const bayRes = await client.query(
            `UPDATE hub_storage_bays 
             SET is_occupied = TRUE, current_shipment_id = $1 
             WHERE hub_id = $2 AND bay_code = $3 
             RETURNING id`,
            [shipmentId, shipment.destination_hub_id, bayCode]
          );
          if (bayRes.rows.length > 0) {
            bayId = bayRes.rows[0].id;
          }
        }

        // Increment hub load
        if (shipment.destination_hub_id) {
          await client.query(
            'UPDATE hubs SET current_load = current_load + 1 WHERE id = $1',
            [shipment.destination_hub_id]
          );
        }

        await client.query(
          `UPDATE shipments 
           SET status = 'STORED_IN_BAY', 
               received_at_hub_at = NOW(), 
               assigned_bay_id = COALESCE($1, assigned_bay_id),
               updated_at = NOW() 
           WHERE id = $2`,
          [bayId, shipmentId]
        );
        newStatus = 'STORED_IN_BAY';
        break;
      }

      case 'HUB_TO_RECIPIENT': {
        // Final collection at Hub: Verify Delivery OTP or QR token
        if (verificationToken !== shipment.delivery_otp && verificationToken !== shipment.collection_qr_token) {
          throw new Error('Invalid Delivery OTP or QR Pass presented for collection.');
        }

        prevHolderType = 'HUB';
        prevHolderId = shipment.destination_hub_id;
        newHolderType = 'RECIPIENT';
        newHolderId = null;

        // Free up hub storage bay and decrease load
        if (shipment.assigned_bay_id) {
          await client.query(
            'UPDATE hub_storage_bays SET is_occupied = FALSE, current_shipment_id = NULL WHERE id = $1',
            [shipment.assigned_bay_id]
          );
        }
        if (shipment.destination_hub_id) {
          await client.query(
            'UPDATE hubs SET current_load = GREATEST(0, current_load - 1) WHERE id = $1',
            [shipment.destination_hub_id]
          );
        }

        await client.query(
          `UPDATE shipments 
           SET status = 'COLLECTED_AT_HUB', 
               collected_at = NOW(), 
               updated_at = NOW() 
           WHERE id = $1`,
          [shipmentId]
        );
        newStatus = 'COLLECTED_AT_HUB';

        // Trigger Hub Host commission payout to host wallet
        if (shipment.destination_hub_id) {
          const hostRes = await client.query('SELECT owner_id FROM hubs WHERE id = $1', [shipment.destination_hub_id]);
          if (hostRes.rows.length > 0) {
            const hostOwnerId = hostRes.rows[0].owner_id;
            const commission = parseFloat(shipment.pricing_total_ngn) * 0.40; // 40% Hub commission
            await client.query(
              `INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn)
               VALUES ($1, $2, $2)
               ON CONFLICT (user_id) DO UPDATE SET
                 balance_ngn = wallets.balance_ngn + $2,
                 ledger_balance_ngn = wallets.ledger_balance_ngn + $2,
                 updated_at = NOW()`,
              [hostOwnerId, commission]
            );
          }
        }
        break;
      }

      case 'RIDER_TO_RECIPIENT': {
        // Door delivery: Recipient confirms with delivery OTP
        if (verificationToken !== shipment.delivery_otp) {
          throw new Error('Invalid Recipient Delivery OTP.');
        }

        prevHolderType = 'RIDER';
        prevHolderId = shipment.assigned_rider_id;
        newHolderType = 'RECIPIENT';
        newHolderId = null;

        await client.query(
          `UPDATE shipments 
           SET status = 'DELIVERED_TO_RECIPIENT', 
               delivered_at = NOW(), 
               updated_at = NOW() 
           WHERE id = $1`,
          [shipmentId]
        );
        newStatus = 'DELIVERED_TO_RECIPIENT';

        // Trigger Rider payout to rider wallet
        if (shipment.assigned_rider_id) {
          const riderRes = await client.query('SELECT user_id FROM riders WHERE id = $1', [shipment.assigned_rider_id]);
          if (riderRes.rows.length > 0) {
            const riderUserId = riderRes.rows[0].user_id;
            const payout = parseFloat(shipment.pricing_total_ngn) * 0.35; // 35% rider payout
            await client.query(
              `INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn)
               VALUES ($1, $2, $2)
               ON CONFLICT (user_id) DO UPDATE SET
                 balance_ngn = wallets.balance_ngn + $2,
                 ledger_balance_ngn = wallets.ledger_balance_ngn + $2,
                 updated_at = NOW()`,
              [riderUserId, payout]
            );
          }
        }
        break;
      }

      default:
        throw new Error(`Unsupported handover type: ${handoverType}`);
    }

    // 2. Insert Immutable Record into Custody Ledger
    const ledgerRes = await client.query(
      `INSERT INTO custody_ledger (
         shipment_id,
         previous_holder_type,
         previous_holder_id,
         new_holder_type,
         new_holder_id,
         handover_type,
         status_after_handover,
         verification_method,
         verification_token,
         lat,
         lng,
         actor_id,
         actor_role,
         notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        shipmentId,
        prevHolderType,
        prevHolderId,
        newHolderType,
        newHolderId,
        handoverType,
        newStatus,
        verificationMethod,
        verificationToken,
        lat,
        lng,
        actorId,
        actorRole,
        notes
      ]
    );

    // 3. Create Notification for Sender
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, 'SHIPMENT_UPDATE')`,
      [
        shipment.sender_id,
        `Shipment ${shipment.tracking_code} Updated`,
        `Status is now: ${newStatus.replace(/_/g, ' ')} via ${handoverType.replace(/_/g, ' ')}.`
      ]
    );

    await client.query('COMMIT');

    return {
      success: true,
      newStatus,
      ledgerEntry: ledgerRes.rows[0]
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  processCustodyTransfer,
};
