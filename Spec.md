# DROPBOXZ
## Complete Product Requirements & Technical Build Specification

**Document version:** 1.0  
**Product:** Dropboxz 
**Category:** Community parcel logistics and delivery infrastructure  
**Initial market:** Nigeria  
**Platform strategy:** Mobile-first Progressive Web Application, backend API, operations console, and enterprise integrations  
**Delivery scope:** Complete production platform, including security, financial operations, compliance, support, monitoring, and future expansion capabilities.

---

# 1. Executive Summary

Dropboxz is a technology-enabled parcel handoff network connecting senders, recipients, verified neighborhood merchants, courier companies, independent riders, and network administrators.

The platform establishes trusted parcel pickup and drop-off locations within existing commercial businesses, reducing failed delivery attempts and providing recipients with greater control over when and where they collect their parcels.

Dropboxz combines:

- Nigeria's National Digital Alphanumeric Postcode System and authorized location services.
- Verified neighborhood collection hubs.
- Courier dispatch and route coordination.
- Digital chain-of-custody records.
- Secure, time-limited recipient collection authorization.
- Real-time parcel and hub-capacity management.
- Payments, commissions, settlements, claims, and dispute resolution.
- Compliance, licensing, risk management, and operational analytics.
- APIs for e-commerce merchants and logistics providers.

## 1.1 Mission

Make every parcel handoff in Nigeria more accessible, accountable, secure, and predictable by connecting reliable local collection points with a digitally coordinated logistics network.

## 1.2 Product objectives

1. Reduce failed doorstep deliveries and repeat delivery costs.
2. Increase delivery success through convenient neighborhood pickup locations.
3. Establish auditable custody of every parcel.
4. Enable small businesses to earn additional income as parcel hubs.
5. Give couriers and logistics companies access to a distributed pickup and delivery network.
6. Improve address resolution through standardized digital postcodes and supporting location information.
7. Establish a scalable commercial platform with transparent partner earnings.
8. Provide measurable service quality, fraud prevention, and regulatory compliance.

## 1.3 Product principles

- Every parcel must have a unique system identity.
- Every custody transfer must be recorded.
- Every parcel must have exactly one authoritative current custodian or an explicitly defined exception state.
- No parcel may be collected without valid authorization.
- Hub capacity must be enforced transactionally.
- No payment, commission, or refund may exist only as an untraceable balance adjustment.
- No identity document may be collected without a documented purpose and access policy.
- Regulatory credentials and Dropboxz's own accreditation must remain separate.
- Operational actions must remain auditable, including administrator interventions.
- The platform must remain usable on low-cost Android devices and unreliable mobile networks.

---

# 2. Business and Network Model

## 2.1 Participants

### A. Individual customers

Customers may act as senders, recipients, or both.

Capabilities include registration, booking, hub discovery, parcel tracking, payment, collection, returns, support, and transaction history.

### B. Hub operators

A hub is an approved physical business that accepts, stores, and releases parcels.

Eligible locations may include pharmacies, supermarkets, convenience stores, retail shops, and other suitable commercial premises.

A hub operator may manage multiple branches, and each branch must have its own capacity, operating hours, location, staff assignments, and compliance status.

### C. Courier companies

Registered logistics businesses may manage their own riders, fleets, dispatchers, service areas, and shipment bookings.

A courier company may integrate with Dropboxz through its web portal or API.

### D. Independent riders and drivers

Independent couriers may apply to operate on the network, subject to the applicable legal, contractual, and operational requirements.

A rider's identity verification does not replace any legally required operator licensing.

### E. Enterprise shippers

Online merchants, marketplaces, distributors, and businesses may create shipments in bulk, purchase delivery services, and reconcile transactions.

### F. Network administrators

Administrators oversee network quality, onboarding, risk, operations, pricing, support, and financial controls.

### G. Compliance and finance personnel

Specialized staff manage regulatory records, audits, reconciliation, payouts, and disputes through restricted permissions.

## 2.2 Business model

Dropboxz should support multiple revenue sources:

1. Per-parcel platform service fees.
2. Courier coordination and delivery fees.
3. Hub network service fees where contractually agreed.
4. Enterprise shipment volumes and API plans.
5. Premium reporting, reconciliation, and integration services.
6. Contractual onboarding, accreditation, and revalidation charges where lawful and transparently disclosed.
7. Optional insurance or shipment-protection products through appropriately authorized providers.

The commercial model must avoid charging partners twice for the same service without clear disclosure.

**Important distinction:** Dropboxz accreditation fees are private commercial charges, not NIPOST regulatory license fees. Any statutory fees must be paid through the applicable official process.

---

# 3. Service Types and Shipment Products

The booking engine must support four principal service types.

## 3.1 Address-to-Dropboxz Hub

The sender or shipper creates a shipment, and the recipient selects an eligible hub.

The parcel is delivered to that hub for recipient collection.

## 3.2 Dropboxz Hub-to-Dropboxz Hub

The sender deposits a parcel at an origin hub. An assigned courier or logistics partner transports it to the destination hub.

The recipient collects it using a valid collection authorization.

## 3.3 Door-to-Dropboxz Hub

A courier collects a parcel from the sender's address and deposits it at the selected destination hub.

## 3.4 Dropboxz Hub-to-Door

The parcel is collected from a hub and assigned for delivery to the recipient's verified delivery location.

## 3.5 Additional service products

The platform must also support:

- Scheduled pickups.
- Same-city and intercity shipments.
- Multi-parcel bookings.
- Business bulk shipments.
- Returns to sender.
- Authorized parcel redirection.
- Failed-delivery recovery.
- Time-sensitive delivery products.
- Contractual business delivery plans.
- Cancellations and refunds under defined policies.

Service availability must depend on actual network coverage, hub operating hours, courier capacity, parcel restrictions, and the selected service's terms.

---

# 4. Customer Application

The customer application must be a responsive, installable PWA with accessible mobile interfaces.

## 4.1 Registration and identity

Features:

- Phone-number registration and verification.
- Optional email registration and verification.
- Secure login and session management.
- Account recovery.
- Profile and notification preferences.
- Multiple saved addresses.
- Saved pickup hubs.
- Consent and privacy settings.
- Account deactivation and applicable data-rights requests.

OTP-based login and parcel-collection OTPs must use separate purposes, policies, and verification records.

A phone number alone must not establish legal identity.

## 4.2 Hub discovery

Users must be able to search by:

