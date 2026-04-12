/**
 * dasha.js
 * ヴィムショッタリー・ダシャー計算エンジン
 * The Oracle ✦ 魂の設計図
 *
 * 【計算の流れ】
 * 1. 月のシデリアル経度 → ナクシャトラ判定
 * 2. ナクシャトラ内の進行率 → 現在ダシャーの残り年数
 * 3. 以降のダシャー順序を120年サイクルで展開
 * 4. 各マハーダシャーをアンタルダシャー（副期）に細分化
 */

const { DASHA_LORDS, DASHA_TOTAL_YEARS, NAKSHATRAS } = require('./constants');
const { dateToJD, getSiderealLongitude, getMoonNakshatra, getAllPlanetPositions, getLagna, getSign } = require('./ephemeris');
const swisseph = require('swisseph');

// 年をミリ秒に変換（ユリウス年: 365.25日）
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365.25;

/**
 * 出生データからダシャー計算に必要な基礎データを取得
 * @param {object} birthData
 * @param {number} birthData.year
 * @param {number} birthData.month  - 1〜12
 * @param {number} birthData.day    - 1〜31
 * @param {number} birthData.hour   - 0〜23（現地時間）
 * @param {number} birthData.minute - 0〜59
 * @param {number} birthData.tzOffset - タイムゾーンオフセット（時間）例: +9 = JST
 * @param {number} [birthData.lat]  - 出生地緯度（ラグナ計算用）
 * @param {number} [birthData.lon]  - 出生地経度（ラグナ計算用）
 * @returns {object} 計算基礎データ
 */
function getBirthAstroData(birthData) {
  const { year, month, day, hour, minute, tzOffset, lat, lon } = birthData;

  // UTC に変換
  const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const utcDate = new Date(localDate.getTime() - tzOffset * 60 * 60 * 1000);

  const jd = dateToJD(utcDate);

  // 月のシデリアル経度
  const moonResult = getSiderealLongitude(jd, swisseph.SE_MOON);
  if (moonResult.error) {
    throw new Error(`月の位置計算エラー: ${moonResult.error}`);
  }

  const moonLon = moonResult.longitude;
  const { nakshatra, progress, pada } = getMoonNakshatra(moonLon);
  const moonSign = getSign(moonLon);

  // 全惑星位置
  const planets = getAllPlanetPositions(jd);

  // ラグナ（出生地情報があれば）
  let lagna = null;
  let lagnaSign = null;
  if (lat !== undefined && lon !== undefined) {
    lagna = getLagna(jd, lat, lon);
    if (lagna !== null) lagnaSign = getSign(lagna);
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
      dashaLordIndex: nakshatra.lord, // DASHA_LORDS のインデックス
    },
    planets,
    lagna: lagnaSign,
    nakshatraProgress: progress, // ナクシャトラ内通過率（0〜1）
  };
}

/**
 * ヴィムショッタリー・マハーダシャー一覧を計算
 * @param {Date} birthDate - 出生日時（UTC）
 * @param {number} dashaLordIndex - 出生時のダシャー主星インデックス（0〜8）
 * @param {number} nakshatraProgress - ナクシャトラ内通過率（0〜1）
 * @param {number} [years=3] - 何サイクル分（120年×years）展開するか
 * @returns {Array} マハーダシャー一覧
 */
function calculateMahaDashas(birthDate, dashaLordIndex, nakshatraProgress, years = 3) {
  const mahadashas = [];

  // 最初のダシャーの残り年数
  const firstLord = DASHA_LORDS[dashaLordIndex];
  const firstDuration = firstLord.years * (1 - nakshatraProgress); // 残り年数

  // 出生時のダシャー開始日（逆算）
  // 出生時点では nakshatraProgress 分が経過している
  const elapsedMs = firstLord.years * nakshatraProgress * YEAR_MS;
  const firstDashaStart = new Date(birthDate.getTime() - elapsedMs);

  let currentStart = firstDashaStart;
  let lordIdx = dashaLordIndex;

  // 120年分（≒1サイクル）を展開。十分な期間をカバー
  const totalIterations = 27; // 9惑星 × 3サイクル = 270年分
  for (let i = 0; i < totalIterations; i++) {
    const lord = DASHA_LORDS[lordIdx];
    const durationYears = (i === 0) ? firstDuration : lord.years;
    const durationMs = durationYears * YEAR_MS;
    const endDate = new Date(currentStart.getTime() + durationMs);

    // 完全な期間（表示・antardasha計算用）
    const fullDuration = (i === 0) ? firstLord.years : lord.years;

    mahadashas.push({
      lord: lord.id,
      lordName: lord.name,
      lordIndex: lordIdx,
      startDate: new Date(currentStart),
      endDate: new Date(endDate),
      durationYears: parseFloat(durationYears.toFixed(4)),
      fullYears: fullDuration, // 完全な年数（アンタル計算用）
    });

    currentStart = endDate;
    lordIdx = (lordIdx + 1) % 9;

    // 十分先まで計算したら終了（120年以上）
    const yearsCovered = (currentStart.getTime() - birthDate.getTime()) / YEAR_MS;
    if (yearsCovered > 120 * years) break;
  }

  return mahadashas;
}

