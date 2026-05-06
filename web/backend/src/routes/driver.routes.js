const express = require('express');
const driverController = require('../controllers/driver.controller');

const router = express.Router();

router.get('/assigned-orders', driverController.getAssignedOrders);
router.get('/active-shipment', driverController.getActiveShipment);
router.post('/pickup/create', driverController.createPickupOrder);
router.post('/pickup/complete', driverController.pickupComplete);
router.post('/pickup/failed', driverController.pickupFailed);
router.post('/delivery/create', driverController.createDeliveryOrder);
router.post('/delivery/complete', driverController.deliveryComplete);
router.post('/delivery/failed', driverController.deliveryFailed);

module.exports = router;
