-- Pickup OTP is issued when the assigned rider arrives, not at booking.
--
-- A code minted at booking expires long before the rider reaches the sender,
-- so bookings now store no pickup code. The rider's "arrived" action (or an
-- explicit resend) mints the single active code with a 10-minute window.
ALTER TABLE shipments ALTER COLUMN pickup_otp DROP NOT NULL;

-- Clear stale booking-time codes on parcels still awaiting pickup so the
-- arrival flow is the only source of a valid handover code.
UPDATE shipments
SET pickup_otp = NULL,
    pickup_otp_expires_at = NULL,
    pickup_otp_attempts = 0,
    pickup_otp_consumed_at = NULL
WHERE status IN ('BOOKED', 'RIDER_ASSIGNED');