- Official digital postcode.
- Existing conventional postcode where applicable.
- State and LGA.
- City, neighborhood, or community.
- Street address.
- Landmark.
- Hub name.
- Map selection.
- Current device location, with permission.

Search results must display:

- Hub name and verified business identity.
- Distance from the chosen reference point.
- Estimated walking or driving time where a routing provider supports it.
- Opening hours and next available collection window.
- Current capacity and eligible parcel types.
- Available service types.
- Accessibility and storage information where relevant.
- Hub accreditation and regulatory disclosures.
- Applicable fees.
- Current operational status.

The system must distinguish between a hub that is open and one that has capacity to accept a new parcel.

### Ranking algorithm

Hub ranking should use a configurable weighted score based on:

- Distance or travel time.
- Current capacity.
- Operating hours.
- Service compatibility.
- Hub reliability and incident history.
- Customer-selected preferences.
- Estimated handling and pickup availability.

Distance alone must not determine ranking.

A hub with no available capacity or a suspended operational status must not be offered for a new reservation.

## 4.3 Booking workflow

1. Select the service type.
2. Enter sender and recipient details.
3. Resolve the origin and destination locations.
4. Choose an eligible destination hub or door-delivery address.
5. Enter parcel dimensions, weight, quantity, and contents category.
6. Run prohibited-item and service-eligibility checks.
7. Display the complete price and service terms.
8. Reserve the necessary hub or pickup capacity.
9. Confirm payment authorization where required.
10. Create the shipment and parcel records.
11. Generate a tracking reference such as `DZ-XXXXXX`.
12. Generate a scannable parcel label.
13. Notify the relevant parties.
14. Display tracking and expected service milestones.

The booking process must be idempotent. Retrying a network request must not accidentally create duplicate bookings or duplicate charges.

The system must distinguish a temporary reservation, a confirmed booking, and a parcel that has actually entered physical custody.

## 4.4 Tracking

Customers must see a chronological timeline with statuses such as:

- Booking confirmed.
- Awaiting sender handoff.
- Pickup scheduled.
- Courier assigned.
- Collected by courier.
- In transit.
- Arrived at destination hub.
- Awaiting recipient collection.
- Collection authorization issued.
- Collected by recipient.
- Delivery completed.
- Delivery exception.
- Return initiated.
- Returned to sender.
- Cancelled.

Tracking must show timestamps and relevant service milestones without exposing private internal information, rider identity documents, or sensitive hub-security details.

## 4.5 Collection

The recipient must receive an appropriate collection notification when the parcel is ready.

The collection interface must support:

- Six-digit single-use OTP.
- Expiration and controlled resend.
- Attempt throttling.
- Confirmation of successful collection.
- Optional additional verification for higher-risk parcels.
- Authorized collection by a delegated person, where the service permits it.
- Recovery procedures for inaccessible SMS or compromised contact details.

A parcel must be marked collected only after the backend has successfully validated authorization and committed the custody transfer.

## 4.6 Returns, cancellations, and claims

Customers must be able to:

- Request cancellation when the shipment is still eligible.
- Request a permitted redirection.
- Request a return.
- Report a missing or damaged parcel.
- Report an unauthorized collection.
- Upload supporting evidence.
- View claim status.
- Receive a decision and applicable refund.
- Appeal a decision under the published dispute process.

Cancellation fees, refund eligibility, storage charges, and claim deadlines must be configurable and disclosed before confirmation.

---

# 5. Host and Hub Management

## 5.1 Hub onboarding

Each application must capture the information needed for risk assessment and contractual onboarding.

Business details:

- Legal or registered business name, where applicable.
- Trading name.
- Business registration or CAC information where applicable.
- Business category.
- Business address and digital postcode.
- Contact information.
- Operating hours.
- Number of branches.
- Proposed storage capacity.
- Available storage types.
- Emergency contact.
- Business-owner or authorized-representative details.

Verification records may include business documents, identity verification results, address verification, and inspection reports.

NIN, BVN, utility bills, and other sensitive records must only be collected where justified by a documented lawful purpose, applicable legal requirements, and a suitable verification arrangement.

The system must not assume that every hub needs every document. Requirements must be configurable by partner type and risk tier.

## 5.2 Verification lifecycle

Possible states:

- DRAFT
- SUBMITTED
- UNDER_REVIEW
- ADDITIONAL_INFORMATION_REQUIRED
- INSPECTION_REQUIRED
- APPROVED
- ACTIVE
- SUSPENDED
- REJECTED
- EXPIRED
- CLOSED

Approval must not automatically make a hub operational if required contractual, insurance, licensing, inspection, or training conditions remain outstanding.

Suspension must prevent new bookings and intake where necessary while preserving the ability to manage existing parcels safely.

## 5.3 Capacity and storage

Each hub must have configurable:

- Maximum package count.
- Maximum total storage volume.
- Maximum total storage weight where needed.
- Oversized-parcel limits.
- Restricted-item policies.
- Storage zones or shelves.
- Temporary reservation capacity.
- Intake capacity.
- Maximum holding duration.
- Operating and collection windows.

Capacity must be reserved transactionally and released only when the reservation expires, is cancelled, or the parcel leaves the relevant capacity pool.

A database transaction or equivalent concurrency control must prevent two simultaneous bookings from exceeding the hub's available capacity.

## 5.4 Intake workflow

1. Staff authenticate.
2. Staff scan the tracking code or label.
3. The backend verifies the shipment, destination, and expected custody.
4. Staff confirm parcel condition and required intake details.
5. The backend checks the hub's operational status and capacity.
6. Staff confirm physical receipt.
7. The system records the custody transfer.
8. A storage location is assigned.
9. The parcel becomes available for the next permitted workflow.
10. Notifications are sent when appropriate.

A scan must not, by itself, prove physical receipt. The staff member must confirm the handoff, and the system must verify that the transfer is authorized.

## 5.5 Storage and collection

The hub portal must show:

- Parcels awaiting intake.
- Parcels currently stored.
- Parcel storage location.
- Time received.
- Expected collection deadline.
- Storage-charge status.
- Expiring collection authorization.
- Overdue parcels.
- Parcels under investigation.
- Return-to-sender instructions.

When a customer presents a valid OTP, the backend must atomically validate and consume the token, record the authorized release, mark the parcel collected, and update capacity.

The hub operator must not be able to bypass this process merely by editing the parcel status.

## 5.6 Host earnings

The portal must show:

- Completed qualifying handoffs.
- Earned commission per parcel.
- Pending earnings.
- Approved adjustments.
- Payable balance.
- Payout history.
- Failed payouts.
- Disputed transactions.
- Downloadable statements.

