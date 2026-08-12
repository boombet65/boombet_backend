// src/controllers/bet/bet.controller.js 
const betService = require('../../services/bet/betting.service');

const placeBet = async (req, res, next) => {
  try {
    const userId = req.user.id; // Kutoka kwenye JWT Auth Middleware
    const { stake, selections, placed_via, booking_code_used } = req.body;

    const bet = await betService.placeBet(userId, {
      stake,
      selections,
      placed_via,
      booking_code_used
    });

    return res.status(201).json({
      success: true,
      message: 'Mkeka umewekwa kikamilifu.',
      data: bet
    });
  } catch (err) {
    next(err);
  }
};

const getUserBets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const bets = await betService.getUserBets(userId);

    return res.status(200).json({
      success: true,
      data: bets
    });
  } catch (err) {
    next(err);
  }
};

const getBetByTicketCode = async (req, res, next) => {
  try {
    const { ticketCode } = req.params;
    const bet = await betService.getBetByTicketCode(ticketCode);

    return res.status(200).json({
      success: true,
      data: bet
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  placeBet,
  getUserBets,
  getBetByTicketCode
};