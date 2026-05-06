const express = require('express');
const accountController = require('../controllers/account.controller');

const router = express.Router();

router.put('/profile', accountController.updateProfile);
router.post('/change-password', accountController.changePassword);
router.post('/topup', accountController.topUpBalance);
router.post('/withdraw', accountController.withdrawBalance);

module.exports = router;
