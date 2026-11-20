// Shared rider clearance rules. A rider is only granted dispatch access once
// operations has evidenced identity (NIN), driving privilege (licence) and a
// service postcode, and any registration fee set by the super administrator has
// been paid. Keeping the rule in one module means the rider console, the
// operations ledger and the compliance review queue can never drift apart.
const PLACEHOLDER_LICENCE = 'DL-PENDING';

function missingRiderClearance({
  rider = null,
  postcode = null,
  registrationFeeNgn = 0,
  registrationFeePaid = false
} = {}) {
  const missing = [];

  if (!rider || !rider.nin) {
    missing.push('NIN');
  }
  if (!rider || !rider.drivers_license_no || rider.drivers_license_no === PLACEHOLDER_LICENCE) {
    missing.push("driver's licence number");
  }
  if (!postcode) {
    missing.push('home postcode');
  }
  if (Number(registrationFeeNgn) > 0 && !registrationFeePaid) {
    missing.push('registration fee payment');
  }

  return missing;
}

module.exports = {
  PLACEHOLDER_LICENCE,
  missingRiderClearance
};