The system must calculate commissions from versioned commercial agreements, not hardcoded values in the user interface.

---

# 6. Courier and Rider Operations

## 6.1 Courier onboarding

Support individual riders and company-managed fleets.

Capture, where applicable:

- Legal name and contact information.
- Organization or employer.
- Vehicle type and registration.
- Driving or riding credentials.
- Identity-verification status.
- Relevant insurance and permit information.
- Service area.
- Availability.
- Training and operational certification.
- Applicable regulatory licensing records.

Document expiry must trigger reminders and, when necessary, automated suspension from eligible jobs.

## 6.2 Dispatch and job assignment

The dispatch engine must consider:

- Pickup and destination locations.
- Route feasibility.
- Vehicle type.
- Parcel size and weight.
- Rider capacity.
- Service deadlines.
- Traffic and estimated travel time where supported.
- Rider availability.
- Service-area restrictions.
- Hub operating hours.
- Existing workload.
- Pickup and transfer commitments.

Dispatch modes:

- Manual dispatcher assignment.
- Rules-based automatic assignment.
- Courier-company assignment.
- Eligible rider job claiming.
- Reassignment after timeout or failure.

Job claiming must be protected by atomic concurrency control so that two riders cannot successfully claim the same exclusive job.

## 6.3 Route manifests

A route manifest must include the assigned jobs, ordered stops, parcel references, expected handoffs, and completion requirements.

Features:

- Navigation handoff to a mapping application.
- Pickup and drop-off scanning.
- Stop completion.
- Failed-attempt reasons.
- Incident reporting.
- Route changes.
- Dispatcher reassignment.
- Offline event capture.
- Synchronization and conflict handling.

Offline events must never silently overwrite newer server records. Conflicts must be reconciled according to event sequence, authorization, and custody rules.

## 6.4 Pickup and custody transfer

At pickup:

1. Verify the assignment.
2. Scan the parcel.
3. Validate the expected pickup party and location.
4. Record the parcel's condition.
5. Confirm physical handoff.
6. Record the previous and new custodian.
7. Commit the transfer.
8. Update tracking and dispatch status.

The system must retain the identity of the person or organization responsible for the parcel throughout transit.

## 6.5 Proof of delivery and drop-off

Evidence may include:

- Barcode or QR scan.
- Authorized recipient or hub acknowledgment.
- Timestamp.
- Geolocation where appropriate and permitted.
- Parcel condition.
- Authorized signature or photo where required.
- Exception code.
- Digital custody receipt.

Geolocation is supporting evidence, not a substitute for an authorized handoff.

Photos must not unnecessarily capture identity documents, unrelated customers, private residential interiors, or other sensitive information.

---

# 7. Network Administration

The administration console must support distinct permissions for operations, verification, finance, customer support, security, and system administration.

## 7.1 Network overview

Display:

- Total registered and active hubs.
- Hub capacity utilization.
- Active shipments.
- Parcels in transit.
- Parcels awaiting collection.
- Overdue shipments.
- Courier availability.
- Failed deliveries.
- Open incidents.
- Claims and disputes.
- Revenue and settlement summaries.
- Geographic coverage.
- Service-level performance.

## 7.2 Partner administration

Administrators must be able to:

- Review applications.
- Request missing information.
- Schedule inspections.
- Approve, reject, suspend, or reactivate partners.
- Review expiring documents.
- Manage hub branches.
- Manage staff assignments.
- Configure service areas.
- Review training completion.
- Record compliance findings.

All privileged changes must require an authorized role and produce an audit record.

## 7.3 Operational controls

The system must support:

- Parcel exception queues.
- Stalled-shipment detection.
- Capacity alerts.
- Missed pickup alerts.
- Overdue collection alerts.
- Courier reassignment.
- Return-to-sender authorization.
- Hub closure procedures.
- Emergency custody transfers.
- Incident escalation.
- Service suspension.
- Controlled administrative overrides.

Administrative overrides must require a reason and, for sensitive operations, approval by a second authorized person.

## 7.4 Compliance records

Maintain separate records for:

- Statutory operator licenses.
- Business registration.
- Insurance.
- Identity-verification outcomes.
- Hub inspections.
- Training.
- Dropboxz accreditation.
- Revalidation.
- Suspension and reinstatement history.

Each record must have an issuer, reference, scope, issue date, expiry date, verification evidence, status, and reviewer where applicable.

---

# 8. Enterprise Shipper Platform

Enterprise customers require their own organization accounts and access controls.

Features:

- Organization and branch management.
- Role-based staff access.
- Bulk shipment creation.
- CSV import and export.
- Shipment-label generation.
- Saved recipients and approved address books.
- Rate cards and negotiated pricing.
- Credit limits where contractually authorized.
- Shipment manifests.
- Batch cancellation.
- Returns management.
- Reconciliation reports.
- Invoice generation.
- API credential management.
- Webhook configuration.
- Usage analytics.
- Dispute submission.

Enterprise users must only access shipments and financial records belonging to their organization or explicitly authorized subsidiaries.

---

# 9. Parcel State Machine and Custody Rules

The parcel lifecycle must be implemented as an explicit backend state machine.

Suggested states:

- `CREATED`
- `AWAITING_HANDOFF`
- `RESERVED_FOR_PICKUP`
- `COURIER_ASSIGNED`
- `COURIER_PICKUP`
- `IN_TRANSIT`
- `ARRIVED_AT_HUB`
- `READY_FOR_COLLECTION`
- `COLLECTED`
- `DELIVERED`
- `EXCEPTION`
- `RETURN_PENDING`
- `RETURN_IN_TRANSIT`
- `RETURNED`
- `CANCELLED`
- `LOST`
- `DAMAGED`

Not every shipment uses every state. Permitted transitions depend on the service type and current custody.

Example transitions:

- `CREATED` → `AWAITING_HANDOFF`
- `AWAITING_HANDOFF` → `COURIER_ASSIGNED`
- `AWAITING_HANDOFF` → `RESERVED_FOR_PICKUP`
- `COURIER_ASSIGNED` → `COURIER_PICKUP`
- `COURIER_PICKUP` → `IN_TRANSIT`
- `IN_TRANSIT` → `ARRIVED_AT_HUB`
- `ARRIVED_AT_HUB` → `READY_FOR_COLLECTION`
- `READY_FOR_COLLECTION` → `COLLECTED`
- `IN_TRANSIT` → `DELIVERED` for eligible door-delivery workflows
- Eligible active states → `EXCEPTION`
- An authorized active or exception state → `RETURN_PENDING`
- `RETURN_PENDING` → `RETURN_IN_TRANSIT`
- `RETURN_IN_TRANSIT` → `RETURNED`

