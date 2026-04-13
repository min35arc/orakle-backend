/**
 * dasha.js - ヴィムショッタリー・ダシャー計算エンジン
 * The Oracle ✦ 魂の設計図
 */

const { DASHA_LORDS, DASHA_TOTAL_YEARS, NAKSHATRAS } = require('./constants');
const {
  dateToJD, getSiderealLongitude, getMoonNakshatra,
  getAllPlanetPositions, getLagna, getSign,
} = require('./ephemeris');
const { NAKSHATRA_NAMES_JP } = require('./astro-interpreter');
const swisseph = require('swisseph');

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

async function getBirthAstroData(birthData) {
  const { year, month, day, hour, minute, tzOffset, lat, lon } = birthData;
  const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const utcDate   = new Date(localDate.getTime() - tzOffset * 60 * 60 * 1000);
  const jd        = dateToJD(utcDate);

  const moonResult = await getSiderealLongitude(jd, swisseph.SE_MOON);
  if (moonResult.error) throw new Error(`月の計算エラー: ${moonResult.error}`);

  const moonLon = moonResult.longitude;
  const { nakshatra, progress, pada } = getMoonNakshatra(moonLon);
  const moonSign = getSign(moonLon);
  const planets  = await getAllPlanetPositions(jd);

  let lagnaSign = null;
  if (lat !== undefined && lon !== undefined) {
    const lagnaLon = await getLagna(jd, lat, lon);
    if (lagnaLon !== null) lagnaSign = getSign(lagnaLon);
  }

  return {
    jd, utcDate, birthDate: localDate,
    moon: {
      longitude: moonLon, sign: moonSign,
      nakshatra: nakshatra.name, nakshatraIndex: nakshatra.index,
      pada, dashaLordIndex: nakshatra.lord,
    },
    planets, lagna: lagnaSign,
    nakshatraProgress: progress,
  };
}

/**
 * マハーダシャー一覧を計算
 * 
 * 【修正済みロジック】
 * - 最初のダシャー開始日 = 出生日 - (全期間 × 経過率)
 * - 最初のダシャー終了日 = 開始日 + 全期間年数  ← ここが重要（残り年数ではなく全期間）
 * - これにより終了日 = 出生日 + 残り年数 となる
 */
function calculateMahaDashas(birthDate, dashaLordIndex, nakshatraProgress) {
  const mahadashas = [];
  const firstLord  = DASHA_LORDS[dashaLordIndex];

  // 出生時点で何年経過しているか
  const elapsedYears   = firstLord.years * nakshatraProgress;
  const remainingYears = firstLord.years * (1 - nakshatraProgress);

  // 最初のダシャー開始日（出生前）
  const firstDashaStart = new Date(birthDate.getTime() - elapsedYears * YEAR_MS);

  let currentStart = firstDashaStart;
  let lordIdx      = dashaLordIndex;

  for (let i = 0; i < 27; i++) {
    const lord = DASHA_LORDS[lordIdx];

    // 期間は常に全期間（終了日の計算に使う）
    const fullDurationMs = lord.years * YEAR_MS;
    const endDate        = new Date(currentStart.getTime() + fullDurationMs);

    mahadashas.push({
      lord: lord.id,
      lordName: lord.name,
      lordIndex: lordIdx,
      startDate: new Date(currentStart),
      endDate: new Date(endDate),
      // 表示用: 最初のダシャーは残り年数、それ以降は全期間
      durationYears: parseFloat((i === 0 ? remainingYears : lord.years).toFixed(4)),
      fullYears: lord.years,
    });

    currentStart = endDate;
    lordIdx = (lordIdx + 1) % 9;

    const yearsCovered = (currentStart.getTime() - birthDate.getTime()) / YEAR_MS;
    if (yearsCovered > 360) break;
  }

  return mahadashas;
}

function calculateAntarDashas(mahaDasha) {
  const antardashas  = [];
  const mahaLordIdx  = mahaDasha.lordIndex;
  const mahaTotalYrs = mahaDasha.fullYears;
  let currentStart   = new Date(mahaDasha.startDate);

  for (let i = 0; i < 9; i++) {
    const antarLordIdx  = (mahaLordIdx + i) % 9;
    const antarLord     = DASHA_LORDS[antarLordIdx];
    const durationYears = (mahaTotalYrs * antarLord.years) / DASHA_TOTAL_YEARS;
    const endDate       = new Date(currentStart.getTime() + durationYears * YEAR_MS);

    antardashas.push({
      lord: antarLord.id, lordName: antarLord.name, lordIndex: antarLordIdx,
      startDate: new Date(currentStart), endDate: new Date(endDate),
      durationYears: parseFloat(durationYears.toFixed(4)),
    });

    currentStart = endDate;
  }

  return antardashas;
}