/**
 * マハーダシャー内のアンタルダシャー（副期）を計算
 * アンタル期間 = (マハーダシャー年数 × アンタル主星年数) / 120
 * @param {object} mahaDasha - calculateMahaDashas の1要素
 * @returns {Array} アンタルダシャー一覧（9要素）
 */
function calculateAntarDashas(mahaDasha) {
  const antardashas = [];
  const mahaLordIdx = mahaDasha.lordIndex;
  const mahaTotalYears = mahaDasha.fullYears;

  let currentStart = new Date(mahaDasha.startDate);

  // アンタルは同じ主星から開始
  for (let i = 0; i < 9; i++) {
    const antarLordIdx = (mahaLordIdx + i) % 9;
    const antarLord = DASHA_LORDS[antarLordIdx];

    // 期間 = (マハー年数 × アンタル年数) / 120
    const durationYears = (mahaTotalYears * antarLord.years) / DASHA_TOTAL_YEARS;
    const durationMs = durationYears * YEAR_MS;
    const endDate = new Date(currentStart.getTime() + durationMs);

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
 * 現在のマハーダシャー・アンタルダシャーを特定
 * @param {Array} mahadashas
 * @param {Date} [referenceDate] - デフォルトは現在日時
 * @returns {{ current: object, next: object, currentAntar: object, nextAntar: object }}
 */
function getCurrentDasha(mahadashas, referenceDate = new Date()) {
  const ref = referenceDate;

  const currentMaha = mahadashas.find(
    d => d.startDate <= ref && ref < d.endDate
  );
  const nextMaha = mahadashas.find(d => d.startDate > ref);

  if (!currentMaha) {
    return { current: null, next: nextMaha || null, currentAntar: null, nextAntar: null };
  }

  const antardashas = calculateAntarDashas(currentMaha);
  const currentAntar = antardashas.find(
    a => a.startDate <= ref && ref < a.endDate
  );
  const nextAntar = antardashas.find(a => a.startDate > ref);

  // 残り日数
  const remainingMahaDays = Math.floor((currentMaha.endDate - ref) / (24 * 60 * 60 * 1000));
  const remainingAntarDays = currentAntar
    ? Math.floor((currentAntar.endDate - ref) / (24 * 60 * 60 * 1000))
    : null;

  return {
    current: { ...currentMaha, remainingDays: remainingMahaDays },
    next: nextMaha || null,
    currentAntar: currentAntar ? { ...currentAntar, remainingDays: remainingAntarDays } : null,
    nextAntar: nextAntar || null,
    antardashas, // 現在のマハーダシャー内の全アンタル
  };
}

/**
 * ========================================
 * メイン関数: 出生データから全ダシャー情報を生成
 * ========================================
 * @param {object} birthData - getBirthAstroData と同じ形式
 * @param {Date} [referenceDate] - 占い基準日（デフォルト: 現在）
 * @returns {object} 完全なダシャー情報
 */
function calculateFullDasha(birthData, referenceDate = new Date()) {
  // Step 1: 天文計算
  const astroData = getBirthAstroData(birthData);

  // Step 2: マハーダシャー計算
  const mahadashas = calculateMahaDashas(
    astroData.utcDate,
    astroData.moon.dashaLordIndex,
    astroData.nakshatraProgress
  );

  // Step 3: 現在位置の特定
  const currentDasha = getCurrentDasha(mahadashas, referenceDate);

  // Step 4: 今後10年のダシャー（Claude APIへの入力として有用）
  const tenYearsLater = new Date(referenceDate.getTime() + 10 * YEAR_MS);
  const upcomingMahas = mahadashas.filter(
    d => d.endDate > referenceDate && d.startDate < tenYearsLater
  );

  // 各今後マハーのアンタルも計算
  const upcomingWithAntar = upcomingMahas.map(maha => ({
    ...maha,
    antardashas: calculateAntarDashas(maha).filter(
      a => a.endDate > referenceDate && a.startDate < tenYearsLater
    ),
  }));

  return {
    // 基礎天文データ
    astro: astroData,

    // 現在のダシャー状況
    currentDasha,

    // 今後10年（Claude APIへ渡すメインデータ）
    upcoming: upcomingWithAntar,

    // 全マハーダシャー（120年分）
    allMahadashas: mahadashas,

    // Claude API へ渡すサマリー文字列
    summaryForAI: buildSummaryForAI(astroData, currentDasha, upcomingWithAntar),
  };
}

/**
 * Claude API へ渡すための構造化サマリーを生成
 * （インド占星術用語は内部使用、ブランド用語でラップ）
 */
function buildSummaryForAI(astroData, currentDasha, upcoming) {
  const fmt = (d) => d ? `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}` : '不明';

  const lines = [
    `【魂の波動データ】`,
    `出生時の月星座: ${astroData.moon.sign.sign} ${astroData.moon.sign.degrees.toFixed(1)}°`,
    `魂の星座(ナクシャトラ): ${astroData.moon.nakshatra} パーダ${astroData.moon.pada}`,
    ``,
    `【現在の時の波動（マハーダシャー）】`,
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
    lines.push(`次の副波動: ${na.lordName} (${fmt(na.startDate)} ～ ${fmt(na.endDate)})`);
  }

  lines.push(``, `【今後10年の波動の流れ】`);
  for (const maha of upcoming) {
    lines.push(`▸ ${maha.lordName}期 ${fmt(maha.startDate)}〜${fmt(maha.endDate)}`);
    for (const antar of (maha.antardashas || [])) {
      lines.push(`  └ ${antar.lordName} ${fmt(antar.startDate)}〜${fmt(antar.endDate)}`);
    }
  }

  // 惑星配置サマリー
  lines.push(``, `【天体配置】`);
  const p = astroData.planets;
  if (p.sun)     lines.push(`太陽: ${getSign(p.sun.longitude).sign} ${getSign(p.sun.longitude).degrees.toFixed(1)}°`);
  if (p.moon)    lines.push(`月: ${getSign(p.moon.longitude).sign} ${getSign(p.moon.longitude).degrees.toFixed(1)}°`);
  if (p.mars)    lines.push(`火星: ${getSign(p.mars.longitude).sign} ${getSign(p.mars.longitude).degrees.toFixed(1)}°${p.mars.isRetrograde ? '(逆行)' : ''}`);
  if (p.mercury) lines.push(`水星: ${getSign(p.mercury.longitude).sign} ${getSign(p.mercury.longitude).degrees.toFixed(1)}°${p.mercury.isRetrograde ? '(逆行)' : ''}`);
  if (p.jupiter) lines.push(`木星: ${getSign(p.jupiter.longitude).sign} ${getSign(p.jupiter.longitude).degrees.toFixed(1)}°${p.jupiter.isRetrograde ? '(逆行)' : ''}`);
  if (p.venus)   lines.push(`金星: ${getSign(p.venus.longitude).sign} ${getSign(p.venus.longitude).degrees.toFixed(1)}°${p.venus.isRetrograde ? '(逆行)' : ''}`);
  if (p.saturn)  lines.push(`土星: ${getSign(p.saturn.longitude).sign} ${getSign(p.saturn.longitude).degrees.toFixed(1)}°${p.saturn.isRetrograde ? '(逆行)' : ''}`);
  if (p.rahu)    lines.push(`ラーフ(上昇): ${getSign(p.rahu.longitude).sign} ${getSign(p.rahu.longitude).degrees.toFixed(1)}°`);
  if (p.ketu)    lines.push(`ケートゥ(下降): ${getSign(p.ketu.longitude).sign} ${getSign(p.ketu.longitude).degrees.toFixed(1)}°`);

  if (astroData.lagna) {
    lines.push(`アセンダント: ${astroData.lagna.sign} ${astroData.lagna.degrees.toFixed(1)}°`);
  }

  return lines.join('\n');
}

module.exports = {
  getBirthAstroData,
  calculateMahaDashas,
  calculateAntarDashas,
  getCurrentDasha,
  calculateFullDasha,
  buildSummaryForAI,
};
