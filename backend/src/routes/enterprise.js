const express = require('express');
const router = express.Router();
const { authenticate, requireRoles } = require('../middleware/auth');

// Enterprise endpoints are restricted to shipping organizations and admins.
router.use(authenticate, requireRoles('enterprise_shipper', 'logistics_partner', 'ops_admin'));

router.use(require('./enterprise/account'));
router.use(require('./enterprise/webhooks'));
router.use(require('./enterprise/shipping'));
router.use(require('./enterprise/addresses'));
router.use(require('./enterprise/billing'));
router.use(require('./enterprise/claims'));
router.use(require('./enterprise/settings'));

module.exports = router;
