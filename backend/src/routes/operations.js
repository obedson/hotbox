const express = require('express');
const router = express.Router();
const { authenticate, requireRoles } = require('../middleware/auth');
const { handlePostcodeOccupants } = require('./operations/helpers');

// Postcode occupancy directory. Restricted to operations staff because it
// exposes resident names and phone numbers.
router.get('/postcode-occupants', authenticate, requireRoles('ops_admin', 'compliance_officer', 'super_admin'), handlePostcodeOccupants);

// Legacy P.O. Box linking carries its own role gate so NIPOST verifiers can
// reach the queue without gaining access to the rest of operations.
router.use(require('./operations/legacyBoxLinks'));

// Every other endpoint in this router is restricted to operations staff.
router.use(authenticate, requireRoles('ops_admin', 'super_admin'));

router.use(require('./operations/stats'));
router.use(require('./operations/riders'));
router.use(require('./operations/hubs'));
router.use(require('./operations/postcodes'));
router.use(require('./operations/exceptions'));
router.use(require('./operations/exceptionResolution'));
router.use(require('./operations/reports'));
router.use(require('./operations/audit'));
router.use(require('./operations/users'));
router.use(require('./operations/settings'));

module.exports = router;
