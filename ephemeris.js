/**
 * ephemeris.js
 * swisseph ラッパー（npm swisseph の実際のAPI形式に対応）
 * 関数名は swe_ プレフィックス付き、calc_ut はコールバック形式
 */

const swisseph = require('swisseph');
const { NAKSHATRAS, NAKSHATRA_SPAN_DEG } = require('./constants');

const SE_SIDM_LAHIRI = 1;

/**
 * Julian Day Number を計算
 */
function dateToJD(date) {
  const year   = date.getUTCFullYear();
  const month  = date.getUTCMonth() + 1;
  const day    = date.getUTCDate();
  const hour   = date.getUTCHours()
               + date.getUTCMinutes() / 60
               + date.getUTCSeconds() / 3600;
  return swisseph.swe_julday(year, month, day, hour, swisseph.SE_GREG_CAL);
}

/**
 * 惑星のシデリアル経度を取得（Promise）
 */
function getSiderealLongitude(jd, planet) {
  return new Promise((resolve) => {
    swisseph.swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
    const flags = swisseph.SEFLG_SIDEREAL | swisseph.SEFLG_SPEED;
    swisseph.swe_calc_ut(jd, planet, flags, (result) => {
      if (result.error) {
        resolve({ longitude: 0, speed: 0, error: result.error });
      } else {
        resolve({ longitude: result.longitude, speed: result.longitudeSpeed });
      }
    });
  });
}

/**
 * 月のナクシャトラを判定
 */
function getMoonNakshatra(moonSidLon) {
  const lon = ((moonSidLon % 360) + 360) % 360;
  const nakshatraIndex = Math.floor(lon / NAKSHATRA_SPAN_DEG);
  const progress = (lon % NAKSHATRA_SPAN_DEG) / NAKSHATRA_SPAN_DEG;
  const pada = Math.floor(progress * 4) + 1;
  return {
    nakshatra: NAKSHATRAS[nakshatraIndex],
    progress,
    pada,
  };
}

/**
 * 全惑星位置を一括取得（Promise）
 */
async function getAllPlanetPositions(jd) {
  swisseph.swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
  const flags = swisseph.SEFLG_SIDEREAL | swisseph.SEFLG_SPEED;

  const planetList = [
    { key: 'sun',     num: swisseph.SE_SUN      },
    { key: 'moon',    num: swisseph.SE_MOON     },
    { key: 'mercury', num: swisseph.SE_MERCURY  },
    { key: 'venus',   num: swisseph.SE_VENUS    },
    { key: 'mars',    num: swisseph.SE_MARS     },
    { key: 'jupiter', num: swisseph.SE_JUPITER  },
    { key: 'saturn',  num: swisseph.SE_SATURN   },
    { key: 'rahu',    num: swisseph.SE_TRUE_NODE },
  ];

  const planets = {};

  await Promise.all(planetList.map(p =>
    new Promise(resolve => {
      swisseph.swe_calc_ut(jd, p.num, flags, (result) => {
        if (!result.error) {
          planets[p.key] = {
            longitude: result.longitude,
            speed: result.longitudeSpeed,
            isRetrograde: result.longitudeSpeed < 0,
          };
        }
        resolve();
      });
    })
  ));

  if (planets.rahu) {
    planets.ketu = {
      longitude: (planets.rahu.longitude + 180) % 360,
      speed: planets.rahu.speed,
      isRetrograde: true,
    };
  }

  return planets;
}

/**
 * ラグナ（アセンダント）を計算（Promise）
 */
function getLagna(jd, lat, lon) {
  return new Promise((resolve) => {
    swisseph.swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
    swisseph.swe_houses_ex(jd, swisseph.SEFLG_SIDEREAL, lat, lon, 'P', (result) => {
      if (result.error || !result.ascendant) {
        resolve(null);
      } else {
        resolve(result.ascendant);
      }
    });
  });
}

/**
 * 経度から星座を返す
 */
function getSign(longitude) {
  const SIGNS = [
    'Aries','Taurus','Gemini','Cancer',
    'Leo','Virgo','Libra','Scorpio',
    'Sagittarius','Capricorn','Aquarius','Pisces'
  ];
  const lon = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(lon / 30);
  return {
    sign: SIGNS[signIndex],
    signIndex,
    degrees: parseFloat((lon % 30).toFixed(4)),
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
