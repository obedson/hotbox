// Shared rider clearance rules. A rider is only granted dispatch access once
// operations has evidenced identity (NIN), driving privilege (licence), a
// service postcode and a contact phone number, and any registration fee set by
// the super administrator has been paid.
//
// "Evidenced" means an approved Track B document, not merely a value typed into
// the rider profile: a typed NIN with no NIN slip uploaded is not evidence.
// Keeping the rule in one module means the rider console, the operations ledger
// and the compliance review queue can never drift apart.
const PLACEHOLDER_LICENCE = 'DL-PENDING';

const REQUIRED_EVIDENCE = [
  {
    valueKey: 'nin',
    missingLabel: 'NIN',
    documentType: 'NIN',
    evidenceLabel: 'approved NIN document',
    placeholder: null
  },
  {
    valueKey: 'drivers_license_no',
    missingLabel: "driver's licence number",
    documentType: 'DRIVERS_LICENSE',
    evidenceLabel: "approved driver's licence document",
    placeholder: PLACEHOLDER_LICENCE
  }
];

function hasApprovedDocument(documents, documentType) {
  return documents.some(
    (doc) => doc.document_type === documentType && doc.status === 'APPROVED'
  );
}

function missingRiderClearance({
  rider = null,
  postcode = null,
  phone = null,
  registrationFeeNgn = 0,
  registrationFeePaid = false,
  documents = []
} = {}) {
  const missing = [];

  for (const requirement of REQUIRED_EVIDENCE) {
    const value = rider ? rider[requirement.valueKey] : null;
    const hasValue = Boolean(value) && value !== requirement.placeholder;

    if (!hasValue) {
      missing.push(requirement.missingLabel);
    } else if (!hasApprovedDocument(documents, requirement.documentType)) {
      missing.push(requirement.evidenceLabel);
    }
  }

  if (!postcode) {
    missing.push('home postcode');
  }
  if (!phone) {
    missing.push('phone number');
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
