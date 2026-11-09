const express = require('express');
const router = express.Router();

router.use(require('./customer/profile'));
router.use(require('./customer/addresses'));
router.use(require('./customer/shipments'));
router.use(require('./customer/claims'));
router.use(require('./customer/tickets'));
router.use(require('./customer/wallet'));

module.exports = router;