`LOST` and `DAMAGED` require explicit incident handling and must not function as ordinary shortcuts to shipment completion.

## 9.1 Mandatory invariants

1. A terminal shipment cannot be reopened through an ordinary status update.
2. A parcel cannot be collected twice.
3. A parcel cannot have two simultaneous authoritative custodians.
4. A hub cannot receive a parcel unless it is eligible for intake.
5. An unauthorized actor cannot initiate a custody transfer.
6. A collection token cannot be redeemed more than once.
7. A status transition and its custody event must commit atomically.
8. A failed database transaction must not send a false success notification.
9. Every manual override must record the actor, reason, timestamp, and resulting state.
10. Historical events must remain available to authorized investigators after the parcel is completed.

Use a custody ledger and append-only operational event records. Corrections must be represented by additional authorized events rather than silent deletion of historical evidence.

---

# 10. Complete Database Design

Use PostgreSQL with PostGIS for location-aware operations. The schema must support multi-tenant organizations, multiple branches, multiple parcel units, and financial reconciliation.

## 10.1 Identity and access

### `users`
- `id` UUID primary key
- `phone`
- `email`
- `display_name`
- `account_status`
- `phone_verified_at`
- `email_verified_at`
- `created_at`
- `updated_at`

### `organizations`
- `id`
- `legal_name`
- `trading_name`
- `organization_type`
- `registration_number`
- `status`
- `created_at`

### `organization_members`
- `id`
- `organization_id`
- `user_id`
- `role_id`
- `status`
- `joined_at`

### `roles`
- `id`
- `name`
- `scope_type`

### `permissions`
- `id`
- `permission_key`
- `description`

### `role_permissions`
- `role_id`
- `permission_id`

### `user_sessions`
- `id`
- `user_id`
- `session_hash`
- `expires_at`
- `revoked_at`
- `created_at`

### `verification_records`
- `id`
- `subject_type`
- `subject_id`
- `verification_type`
- `provider`
- `status`
- `verified_at`
- `expires_at`
- `reviewer_id`

Do not store raw NIN, BVN, or identity-document content in general-purpose user records. Use a suitably secured verification provider where possible, and separate encrypted evidence storage when retention is justified.

## 10.2 Location and network

### `locations`
- `id`
- `location_type`
- `official_digital_postcode`
- `conventional_postcode`
- `state_code`
- `lga`
- `area_name`
- `street_address`
- `landmark`
- `coordinates` as PostGIS geography
- `address_source`
- `address_verified_at`
- `created_at`

### `hubs`
- `id`
- `organization_id`
- `location_id`
- `hub_code`
- `display_name`
- `operational_status`
- `max_package_count`
- `max_storage_volume`
- `max_storage_weight`
- `opening_hours`
- `cutoff_rules`
- `max_hold_duration`
- `created_at`

### `hub_storage_locations`
- `id`
- `hub_id`
- `zone_code`
- `shelf_code`
- `storage_type`
- `status`

### `hub_capacity_reservations`
- `id`
- `hub_id`
- `shipment_id`
- `reserved_count`
- `reserved_volume`
- `reserved_weight`
- `status`
- `expires_at`
- `created_at`

### `hub_inspections`
- `id`
- `hub_id`
- `inspection_type`
- `inspection_result`
- `findings`
- `inspector_id`
- `inspected_at`
- `next_inspection_at`

### `service_areas`
- `id`
- `organization_id`
- `service_type`
- `geographic_boundary`
- `status`

## 10.3 Partner compliance

### `partner_credentials`
- `id`
- `organization_id`
- `credential_type`
- `issuer`
- `reference_number`
- `credential_scope`
- `issued_at`
- `expires_at`
- `verification_status`
- `evidence_reference`

### `partner_accreditations`
- `id`
- `organization_id`
- `accreditation_type`
- `status`
- `issued_at`
- `expires_at`
- `approved_by`

### `partner_staff`
- `id`
- `organization_id`
- `user_id`
- `assigned_hub_id`
- `staff_role`
- `status`

### `vehicles`
- `id`
- `organization_id`
- `registration_number`
- `vehicle_type`
- `capacity_weight`
- `capacity_volume`
- `verification_status`
- `status`

### `rider_profiles`
- `id`
- `user_id`
- `organization_id`
- `vehicle_id`
- `service_area_id`
- `availability_status`
- `verification_status`

## 10.4 Shipments and parcels

### `shipments`
- `id`
- `tracking_code`
- `sender_user_id`
- `sender_organization_id`
- `recipient_user_id`
- `recipient_name`
- `recipient_phone_encrypted`
- `service_type`
- `origin_location_id`
- `destination_location_id`
- `origin_hub_id`
- `destination_hub_id`
- `shipment_status`
- `payment_status`
- `declared_value`
- `currency`
- `quoted_price`
- `final_price`
- `expected_delivery_at`
- `created_at`
- `updated_at`

### `parcels`
- `id`
- `shipment_id`
- `parcel_code`
- `weight`
- `length`
- `width`
- `height`
- `contents_category`
- `packaging_type`
- `condition_status`
- `current_custodian_type`
- `current_custodian_id`
- `current_hub_id`
- `storage_location_id`
- `created_at`

### `shipment_items`
- `id`
- `shipment_id`
- `item_category`
- `description`
- `quantity`
- `declared_value`

Do not require a detailed inventory of sealed parcel contents unless the service or applicable rules justify it. The platform must screen for prohibited and restricted categories without encouraging unnecessary inspection of private goods.

### `shipment_events`
- `id`
- `shipment_id`
- `parcel_id`
- `event_type`
- `previous_status`
- `new_status`
- `actor_type`
- `actor_id`
- `location_id`
- `occurred_at`
- `recorded_at`
- `idempotency_key`
- `metadata`

### `custody_transfers`
- `id`
- `parcel_id`
- `from_custodian_type`
- `from_custodian_id`
- `to_custodian_type`
- `to_custodian_id`
- `transfer_type`
- `location_id`
- `initiated_by`
- `accepted_by`
- `condition_at_transfer`
- `evidence_reference`
- `transferred_at`

### `proof_of_delivery`
- `id`
- `shipment_id`
- `parcel_id`
- `delivery_method`
- `recipient_confirmation_type`
- `evidence_reference`
- `verified_by`
- `confirmed_at`

