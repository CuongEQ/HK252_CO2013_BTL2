const express = require('express');
const lifecycleController = require('../controllers/lifecycle.controller');

const router = express.Router();

router.get('/orders/:id/lifecycle', lifecycleController.getOrderLifecycle);

module.exports = router;
