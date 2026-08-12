// services/match/matchEngine.service.js
const { Match } = require('../../../models');
const { settlePendingBets } = require('./betSettlement.service');
const { Op } = require('sequelize');

const processLiveMatches = async () => {
  const now = new Date();
  
  console.log('[ENGINE] 🔄 Running match engine check...');
  
  // A. ANZA MECHI (UPCOMING -> LIVE)
  const upcomingMatches = await Match.findAll({
    where: {
      status: 'UPCOMING'
    }
  });

  console.log(`[ENGINE] 📋 Found ${upcomingMatches.length} upcoming matches`);

  for (const match of upcomingMatches) {
    const matchDateTime = new Date(`${match.date} ${match.time}`);
    if (now >= matchDateTime) {
      match.status = 'LIVE';
      match.current_score = { home: 0, away: 0 };
      await match.save();
      console.log(`[ENGINE] ✅ Mechi ${match.home_team} vs ${match.away_team} imeanza (LIVE)!`);
    }
  }

  // B. SHUGHULIKIA MECHI ZINAZOCHEEZWA (LIVE -> FINISHED)
  const liveMatches = await Match.findAll({ 
    where: { status: 'LIVE' } 
  });

  console.log(`[ENGINE] 📋 Found ${liveMatches.length} live matches`);

  for (const match of liveMatches) {
    const matchStart = new Date(`${match.date} ${match.time}`);
    const elapsedMinutes = Math.floor((now - matchStart) / (1000 * 60));
    
    // ============ FIX: Safe access to extra_time_mins ============
    const extraTime = match.predetermined_script?.extra_time_mins?.ft || 0;
    const totalMatchDuration = 90 + extraTime;

    console.log(`[ENGINE] ⏱️ ${match.home_team} vs ${match.away_team} - ${elapsedMinutes}m / ${totalMatchDuration}m`);

    if (elapsedMinutes >= totalMatchDuration) {
      // MECHI IMEMALIZIKA!
      const finalScore = match.predetermined_script?.final_ft || { homeScore: 0, awayScore: 0 };
      
      match.status = 'FINISHED';
      match.current_score = {
        home: finalScore.homeScore,
        away: finalScore.awayScore
      };
      await match.save();

      console.log(`[ENGINE] 🏁 Mechi ${match.home_team} vs ${match.away_team} IMEMALIZIKA! (${finalScore.homeScore}-${finalScore.awayScore})`);
      
      // ============ FIX: Call settlement with try-catch ============
      try {
        console.log(`[ENGINE] 🚀 Settling bets for match ${match.id}...`);
        await settlePendingBets(match.id);
        console.log(`[ENGINE] ✅ Settlement completed for match ${match.id}`);
      } catch (error) {
        console.error(`[ENGINE] ❌ Error settling match ${match.id}:`, error.message);
      }
    } else {
      // MECHI INAENDELEA: UPDATE CURRENT SCORE KULINGANA NA TIMELINE!
      const timeline = match.predetermined_script?.events_timeline || [];
      
      // Tafuta tukio la mwisho lililotokea ndani ya dakika hii
      const pastEvents = timeline.filter(e => {
        const minute = parseFloat(e.minute);
        return minute <= elapsedMinutes;
      });
      
      if (pastEvents.length > 0) {
        const latestEvent = pastEvents[pastEvents.length - 1];
        if (latestEvent.current_score) {
          match.current_score = latestEvent.current_score;
          await match.save();
          console.log(`[ENGINE] 📊 Score updated: ${match.home_team} ${latestEvent.current_score.home}-${latestEvent.current_score.away} ${match.away_team}`);
        }
      }
    }
  }

  // ============ C. CHECK FINISHED MATCHES WITH PENDING BETS ============
  try {
    console.log('[ENGINE] 🔍 Checking for finished matches with pending bets...');
    
    const finishedMatches = await Match.findAll({
      where: { status: 'FINISHED' },
      include: [{
        model: require('../../../models').BetSelection,
        as: 'selections',
        where: { status: 'PENDING' },
        required: true
      }]
    });

    if (finishedMatches.length > 0) {
      console.log(`[ENGINE] 📋 Found ${finishedMatches.length} finished matches with pending bets`);
      
      for (const match of finishedMatches) {
        console.log(`[ENGINE] 🚀 Re-settling match ${match.id} (${match.home_team} vs ${match.away_team})...`);
        try {
          await settlePendingBets(match.id);
          console.log(`[ENGINE] ✅ Re-settlement completed for match ${match.id}`);
        } catch (error) {
          console.error(`[ENGINE] ❌ Error re-settling match ${match.id}:`, error.message);
        }
      }
    } else {
      console.log('[ENGINE] ✅ No finished matches with pending bets');
    }
  } catch (error) {
    console.error('[ENGINE] ❌ Error checking finished matches:', error.message);
  }

  console.log('[ENGINE] ✅ Match engine check completed');
};

module.exports = { processLiveMatches };