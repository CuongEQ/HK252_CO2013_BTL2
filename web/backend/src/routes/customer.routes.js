const express = require('express');
const customerController = require('../controllers/customer.controller');

const router = express.Router();

router.get('/orders', customerController.getOrders);
router.get('/orders/:id', customerController.getOrderDetails);
router.get('/payments', customerController.getPayments);
router.post('/refresh-tier', customerController.refreshCustomerTier);
router.post('/orders', customerController.createOrder);
router.put('/orders/:id', customerController.updateOrder);
router.delete('/orders/:id', customerController.deleteOrder);
router.get('/vouchers', customerController.getAvailableVouchers);
router.get('/finance-dashboard', customerController.getFinanceDashboard);
router.get('/profile-context', customerController.getProfileContext);
router.get('/hubs', customerController.getHubs);
router.get('/l1-addresses', customerController.getL1Addresses);
router.get('/l2-addresses', customerController.getL2Addresses);

module.exports = router;
