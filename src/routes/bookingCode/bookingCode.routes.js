// routes/bookingCode/bookingCode.routes.js 

const express = require('express');
const router = express.Router();
const bookingCodeController = require('../../controllers/bookingCode/bookingCode.controller');

// 1. Kutengeneza Booking Code Mpya
router.post('/create',  bookingCodeController.createBookingCode);

// 2. Kuangalia/Kufungua Taarifa za Booking Code kupitia kodi yake (Mfano: BC-8X92A)
router.get('/:code', bookingCodeController.getBookingCodeDetails);

module.exports = router;