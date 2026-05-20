const express = require('express');
const router = express.Router();
const { requestOtp, verifyOtp, logout } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/logout', authMiddleware, logout);

module.exports = router;