### `parcel_labels`
- `id`
- `parcel_id`
- `label_version`
- `barcode_value`
- `issued_at`
- `revoked_at`

## 10.5 Collection security

### `collection_authorizations`
- `id`
- `parcel_id`
- `recipient_user_id`
- `token_hash`
- `purpose`
- `expires_at`
- `attempt_count`
- `max_attempts`
- `consumed_at`
- `revoked_at`
- `created_at`

### `verification_attempts`
- `id`
- `authorization_id`
- `actor_id`
- `outcome`
- `attempted_at`
- `risk_metadata`

Store only a secure token verifier or hash where appropriate. Apply expiry, attempt limits, resend throttling, and atomic redemption.

## 10.6 Dispatch and routing

### `delivery_jobs`
- `id`
- `shipment_id`
- `job_type`
- `assigned_rider_id`
- `assigned_organization_id`
- `job_status`
- `scheduled_at`
- `accepted_at`
- `completed_at`

### `route_manifests`
- `id`
- `organization_id`
- `rider_id`
- `vehicle_id`
- `manifest_status`
- `planned_start_at`
- `started_at`
- `completed_at`

### `route_stops`
- `id`
- `manifest_id`
- `location_id`
- `stop_sequence`
- `stop_type`
- `status`
- `arrival_at`
- `departure_at`

### `route_stop_parcels`
- `route_stop_id`
- `parcel_id`
- `expected_action`

### `delivery_exceptions`
- `id`
- `shipment_id`
- `parcel_id`
- `exception_type`
- `description`
- `reported_by`
- `resolution_status`
- `created_at`
- `resolved_at`

## 10.7 Payments and accounting

### `price_quotes`
- `id`
- `customer_id`
- `service_type`
- `origin_location_id`
- `destination_location_id`
- `pricing_version_id`
- `base_amount`
- `surcharges`
- `discount_amount`
- `tax_amount`
- `total_amount`
- `expires_at`

### `pricing_rules`
- `id`
- `pricing_version_id`
- `service_type`
- `weight_band`
- `distance_band`
- `base_fee`
- `additional_fee`
- `effective_from`
- `effective_until`

### `payment_transactions`
- `id`
- `shipment_id`
- `payer_id`
- `provider`
- `provider_reference`
- `amount`
- `currency`
- `status`
- `idempotency_key`
- `created_at`
- `settled_at`

### `ledger_accounts`
- `id`
- `account_code`
- `account_type`
- `currency`
- `owner_type`
- `owner_id`

### `ledger_transactions`
- `id`
- `transaction_type`
- `reference_type`
- `reference_id`
- `status`
- `created_at`
- `posted_at`

### `ledger_entries`
- `id`
- `ledger_transaction_id`
- `ledger_account_id`
- `debit_amount`
- `credit_amount`
- `currency`

### `partner_commissions`
- `id`
- `partner_id`
- `shipment_id`
- `commission_type`
- `calculation_version`
- `amount`
- `status`

### `payouts`
- `id`
- `partner_id`
- `amount`
- `currency`
- `destination_reference`
- `provider_reference`
- `status`
- `requested_at`
- `completed_at`

### `refunds`
- `id`
- `payment_transaction_id`
- `amount`
- `reason`
- `status`
- `approved_by`
- `created_at`

### `financial_reconciliations`
- `id`
- `provider`
- `reconciliation_period`
- `external_reference`
- `internal_reference`
- `expected_amount`
- `actual_amount`
- `difference_amount`
- `status`
- `resolved_at`

Financial ledger entries must be immutable once posted. Corrections must use reversing or adjusting entries. Each financial transaction must balance, and financial reconciliation must detect missing, duplicate, delayed, or mismatched provider transactions.

## 10.8 Notifications and support

### `notification_preferences`
- `id`
- `user_id`
- `channel`
- `event_type`
- `enabled`

### `notifications`
- `id`
- `user_id`
- `shipment_id`
- `channel`
- `template_key`
- `delivery_status`
- `provider_reference`
- `sent_at`

### `support_tickets`
- `id`
- `customer_id`
- `shipment_id`
- `category`
- `priority`
- `status`
- `assigned_to`
- `created_at`
- `resolved_at`

### `support_messages`
- `id`
- `ticket_id`
- `sender_id`
- `message`
- `attachment_reference`
- `created_at`

### `claims`
- `id`
- `shipment_id`
- `claim_type`
- `claim_amount`
- `status`
- `assigned_to`
- `decision`
- `created_at`
- `resolved_at`

## 10.9 Platform administration

### `audit_logs`
- `id`
- `actor_id`
- `action`
- `resource_type`
- `resource_id`
- `reason`
- `correlation_id`
- `created_at`

### `webhook_endpoints`
- `id`
- `organization_id`
- `endpoint_url`
- `secret_reference`
- `status`
- `created_at`

### `webhook_deliveries`
- `id`
- `webhook_endpoint_id`
- `event_id`
- `attempt_count`
- `next_attempt_at`
- `last_response_code`
- `status`

### `api_credentials`
- `id`
- `organization_id`
- `credential_hash`
- `scopes`
- `environment`
- `expires_at`
- `revoked_at`

### `idempotency_records`
- `id`
- `actor_id`
- `operation`
- `idempotency_key`
- `request_hash`
- `response_reference`
- `expires_at`

### `system_settings`
- `id`
- `setting_key`
- `setting_value`
- `effective_from`
- `updated_by`

## 10.10 Database requirements

- Use UUID primary keys for internal entities.
- Use unique constraints for tracking codes, parcel codes, provider references, and applicable idempotency keys.
- Index foreign keys, operational statuses, time fields, and common lookup fields.
- Use GiST indexes for PostGIS geography and spatial queries.
- Use database transactions for custody, collection, reservation, and financial operations.
- Use foreign keys and explicit deletion policies to protect historical records.
- Use row-level security where appropriate for tenant isolation.
- Encrypt sensitive fields and external evidence references.
- Partition high-volume event tables when measured scale justifies it.
- Define data retention and archival rules before production.
- Keep migrations version-controlled and test them against representative datasets.

The schema above is the logical baseline. The implementation team must create the final relational model, constraints, indexes, migration scripts, and documented entity relationships before release.

---

# 11. Backend Architecture

## 11.1 Recommended architecture

Use a modular monolith initially, with clear service boundaries. This avoids the operational complexity of premature microservices while allowing high-load components to be separated later.

