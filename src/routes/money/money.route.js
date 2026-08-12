// routes/moneyController.routes.js 

const express = require('express');
const router = express.Router();
const moneyController = require('../../controllers/money/money.controller');

// Public
router.post('/deposite', moneyController.deposite);
router.post('/withdraw', moneyController.withdraw);




module.exports = router;