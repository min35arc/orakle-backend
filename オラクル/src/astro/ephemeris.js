/**
 * ephemeris.js
 * swisseph ラッパー - 天体位置計算
 * The Oracle ✦ 魂の設計図
 *
 * swisseph は同期APIのため Promise でラップして使いやすくする
 */

const swisseph = require('swisseph');
const { SE_PLANETS, SE_SIDM_LAHIRI, NAKSHATRAS, NAKSHATRA_SPAN_DEG } = require('./constants');

/**
 * Julian Day Number を計算
 * @param {Date} date - 生年月日時（UTC）
 * @returns {number} JD
 */
function dateToJD(date) {
  const year  = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day   = date.getUTCDay() === 0
    ? date.getUTCDate()
    : date.getUTCDate();
  const hour  = date.getUTCHours()
              + date.getUTCMinutes() / 60
              + date.getUTCSeconds() / 3600;

  // swisseph の julday は month=1-12, day=1-31
  const actualDay = date.getUTCDate();
  return swisseph.julday(year, month, actualDay, hour, swisseph.SE_GREG_CAL);
}

/**
 * 指定惑星のシデリアル経度を取得（ラーヒリ・アヤナームシャ）
 * @param {number} jd - Julian Day
 * @param {number} planet - swisseph 惑星番号
 * @returns {{ longitude: number, speed: number, error?: string }}
 */
function getSiderealLongitude(jd, planet) {
  // アヤナームシャを設定
  swisseph.set_sid_mode(SE_SIDM_LAHIRI, 0, 0);

  // SEFLG_SIDEREAL | SEFLG_SPEED
  const flags = swisseph.SEFLG_SIDEREAL | swisseph.SEFLG_SPEED;
  const result = swisseph.calc_ut(jd, planet, flags);

  if (result.error) {
    return { longitude: 0, speed: 0, error: result.error };
  }

  return {
    longitude: result.longitude,   // 0〜360°
    speed: result.longitudeSpeed,  // °/day（負なら逆行）
  };
}

/**
 * 月のシデリアル経度からナクシャトラを判定
 * @param {number} moonSidLon - 月のシデリアル経度
 * @returns {{ nakshatra: object, progress: number, pada: number }}
 *   progress: ナクシャトラ内の進行率（0〜1）
 *   pada: パーダ番号（1〜4）
 */
function getMoonNakshatra(moonSidLon) {
  // 0〜360 に正規化
  const lon = ((moonSidLon % 360) + 360) % 360;

  const nakshatraIndex = Math.floor(lon / NAKSHATRA_SPAN_DEG);
  const progress = (lon % NAKSHATRA_SPAN_DEG) / NAKSHATRA_SPAN_DEG; // 0〜1

  // パーダ（各ナクシャトラを4等分）
  const pada = Math.floor(progress * 4) + 1; // 1〜4

  return {
    nakshatra: NAKSHATRAS[nakshatraIndex],
    progress,  // ナクシャトラ内の通過率（残り = 1 - progress）
    pada,
  };
}

/**
 * 全惑星のシデリアル位置を一括取得
 * @param {number} jd
 * @returns {object} 各惑星の経度
 */
function getAllPlanetPositions(jd) {
  swisseph.set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
  const flags = swisseph.SEFLG_SIDEREAL | swisseph.SEFLG_SPEED;

  const planets = {};
  const planetList = [
    { key: 'sun',     num: SE_PLANETS.SUN },
    { key: 'moon',    num: SE_PLANETS.MOON },
    { key: 'mercury', num: SE_PLANETS.MERCURY },
    { key: 'venus',   num: SE_PLANETS.VENUS },
    { key: 'mars',    num: SE_PLANETS.MARS },
    { key: 'jupiter', num: SE_PLANETS.JUPITER },
    { key: 'saturn',  num: SE_PLANETS.SATURN },
    { key: 'rahu',    num: SE_PLANETS.TRUE_NODE },
  ];

  for (const p of planetList) {
    const r = swisseph.calc_ut(jd, p.num, flags);
    if (!r.error) {
      planets[p.key] = {
        longitude: r.longitude,
        speed: r.longitudeSpeed,
        isRetrograde: r.longitudeSpeed < 0,
      };
    }
  }

  // Ketu = Rahu + 180°
  if (planets.rahu) {
    planets.ketu = {
      longitude: (planets.rahu.longitude + 180) % 360,
      speed: planets.rahu.speed,
      isRetrograde: true, // Ketu は常に逆行扱い
    };
  }

  return planets;
}

/**
 * ラグナ（アセンダント）を計算
 * @param {number} jd
 * @param {number} lat - 出生地緯度
 * @param {number} lon - 出生地経度
 * @returns {number} ラグナのシデリアル経度
 */
function getLagna(jd, lat, lon) {
  swisseph.set_sid_mode(SE_SIDM_LAHIRI, 0, 0);

  // houses_ex で第1ハウスカスプ（= アセンダント）を取得
  // Placidus ハウスシステム（インド占星術では Whole Sign が一般的だが計算はPlacidus）
  const houses = swisseph.houses_ex(jd, swisseph.SEFLG_SIDEREAL, lat, lon, 'P');

  if (houses.error) {
    return null;
  }

  // houses.ascendant がラグナ（0〜360）
  return houses.ascendant;
}

/**
 * 経度から星座（ラーシ）を返す
 * @param {number} longitude - シデリアル経度
 * @returns {{ sign: string, signIndex: number, degrees: number }}
 */
function getSign(longitude) {
  const SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const lon = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(lon / 30);
  const degrees = lon % 30;

  return {
    sign: SIGNS[signIndex],
    signIndex,
    degrees: parseFloat(degrees.toFixed(4)),
  };
}

module.exports = {
  dateToJD,
  getSiderealLongitude,
  getMoonNakshatra,
  getAllPlanetPositions,
  getLagna,
  getSign,
};
