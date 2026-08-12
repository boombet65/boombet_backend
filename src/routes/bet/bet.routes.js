// src/routes/bet/bet.routes.js 
const express = require('express');
const router = express.Router();
const betController = require('../../controllers/bet/bet.controller'); 

// 1. Import authenticate middleware kutoka kwenye auth file yako
const { authenticate } = require('../../middleware/auth.middleware'); // Rekebisha path kama ni tofauti

// 2. Tumia authenticate middleware kulinda njia husika
router.post('/place', authenticate, betController.placeBet);

router.get('/my-bets', authenticate, betController.getUserBets);

// Njia ya kutafuta ticket inaweza kubaki public au kuwekewa authenticate ukitaka
router.get('/ticket/:ticketCode', betController.getBetByTicketCode);

module.exports = router;