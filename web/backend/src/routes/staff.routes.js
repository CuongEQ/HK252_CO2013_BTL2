const express = require('express');
const staffController = require('../controllers/staff.controller');

const router = express.Router();

router.get('/hub-orders', staffController.getHubOrders);
router.get('/hub-capacity', staffController.getHubCapacity);
router.post('/checkin', staffController.orderCheckin);
router.post('/checkin-shipment', staffController.orderCheckinShipment);
router.post('/checkout', staffController.orderCheckout);
router.post('/pickup-coordinate', staffController.pickupCoordinate);
router.post('/delivery-coordinate', staffController.deliveryCoordinate);
router.get('/hub-revenue-statistics', staffController.getHubRevenueStatistics);
router.get('/monthly-bonus', staffController.getMonthlyBonus);

// Staff management
router.get('/hub-staff', staffController.getStaffByHub);
router.post('/add-staff', staffController.addStaff);
router.post('/add-driver', staffController.addDriver);
router.patch('/role', staffController.updateStaffRole);
router.delete('/:userId', staffController.removeStaff);
router.patch('/hub-capacity', staffController.updateHubCapacity);

module.exports = router;
