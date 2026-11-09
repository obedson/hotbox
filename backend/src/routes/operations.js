const express = require('express');
const router = express.Router();
const { authenticate, requireRoles } = require('../middleware/auth');
const { handlePostcodeOccupants } = require('./operations/helpers');

// Customer-facing occupancy lookup used by the customer dashboard.
// Any authenticated user may search; all other operations routes are admin-only.
router.get('/postcode-occupants', authenticate, handlePostcodeOccupants);

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
router.use(require('./operations/settings'));

module.exports = router;
