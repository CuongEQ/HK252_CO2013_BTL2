const express = require('express');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/activate-dummy', authController.activateDummy);
router.post('/check-phone', authController.checkPhone);
router.get('/me', authController.getMe);

module.exports = router;