Recommended stack:

- **Frontend:** TypeScript, React, Vite, installable PWA.
- **Backend:** TypeScript, Node.js, NestJS or an equivalent structured API framework.
- **Database:** PostgreSQL with PostGIS.
- **Cache and ephemeral coordination:** Redis.
- **Background processing:** Durable queue backed by a suitable queue service or Redis-based queue, with retry and dead-letter handling.
- **File storage:** Private S3-compatible object storage.
- **Authentication:** Secure server-managed sessions or a suitable identity provider.
- **Payments:** A supported Nigerian payment gateway with verified webhook handling.
- **Messaging:** SMS provider with delivery receipts and a fallback notification channel.
- **Maps and routing:** Authorized NIPOST digital-postcode services plus an appropriate map and routing provider.
- **Deployment:** Managed application hosting, managed PostgreSQL, managed cache/queue, and object storage.
- **Monitoring:** Centralized structured logs, error tracking, metrics, traces, and uptime monitoring.

Provider selection must be based on availability, commercial terms, security, support, and regional operating requirements.

## 11.2 Backend modules

1. Identity and access management.
2. Organizations and partner management.
3. Verification and compliance.
4. Address and geospatial services.
5. Hub discovery and capacity.
6. Booking and pricing.
7. Shipment and parcel management.
8. Custody ledger and state machine.
9. Courier dispatch and route management.
10. Collection authorization.
11. Payments and accounting.
12. Notifications.
13. Returns, incidents, and claims.
14. Enterprise integrations.
15. Reporting and analytics.
16. Administration and audit.
17. Configuration and feature management.

Each module must have documented ownership of its data and operations.

## 11.3 Asynchronous processing

Use background jobs for:

- SMS and email delivery.
- Webhook delivery.
- Expiring reservations.
- Collection reminders.
- Expired authorization cleanup.
- Document-expiry notifications.
- Payout processing.
- Financial reconciliation.
- Stalled-shipment alerts.
- Scheduled reporting.
- Data retention and archival.

Use transactional outbox patterns or an equivalent reliable publication mechanism to prevent database updates from succeeding while their required downstream events are silently lost.

---

# 12. API Design

Expose a versioned REST API under `/api/v1`.

Representative endpoints:

### Identity
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-phone`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`

### Address and hubs
- `GET /api/v1/locations/search`
- `GET /api/v1/locations/postcode/{postcode}`
- `GET /api/v1/hubs/nearby`
- `GET /api/v1/hubs/{hubId}`
- `GET /api/v1/hubs/{hubId}/availability`

### Bookings and shipments
- `POST /api/v1/price-quotes`
- `POST /api/v1/shipments`
- `GET /api/v1/shipments/{shipmentId}`
- `GET /api/v1/shipments/{shipmentId}/tracking`
- `POST /api/v1/shipments/{shipmentId}/cancel`
- `POST /api/v1/shipments/{shipmentId}/return`

### Hub operations
- `POST /api/v1/hub/intake`
- `GET /api/v1/hub/inventory`
- `POST /api/v1/hub/collection/verify`
- `POST /api/v1/hub/collection/complete`
- `GET /api/v1/hub/earnings`

### Courier operations
- `GET /api/v1/courier/jobs`
- `POST /api/v1/courier/jobs/{jobId}/claim`
- `POST /api/v1/courier/jobs/{jobId}/pickup`
- `POST /api/v1/courier/jobs/{jobId}/dropoff`
- `POST /api/v1/courier/jobs/{jobId}/exception`

### Finance and support
- `GET /api/v1/payments/{paymentId}`
- `GET /api/v1/partners/payouts`
- `POST /api/v1/claims`
- `GET /api/v1/support/tickets`

### Enterprise
- `POST /api/v1/enterprise/shipments/bulk`
- `GET /api/v1/enterprise/reports/reconciliation`
- `POST /api/v1/enterprise/webhooks`

These are logical API contracts, not authorization to implement every operation as a simple status update. Each endpoint must have request validation, authentication, authorization, transactional guarantees, error semantics, audit requirements, and documented response schemas.

## 12.1 API standards

- Use OpenAPI documentation.
- Version breaking changes explicitly.
- Validate all request bodies and parameters.
- Apply rate limits and payload-size limits.
- Use idempotency keys for sensitive mutations.
- Use consistent error codes.
- Propagate correlation IDs.
- Apply scoped API credentials.
- Sign outbound webhooks and provide replay protection.
- Never expose provider secrets or internal database errors.
- Keep sandbox and production credentials separate.

---

# 13. Security and Fraud Prevention

Security must be part of the architecture, not a later enhancement.

## 13.1 Authentication and authorization

- Use secure password hashing if passwords are supported.
- Prefer secure, appropriately protected sessions for browser clients.
- Apply least-privilege access and scoped organization membership.
- Enforce authorization on the backend for every protected resource.
- Require multifactor authentication for privileged accounts.
- Apply additional verification to high-risk changes.
- Revoke compromised sessions and credentials promptly.
- Protect against brute-force attacks, account enumeration, and session theft.

## 13.2 Collection OTP

Generate six-digit collection codes using a cryptographically secure random generator.

Controls:

- Store a secure verifier rather than the plaintext code.
- Bind each code to the intended parcel and collection purpose.
- Set a configurable expiry.
- Limit verification attempts.
- Apply per-parcel, per-account, per-device, and per-network throttling as appropriate.
- Prevent replay and simultaneous redemption.
- Invalidate prior codes when a replacement is issued.
- Record failed and successful attempts.
- Never place the OTP in public tracking URLs or general application logs.

Because six digits provide limited entropy, the OTP must not be treated as a standalone defense against unlimited guessing or insider abuse.

## 13.3 Fraud controls

Detect and investigate:

- Repeated failed OTP attempts.
- Duplicate parcel intake.
- Conflicting custody claims.
- Unusual hub release patterns.
- Fake partner documents.
- Rider account sharing.
- Suspicious address or recipient changes.
- Payment disputes.
- Repeated claims from the same account or partner.
- Unusual refund and payout behavior.
- Attempts to bypass capacity controls.
- Unauthorized access to sensitive verification records.

Risk scoring must trigger appropriate review rather than automatically treating every flagged customer as fraudulent.

## 13.4 Data protection

Implement controls aligned with the Nigeria Data Protection Act 2023, applicable regulations, and contractual obligations.

Requirements include:

