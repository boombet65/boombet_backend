// services/bet/betSettlement.service.js
const { sequelize } = require('../../../models');
const userRepository = require('../../../repositories/user/user.repository');
const betRepository = require('../../../repositories/bet/bet.repository');

// Logic ya kuangalia kama soko/outcome husika imepita au imefeli
const evaluateSelection = (selection, match) => {
  const { market_key, outcome_key } = selection;
  const script = match.predetermined_script;
  const ft = script.final_ft; // { homeScore, awayScore }
  
  const home = ft.homeScore;
  const away = ft.awayScore;
  const totalGoals = home + away;

  switch (market_key) {
    case '1X2':
      if (outcome_key === '1') return home > away;
      if (outcome_key === '2') return away > home;
      if (outcome_key === 'X') return home === away;
      break;

    case 'Double_Chance':
      if (outcome_key === '1X') return home >= away;
      if (outcome_key === 'X2') return away >= home;
      if (outcome_key === '12') return home !== away;
      break;

    case 'BTTS':
      const bothScored = home > 0 && away > 0;
      return outcome_key === 'Yes' ? bothScored : !bothScored;

    case 'Correct_Score':
      const exactScore = `${home}-${away}`;
      return outcome_key === exactScore;

    case 'Over_Under':
      const [type, thresholdStr] = outcome_key.split('_'); 
      const threshold = parseFloat(thresholdStr);
      return type === 'OVER' ? totalGoals > threshold : totalGoals < threshold;

    default:
      return false;
  }
  return false;
};

/**
 * Helper function to check if a bet has any pending matches
 * Returns true if all matches are finished, false if any is still pending/live
 */
const checkAllMatchesFinished = async (bet) => {
  for (const sel of bet.Selections) {
    const match = sel.Match;
    // If match is not FINISHED, bet is still OPEN
    if (match.status !== 'FINISHED') {
      return false;
    }
  }
  return true;
};

/**
 * Check if all selections in a bet are WON
 */
const checkAllSelectionsWon = (bet) => {
  for (const sel of bet.Selections) {
    if (sel.status !== 'WON') {
      return false;
    }
  }
  return true;
};

/**
 * Check if any selection in a bet is LOST
 */
const checkAnySelectionLost = (bet) => {
  for (const sel of bet.Selections) {
    if (sel.status === 'LOST') {
      return true;
    }
  }
  return false;
};

// Function kuu ya Ku-settle Mikeka yote yenye Mechi iliyomalizika
const settlePendingBets = async (finishedMatchId) => {
  // 1. Tafuta mikeka yote PENDING yenye hii mechi
  const pendingBets = await betRepository.findPendingBetsByMatchId(finishedMatchId);

  for (const bet of pendingBets) {
    const transaction = await sequelize.transaction();
    try {
      // First, evaluate all selections for this match
      for (const sel of bet.Selections) {
        if (sel.status === 'PENDING') {
          const match = sel.Match;
          
          // Only evaluate if match is FINISHED
          if (match.status === 'FINISHED') {
            const isWon = evaluateSelection(sel, match);
            sel.status = isWon ? 'WON' : 'LOST';
            await sel.save({ transaction });
          }
        }
      }

      // Check if all matches in this bet are finished
      const allMatchesFinished = await checkAllMatchesFinished(bet);
      
      if (allMatchesFinished) {
        // All matches are finished, now determine final result
        const hasLostSelection = checkAnySelectionLost(bet);
        const allSelectionsWon = checkAllSelectionsWon(bet);
        
        // Update Bet Status and Result
        bet.status = 'SETTLED'; // Mark as settled
        
        if (hasLostSelection) {
          bet.result = 'LOST';
          // No payout needed
        } else if (allSelectionsWon) {
          bet.result = 'WON';
          // Lipa hela ya ushindi kwenye Wallet ya User!
          const payoutAmount = parseFloat(bet.payout);
          await userRepository.deposit(bet.user_id, payoutAmount, transaction);
        } else {
          // This shouldn't happen if all matches are finished
          bet.result = 'LOST';
        }
        
        await bet.save({ transaction });
      }
      // If not all matches are finished, bet remains PENDING with result = 'OPEN'

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error(`Error settling bet ID ${bet.id}:`, error);
    }
  }
};

/**
 * Force settle a specific bet (for manual intervention or testing)
 */
const settleSpecificBet = async (betId) => {
  const bet = await betRepository.findBetById(betId);
  if (!bet) {
    throw new Error('Bet not found');
  }

  const transaction = await sequelize.transaction();
  try {
    // Evaluate all selections
    for (const sel of bet.Selections) {
      if (sel.status === 'PENDING') {
        const match = sel.Match;
        if (match.status === 'FINISHED') {
          const isWon = evaluateSelection(sel, match);
          sel.status = isWon ? 'WON' : 'LOST';
          await sel.save({ transaction });
        }
      }
    }

    // Determine bet result
    const allMatchesFinished = await checkAllMatchesFinished(bet);
    if (allMatchesFinished) {
      const hasLostSelection = checkAnySelectionLost(bet);
      const allSelectionsWon = checkAllSelectionsWon(bet);
      
      bet.status = 'SETTLED';
      
      if (hasLostSelection) {
        bet.result = 'LOST';
      } else if (allSelectionsWon) {
        bet.result = 'WON';
        const payoutAmount = parseFloat(bet.payout);
        await userRepository.deposit(bet.user_id, payoutAmount, transaction);
      } else {
        bet.result = 'LOST';
      }
      
      await bet.save({ transaction });
    }

    await transaction.commit();
    return bet;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = { 
  settlePendingBets,
  settleSpecificBet,
  evaluateSelection,
  checkAllMatchesFinished,
  checkAllSelectionsWon,
  checkAnySelectionLost
};