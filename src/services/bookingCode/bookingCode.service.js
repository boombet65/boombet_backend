// service/bookingCode/bookingCode.service.js 

const bookingCodeRepository = require('../../repositories/bookingCode/bookingCode.repository');
const matchRepository = require('../../repositories/match/match.repository');

const generateShortCode = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const parseMatchDateTime = (dateStr, timeStr) => {
  try {
    if (!timeStr) return new Date(dateStr);

    const timeParts = timeStr.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
    
    if (!timeParts) {
      return new Date(dateStr);
    }

    let hours = parseInt(timeParts[1], 10);
    const minutes = parseInt(timeParts[2], 10);
    const modifier = timeParts[3];

    if (modifier === 'pm' && hours < 12) hours += 12;
    if (modifier === 'am' && hours === 12) hours = 0;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');

    const isoString = `${dateStr}T${formattedHours}:${formattedMinutes}:00`;
    const parsedDate = new Date(isoString);

    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  } catch (err) {
    return new Date();
  }
};

// Inapokea object moja tu yenye { selections }
const createBookingCode = async ({ selections }) => {
  if (!selections || !Array.isArray(selections) || selections.length === 0) {
    throw new Error('Chagua angalau mechi moja ili kutengeneza booking code.');
  }

  let calculatedTotalOdds = 1.0;
  const processedSelections = [];
  let earliestMatchTime = null;

  for (const sel of selections) {
    const match = await matchRepository.findMatchById(sel.match_id);
    if (!match || match.status !== 'UPCOMING') {
      throw new Error(`Mechi ${sel.match_id} haipo au tayari imeshaanza.`);
    }

    const marketOdds = match.odds ? match.odds[sel.market_key] : null;
    if (!marketOdds || marketOdds[sel.outcome_key] === undefined) {
      throw new Error(`Odds hazipatikani kwa masoko yaliyochaguliwa (${sel.market_key} - ${sel.outcome_key}).`);
    }

    const currentOdds = parseFloat(marketOdds[sel.outcome_key]);
    calculatedTotalOdds *= currentOdds;

    processedSelections.push({
      match_id: match.id,
      home_team: match.home_team,
      away_team: match.away_team,
      league: match.league,
      market_key: sel.market_key,
      outcome_key: sel.outcome_key,
      odds: currentOdds
    });

    const matchDate = parseMatchDateTime(match.date, match.time);
    
    if (!earliestMatchTime || matchDate < earliestMatchTime) {
      earliestMatchTime = matchDate;
    }
  }

  const code = generateShortCode();
  const now = new Date();
  let expiresAt = earliestMatchTime && earliestMatchTime > now ? earliestMatchTime : new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Data za kuhifadhi bila creator_id
  const bookingData = {
    code,
    selections: processedSelections,
    total_odds: parseFloat(calculatedTotalOdds.toFixed(2)),
    is_active: true,
    expires_at: expiresAt
  };

  return await bookingCodeRepository.createBookingCode(bookingData);
};

const getBookingCodeDetails = async (code) => {
  if (!code) {
    throw new Error('Tafadhali weka booking code.');
  }

  const booking = await bookingCodeRepository.findBookingCodeByCode(code.toUpperCase());
  if (!booking) {
    throw new Error('Booking code hii haipo au imeshapitwa na wakati.');
  }

  // 1. Angalia expiry date ya booking code yenyewe
  if (new Date() > new Date(booking.expires_at)) {
    await bookingCodeRepository.deactivateBookingCode(booking.code);
    throw new Error('Booking code hii imepita muda wake.');
  }

  // 2. Kukusanya match_ids zote zilizomo
  const matchIds = booking.selections.map((s) => s.match_id);

  // 3. Tafuta mechi zote kwa pamoja kutoka kwa matchRepository
  // (Inatakiwa matchRepository iwe na method ya ku-find multiple matches by IDs au raw Model Query)
  const matches = await matchRepository.findMatchesByIds(matchIds);

  let currentTotalOdds = 1.0;
  const updatedSelections = [];

  for (const item of booking.selections) {
    const match = matches.find((m) => m.id === item.match_id);

    // Kama mechi haipo au SIO 'UPCOMING' (k.m. LIVE, FINISHED, CANCELLED)
    if (!match || match.status !== 'UPCOMING') {
      // Deactivate code mara moja
      await bookingCodeRepository.deactivateBookingCode(booking.code);
      throw new Error('Booking code hii imepita muda wake.');
    }

    // Kuchukua odds zilizopo live kwa muda huo
    const liveOdds = match.odds?.[item.market_key]?.[item.outcome_key] || item.odds;
    currentTotalOdds *= parseFloat(liveOdds);

    updatedSelections.push({
      ...item,
      odds: parseFloat(liveOdds)
    });
  }

  return {
    code: booking.code,
    total_odds: parseFloat(currentTotalOdds.toFixed(2)),
    selections: updatedSelections
  };
};

module.exports = {
  createBookingCode,
  getBookingCodeDetails
};


