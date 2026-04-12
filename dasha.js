/**
 * dasha.js
 * ヴィムショッタリー・ダシャー計算エンジン
 * The Oracle ✦ 魂の設計図
 */

const { DASHA_LORDS, DASHA_TOTAL_YEARS, NAKSHATRAS } = require('./constants');
const {
  dateToJD,
  getSiderealLongitude,
  getMoonNakshatra,
  getAllPlanetPositions,
  getLagna,
  getSign,
} = require('./ephemeris');
const swisseph = require('swisseph');

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

/**
 * 出生データから天文基礎データを取得（async）
 */
async function getBirthAstroData(birthData) {
  const { year, month, day, hour, minute, tzOffset, lat, lon } = birthData;

  const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const utcDate   = new Date(localDate.getTime() - tzOffset * 60 * 60 * 1000);
  const jd        = dateToJD(utcDate);

  // 月の経度
  const moonResult = await getSiderealLongitude(jd, swisseph.SE_MOON);
  if (moonResult.error) throw new Error(`月の計算エラー: ${moonResult.error}`);

  const moonLon = moonResult.longitude;
  const { nakshatra, progress, pada } = getMoonNakshatra(moonLon);
  const moonSign = getSign(moonLon);

  // 全惑星
  const planets = await getAllPlanetPositions(jd);

  // ラグナ（出生地があれば）
  let lagnaSign = null;
  if (lat !== undefined && lon !== undefined) {
    const lagnaLon = await getLagna(jd, lat, lon);
    if (lagnaLon !== null) lagnaSign = getSign(lagnaLon);
  }

  return {
    jd,
    utcDate,
    birthDate: localDate,
    moon: {
      longitude: moonLon,
      sign: moonSign,
      nakshatra: nakshatra.name,
      nakshatraIndex: nakshatra.index,
      pada,
      dashaLordIndex: nakshatra.lord,
    },
    planets,
    lagna: lagnaSign,
    nakshatraProgress: progress,
  };
}

/**
 * マハーダシャー一覧を計算
 */
function calculateMahaDashas(birthDate, dashaLordIndex, nakshatraProgress) {
  const mahadashas = [];
  const firstLord     = DASHA_LORDS[dashaLordIndex];
  const firstDuration = firstLord.years * (1 - nakshatraProgress);

  const elapsedMs      = firstLord.years * nakshatraProgress * YEAR_MS;
  const firstDashaStart = new Date(birthDate.getTime() - elapsedMs);

  let currentStart = firstDashaStart;
  let lordIdx      = dashaLordIndex;

  for (let i = 0; i < 27; i++) {
    const lord          = DASHA_LORDS[lordIdx];
    const durationYears = (i === 0) ? firstDuration : lord.years;
    const durationMs    = durationYears * YEAR_MS;
    const endDate       = new Date(currentStart.getTime() + durationMs);

    mahadashas.push({
      lord: lord.id,
      lordName: lord.name,
      lordIndex: lordIdx,
      startDate: new Date(currentStart),
      endDate: new Date(endDate),
      durationYears: parseFloat(durationYears.toFixed(4)),
      fullYears: lord.years,
    });

    currentStart = endDate;
    lordIdx = (lordIdx + 1) % 9;

    const yearsCovered = (currentStart.getTime() - birthDate.getTime()) / YEAR_MS;
    if (yearsCovered > 360) break;
  }

  return mahadashas;
}

/**
 * アンタルダシャーを計算
 */
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
      lord: antarLord.id,
      lordName: antarLord.name,
      lordIndex: antarLordIdx,
      startDate: new Date(currentStart),
      endDate: new Date(endDate),
      durationYears: parseFloat(durationYears.toFixed(4)),
    });

    currentStart = endDate;
  }

  return antardashas;
}

/**
 * 現在のダシャー位置を特定
 */
function getCurrentDasha(mahadashas, referenceDate = new Date()) {
  const currentMaha = mahadashas.find(d => d.startDate <= referenceDate && referenceDate < d.endDate);
  const nextMaha    = mahadashas.find(d => d.startDate > referenceDate);

  if (!currentMaha) return { current: null, next: nextMaha || null, currentAntar: null, nextAntar: null };

  const antardashas  = calculateAntarDashas(currentMaha);
  const currentAntar = antardashas.find(a => a.startDate <= referenceDate && referenceDate < a.endDate);
  const nextAntar    = antardashas.find(a => a.startDate > referenceDate);

  const remainingMahaDays  = Math.floor((currentMaha.endDate  - referenceDate) / 86400000);
  const remainingAntarDays = currentAntar ? Math.floor((currentAntar.endDate - referenceDate) / 86400000) : null;

  return {
    current:      { ...currentMaha, remainingDays: remainingMahaDays },
    next:         nextMaha || null,
    currentAntar: currentAntar ? { ...currentAntar, remainingDays: remainingAntarDays } : null,
    nextAntar:    nextAntar || null,
    antardashas,
  };
}

/**
 * Claude APIへ渡すサマリー文字列
 */
function buildSummaryForAI(astroData, currentDasha, upcoming) {
  const fmt = d => d
    ? `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
    : '不明';

  const lines = [
    `【魂の波動データ】`,
    `出生時の月星座: ${astroData.moon.sign.sign} ${astroData.moon.sign.degrees.toFixed(1)}°`,
    `魂の星座(ナクシャトラ): ${astroData.moon.nakshatra} パーダ${astroData.moon.pada}`,
    ``,
    `【現在の時の波動】`,
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
    const na = currentDasha.nextAntar;
    lines.push(`次の副波動: ${na.lordName} (${fmt(na.startDate)} ～)`);
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
  const fmtP = (name, data) => {
    if (!data) return null;
    const s = getSign(data.longitude);
    return `${name}: ${s.sign} ${s.degrees.toFixed(1)}°${data.isRetrograde ? '(逆行)' : ''}`;
  };
  ['sun','moon','mercury','venus','mars','jupiter','saturn','rahu','ketu'].forEach(key => {
    const labels = { sun:'太陽', moon:'月', mercury:'水星', venus:'金星', mars:'火星',
                     jupiter:'木星', saturn:'土星', rahu:'ラーフ', ketu:'ケートゥ' };
    const line = fmtP(labels[key], p[key]);
    if (line) lines.push(line);
  });

  if (astroData.lagna) {
    lines.push(`アセンダント: ${astroData.lagna.sign} ${astroData.lagna.degrees.toFixed(1)}°`);
  }

  return lines.join('\n');
}

/**
 * メイン関数（async）
 */
async function calculateFullDasha(birthData, referenceDate = new Date()) {
  const astroData    = await getBirthAstroData(birthData);
  const mahadashas   = calculateMahaDashas(astroData.utcDate, astroData.moon.dashaLordIndex, astroData.nakshatraProgress);
  const currentDasha = getCurrentDasha(mahadashas, referenceDate);

  const tenYearsLater = new Date(referenceDate.getTime() + 10 * YEAR_MS);
  const upcomingMahas = mahadashas.filter(d => d.endDate > referenceDate && d.startDate < tenYearsLater);
  const upcoming = upcomingMahas.map(maha => ({
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
  getBirthAstroData,
  calculateMahaDashas,
  calculateAntarDashas,
  getCurrentDasha,
  calculateFullDasha,
};
