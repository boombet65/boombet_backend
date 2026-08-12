// src/repositories/bet/bet.repository.js 

const { Bet, BetSelection, Match } = require('../../models');

// Constant ya attributes tunazozitaka pekee kutoka kwenye Match
const MATCH_PUBLIC_ATTRIBUTES = [
  'id',
  'match_code',
  'home_team',
  'away_team',
  'league',
  'date',
  'time',
  'status',
  'current_score',
  'predetermined_script'
];

const findBetById = async (id, transaction = null) => {
  return await Bet.findByPk(id, {
    include: [
      {
        model: BetSelection,
        as: 'selections',
        include: [
          {
            model: Match,
            as: 'match',
            attributes: MATCH_PUBLIC_ATTRIBUTES
          }
        ]
      }
    ],
    transaction
  });
};

const createBet = async (betData, selectionsData, transaction = null) => {
  const bet = await Bet.create(betData, { transaction });

  const selectionsWithBetId = selectionsData.map(item => ({
    ...item,
    bet_id: bet.id
  }));

  await BetSelection.bulkCreate(selectionsWithBetId, { transaction });

  return await findBetById(bet.id, transaction);
};

const findBetByTicketCode = async (ticketCode) => {
  return await Bet.findOne({
    where: { ticket_code: ticketCode },
    include: [
      {
        model: BetSelection,
        as: 'selections',
        include: [
          {
            model: Match,
            as: 'match',
            attributes: MATCH_PUBLIC_ATTRIBUTES
          }
        ]
      }
    ]
  });
};

const findBetsByUserId = async (userId, options = {}) => {
  return await Bet.findAll({
    where: { user_id: userId },
    include: [
      {
        model: BetSelection,
        as: 'selections',
        include: [
          {
            model: Match,
            as: 'match',
            attributes: MATCH_PUBLIC_ATTRIBUTES
          }
        ]
      }
    ],
    order: [['createdAt', 'DESC']],
    ...options
  });
};

const updateBetStatus = async (betId, status, transaction = null) => {
  const [updatedRows] = await Bet.update(
    { status },
    { where: { id: betId }, transaction }
  );
  return updatedRows > 0;
};

const updateBetSelectionStatus = async (selectionId, status, transaction = null) => {
  const [updatedRows] = await BetSelection.update(
    { status },
    { where: { id: selectionId }, transaction }
  );
  return updatedRows > 0;
};

module.exports = {
  createBet,
  findBetById,
  findBetByTicketCode,
  findBetsByUserId,
  updateBetStatus,
  updateBetSelectionStatus
};