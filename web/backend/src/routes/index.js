const express = require('express');

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const customerRoutes = require('./customer.routes');
const driverRoutes = require('./driver.routes');
const staffRoutes = require('./staff.routes');
const accountRoutes = require('./account.routes');
const lifecycleRoutes = require('./lifecycle.routes');

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ success: true, message: 'API is healthy' });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/customer', customerRoutes);
router.use('/driver', driverRoutes);
router.use('/staff', staffRoutes);
router.use('/account', accountRoutes);
router.use('/', lifecycleRoutes);

module.exports = router;