- Data inventory and purpose mapping.
- Documented lawful bases for processing.
- Privacy notices.
- Data minimization.
- Data-subject rights workflows.
- Retention and deletion schedules.
- Vendor and processor assessments.
- Breach detection and response.
- Access reviews.
- Appropriate cross-border data-transfer safeguards.
- Privacy impact assessments where required.
- Secure document handling.
- Staff confidentiality and training.

The platform must not treat access to a postcode as proof of identity, property ownership, or occupancy.

## 13.5 Operational security

- Encrypt network traffic.
- Encrypt sensitive data at rest.
- Store secrets in a managed secrets service.
- Separate production and development environments.
- Require reviewed database migrations.
- Back up the database and test restoration.
- Log privileged actions.
- Run dependency and vulnerability scanning.
- Maintain incident-response procedures.
- Perform independent penetration testing before public launch.

---

# 14. Notifications

Supported channels:

- SMS.
- Email.
- In-app notifications.
- Browser push notifications where supported and authorized.
- Enterprise webhooks.

Notification events include:

- Booking confirmation.
- Pickup assignment.
- Courier pickup.
- Arrival at destination hub.
- Parcel ready for collection.
- Collection reminders.
- Expiring collection window.
- Return initiation.
- Delivery completion.
- Failed delivery.
- Payment confirmation.
- Refund or payout status.
- Claim updates.
- Partner credential expiry.

Notifications must be idempotent where possible, support delivery retries, record provider responses, and avoid exposing sensitive information in message previews.

SMS should be the primary collection-alert channel where appropriate, with alternative contact procedures for delivery failures.

---

# 15. Pricing, Billing, and Settlement

## 15.1 Pricing engine

Pricing must be configurable by:

- Service type.
- Origin and destination zone.
- Distance or route band.
- Parcel weight and dimensions.
- Handling requirements.
- Delivery speed.
- Partner contract.
- Additional service.
- Insurance or declared-value rules.
- Applicable taxes and surcharges.

Every quote must preserve the pricing version used to calculate it.

A confirmed booking must not be silently repriced when the rate card changes.

## 15.2 Partner commissions

Define separate commission rules for:

- Hub intake.
- Hub release.
- Origin-hub processing.
- Destination-hub processing.
- Courier pickup.
- Inter-hub transport.
- Door delivery.
- Special handling.

Only qualifying, verified service events may generate payable commission.

## 15.3 Financial ledger

Use double-entry accounting for money owed, received, held, paid, refunded, or adjusted.

Required controls:

- Payment reconciliation.
- Provider webhook signature verification.
- Duplicate payment prevention.
- Refund authorization.
- Payout approval rules.
- Partner statements.
- Fee and tax reporting.
- Failed-payout recovery.
- Suspense-account management.
- Financial period closing.
- Auditable adjustments.

A successful payment-provider redirect must not be treated as conclusive payment confirmation. Verify payment through a trusted server-side provider response or authenticated webhook.

---

# 16. Physical Security and Service Operations

Dropboxz's digital security must be supported by physical operating standards.

## 16.1 Minimum hub requirements

Subject to the hub's service tier:

- Defined parcel storage area.
- Restricted access to stored parcels.
- Clear separation of customer areas and storage areas.
- Adequate lighting and reasonable physical security.
- Secure storage for higher-risk or valuable items.
- Staff training.
- Documented opening and closing procedures.
- Parcel intake and release logs.
- Incident escalation contacts.
- Business continuity and closure procedures.

## 16.2 Storage policy

The system must enforce:

- Maximum holding duration.
- Customer reminders.
- Overdue collection escalation.
- Storage fees where contractually permitted.
- Safe custody during a hub's suspension or closure.
- Approved transfer to another hub.
- Return-to-sender procedures.
- Unclaimed-parcel handling under applicable law and contract.

Do not automatically dispose of unclaimed parcels without a lawful, documented procedure.

## 16.3 Prohibited and restricted items

Maintain a configurable item policy, including prohibited dangerous goods, illegal items, restricted pharmaceuticals, hazardous materials, and other items that the relevant service cannot lawfully accept.

Require appropriate declarations and screening.

Define the escalation process for suspicious or potentially unlawful contents without encouraging unlawful opening of sealed parcels.

## 16.4 Loss and damage

Define:

- Liability allocation.
- Declared-value limits.
- Evidence requirements.
- Investigation timelines.
- Insurance arrangements.
- Claims escalation.
- Compensation approval.
- Recovery from responsible partners where contractually and legally justified.

---

# 17. Reliability, Performance, and Observability

## 17.1 Availability

Define production service-level objectives and measure them continuously.

Initial engineering targets, subject to validation against cost and business requirements:

- Public API availability: at least 99.9% monthly.
- Booking API p95 latency: under 500 ms for ordinary internal operations, excluding external provider latency.
- Nearby-hub search p95 latency: under 700 ms under agreed load.
- Critical custody and collection operations: strongly consistent transactional behavior.
- Payment and notification processing: durable retries with reconciliation.
- Recovery point objective: 15 minutes or better for the production database.
- Recovery time objective: 4 hours or better for major service restoration.

These are proposed targets, not guaranteed results. Validate them through load testing and operational exercises.

## 17.2 Monitoring

Measure:

- API errors and latency.
- Database utilization.
- Queue depth and failed jobs.
- OTP delivery and verification failures.
- Payment success and reconciliation differences.
- Hub capacity errors.
- Dispatch delays.
- Stalled parcels.
- Duplicate event attempts.
- Notification delivery.
- Storage utilization.
- Security alerts.
- Backup completion and restore readiness.

Use alerts with defined owners and escalation procedures.

## 17.3 Backups and disaster recovery

- Automated encrypted backups.
- Point-in-time database recovery where supported.
- Defined backup retention.
- Periodic restoration tests.
- Documented recovery procedures.
- Recovery drills.
- Separate access controls for backup administration.

---

# 18. Mobile, Offline, and Accessibility Requirements

The customer, hub, and rider interfaces must be optimized for low-cost Android phones.

Requirements:

- Responsive layouts.
- Installable PWA support.
- Efficient JavaScript bundles.
- Lazy-loaded images.
- Low-bandwidth-friendly interfaces.
- Clear loading and error states.
- Accessible form labels and keyboard navigation.
- Appropriate contrast and touch targets.
- Barcode and QR scanning with manual fallback.
- Offline access to permitted cached information.
- Reliable synchronization of queued operational events.
- Clear indication when an action has not reached the server.

Do not store collection OTPs, sensitive identity records, or unrestricted shipment data in offline caches.