function getCurrentDasha(mahadashas, referenceDate = new Date()) {
  const currentMaha = mahadashas.find(d => d.startDate <= referenceDate && referenceDate < d.endDate);
  const nextMaha    = mahadashas.find(d => d.startDate > referenceDate);

  if (!currentMaha) return { current: null, next: nextMaha || null, currentAntar: null, nextAntar: null };

  const antardashas  = calculateAntarDashas(currentMaha);
  const currentAntar = antardashas.find(a => a.startDate <= referenceDate && referenceDate < a.endDate);
  const nextAntar    = antardashas.find(a => a.startDate > referenceDate);

  return {
    current:      { ...currentMaha, remainingDays: Math.floor((currentMaha.endDate - referenceDate) / 86400000) },
    next:         nextMaha || null,
    currentAntar: currentAntar ? { ...currentAntar, remainingDays: Math.floor((currentAntar.endDate - referenceDate) / 86400000) } : null,
    nextAntar:    nextAntar || null,
    antardashas,
  };
}

function buildSummaryForAI(astroData, currentDasha, upcoming) {
  const fmt = d => d
    ? `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
    : '不明';

  const lines = [
    `【魂の波動データ】`,
    `出生時の月星座: ${astroData.moon.sign.sign} ${astroData.moon.sign.degrees.toFixed(1)}°`,
    `魂の星座(ナクシャトラ): ${NAKSHATRA_NAMES_JP[astroData.moon.nakshatra] || astroData.moon.nakshatra} パーダ${astroData.moon.pada}`,
    ``, `【現在の時の波動】`,
  ];

  if (currentDasha.current) {
    const c = currentDasha.current;
    lines.push(`主波動: ${c.lordName} (${fmt(c.startDate)} ～ ${fmt(c.endDate)}) 残り${c.remainingDays}日`);
  }
  if (currentDasha.currentAntar) {
    const a = currentDasha.currentAntar;
    lines.push(`副波動: ${a.lordName} (${fmt(a.startDate)} ～ ${fmt(a.endDate)}) 残り${a.remainingDays}日`);
  }
  if (currentDasha.nextAntar) {
    lines.push(`次の副波動: ${currentDasha.nextAntar.lordName} (${fmt(currentDasha.nextAntar.startDate)} ～)`);
  }

  lines.push(``, `【今後10年の波動の流れ】`);
  for (const maha of upcoming) {
    lines.push(`▸ ${maha.lordName}期 ${fmt(maha.startDate)}〜${fmt(maha.endDate)}`);
    for (const antar of (maha.antardashas || [])) {
      lines.push(`  └ ${antar.lordName} ${fmt(antar.startDate)}〜${fmt(antar.endDate)}`);
    }
  }

  lines.push(``, `【天体配置】`);
  const p = astroData.planets;
  const labels = { sun:'太陽', moon:'月', mercury:'水星', venus:'金星', mars:'火星',
                   jupiter:'木星', saturn:'土星', rahu:'ラーフ', ketu:'ケートゥ' };
  for (const [key, label] of Object.entries(labels)) {
    if (p[key]) {
      const s = getSign(p[key].longitude);
      lines.push(`${label}: ${s.sign} ${s.degrees.toFixed(1)}°${p[key].isRetrograde ? '(逆行)' : ''}`);
    }
  }
  if (astroData.lagna) {
    lines.push(`アセンダント: ${astroData.lagna.sign} ${astroData.lagna.degrees.toFixed(1)}°`);
  }

  return lines.join('\n');
}

async function calculateFullDasha(birthData, referenceDate = new Date()) {
  const astroData    = await getBirthAstroData(birthData);
  const mahadashas   = calculateMahaDashas(astroData.utcDate, astroData.moon.dashaLordIndex, astroData.nakshatraProgress);
  const currentDasha = getCurrentDasha(mahadashas, referenceDate);

  const tenYearsLater = new Date(referenceDate.getTime() + 10 * YEAR_MS);
  const upcoming = mahadashas
    .filter(d => d.endDate > referenceDate && d.startDate < tenYearsLater)
    .map(maha => ({
      ...maha,
      antardashas: calculateAntarDashas(maha).filter(
        a => a.endDate > referenceDate && a.startDate < tenYearsLater
      ),
    }));

  return {
    astro: astroData,
    currentDasha,
    upcoming,
    allMahadashas: mahadashas,
    summaryForAI: buildSummaryForAI(astroData, currentDasha, upcoming),
  };
}

module.exports = {
  getBirthAstroData, calculateMahaDashas, calculateAntarDashas,
  getCurrentDasha, calculateFullDasha,
};