Offline mode must not claim that a custody transfer or parcel collection is complete until the backend has confirmed it.

---

# 19. Testing and Quality Assurance

The full platform requires:

## 19.1 Unit tests

Test pricing, state transitions, permissions, OTP verification, capacity calculations, commissions, and financial calculations.

## 19.2 Integration tests

Test database transactions, queue processing, SMS delivery, payment webhooks, postcode-provider integration, and enterprise APIs.

## 19.3 End-to-end tests

Test complete journeys:

- Customer booking to hub collection.
- Sender handoff to courier pickup.
- Inter-hub transfer.
- Door delivery.
- Cancellation and refund.
- Return-to-sender.
- Hub suspension with parcels still in storage.
- Courier reassignment.
- Claim investigation.
- Partner payout and reconciliation.

## 19.4 Concurrency tests

Verify that:

- Two riders cannot claim the same exclusive job.
- Two reservations cannot exceed hub capacity.
- An OTP cannot be redeemed twice.
- Duplicate payment webhooks cannot create duplicate credits.
- Concurrent status changes cannot create conflicting custodians.
- Retried API requests do not create duplicate shipments.

## 19.5 Security tests

Include access-control testing, tenant-isolation testing, injection testing, session management, API abuse, sensitive-data exposure, dependency scanning, and penetration testing.

## 19.6 Operational acceptance

Before release, confirm:

- Successful backup restoration.
- Successful reconciliation.
- Correct notification retries.
- Correct incident escalation.
- Correct suspension and recovery.
- Complete audit records.
- No unresolved critical or high-severity security defects.

---

# 20. Development and Deployment Standards

Maintain separate environments:

1. Local development.
2. Automated testing.
3. Staging.
4. Production.

Production requirements:

- Managed PostgreSQL with PostGIS.
- Separate background workers.
- Private object storage.
- Managed secrets.
- HTTPS.
- Automated deployment pipelines.
- Version-controlled migrations.
- Automated tests on pull requests.
- Health checks and rollback procedures.
- Database backup monitoring.
- Error tracking and operational dashboards.

No production secrets should be committed to GitHub.

Use environment variables or managed secret references for credentials. The repository must include a sanitized `.env.example`, documented setup instructions, database migrations, test fixtures, and deployment configuration.

The complete application must be deployable from a clean environment using documented commands.

---

# 21. Implementation Phases for the Complete Product

These phases describe the order of engineering delivery, not a reduced final product.

## Phase 1 — Platform foundation

- Requirements validation.
- Regulatory operating-model review.
- Repository and environment setup.
- Database migrations.
- Authentication and permissions.
- Organization and partner models.
- API contracts.
- Logging and audit infrastructure.

## Phase 2 — Addressing and hub network

- Postcode integration.
- Address resolution.
- Hub onboarding.
- Verification workflows.
- Geospatial search.
- Capacity reservations.
- Hub portal and inventory.

## Phase 3 — Shipment and custody engine

- Booking.
- Pricing.
- Shipment lifecycle.
- Parcel labels.
- Custody ledger.
- QR and barcode scanning.
- Collection authorization.
- Tracking timeline.

## Phase 4 — Courier operations

- Rider onboarding.
- Job assignment.
- Route manifests.
- Pickup and drop-off.
- Proof of delivery.
- Exceptions and reassignment.
- Offline event synchronization.

## Phase 5 — Commercial and financial platform

- Payment gateway.
- Double-entry ledger.
- Commissions.
- Partner settlements.
- Refunds.
- Invoices.
- Reconciliation.
- Enterprise pricing.

## Phase 6 — Customer service and risk

- Notification orchestration.
- Returns.
- Claims and disputes.
- Fraud monitoring.
- Document expiry.
- Operational alerts.
- Support workspace.

## Phase 7 — Enterprise and administration

- Enterprise portal.
- Bulk shipping.
- API credentials.
- Webhooks.
- Network analytics.
- Advanced permissions.
- Compliance reports.
- Partner management.

## Phase 8 — Production hardening

- Load testing.
- Security assessment.
- Disaster recovery.
- Accessibility testing.
- Operational training.
- Physical hub audits.
- Production acceptance.
- Controlled network expansion.

---

# 22. Acceptance Criteria for the Complete Build

The product is ready for production acceptance only when all of the following are demonstrated:

1. Customers can book every supported service type.
2. Hub discovery returns eligible, operational locations based on real location data.
3. Reservations cannot exceed configured capacity.
4. Every parcel has an authoritative status and current custodian.
5. Every physical handoff produces a traceable custody event.
6. Collection OTPs expire, resist brute-force attempts, and cannot be redeemed twice.
7. Riders cannot claim unauthorized or already-assigned jobs.
8. Hub operators cannot release parcels through unauthorized status edits.
9. Customers receive accurate tracking and collection notifications.
10. Payment processing and partner settlement are reconcilable.
11. Duplicate requests and webhooks do not create duplicate financial effects.
12. Returns, cancellations, claims, and refunds follow defined policies.
13. Administrators can investigate incidents using complete audit records.
14. Enterprise customers are isolated from other organizations' data.
15. Compliance and accreditation records can expire, be suspended, and be renewed.
16. Sensitive identity records are appropriately protected.
17. The application operates reliably on supported mobile browsers and Android devices.
18. Offline operations reconcile without silently losing or duplicating custody events.
19. Backups can be restored and disaster-recovery procedures have been tested.
20. Monitoring, alerting, support escalation, and production documentation are operational.
21. Regulatory requirements have been reviewed for the actual operating model.
22. The complete system passes agreed security, concurrency, integration, and end-to-end tests.

---

# 23. Required Project Deliverables

The development team must deliver:

- Product requirements document.
- System architecture document.
- Database ERD and migrations.
- API specification.
- Frontend applications and source code.
- Backend modules and source code.
- Authentication and authorization implementation.
- Automated test suites.
- Payment and notification integrations.
- Postcode and mapping integration.
- Environment configuration templates.
- Deployment pipelines.
- Monitoring and alert configuration.
- Security and privacy documentation.
- Partner onboarding and operating procedures.
- Customer support and claims procedures.
- Financial reconciliation documentation.
- Disaster-recovery procedures.
- Production runbooks.
- Administrator and partner user manuals.
- Final acceptance-test report.

**Definition of complete:** The platform is not complete merely because the interfaces load or the database exists. Every operational journey must work end to end, every critical transaction must be protected, and every external dependency must have documented failure handling.

