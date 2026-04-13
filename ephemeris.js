/**
 * ephemeris.js - swisseph ラッパー
 * The Oracle ✦ 魂の設計図
 */

const swisseph = require('swisseph');
const { NAKSHATRAS, NAKSHATRA_SPAN_DEG } = require('./constants');

const SE_SIDM_LAHIRI = 1;

function dateToJD(date) {
  return swisseph.swe_julday(
    date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600,
    swisseph.SE_GREG_CAL
  );
}

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

function getMoonNakshatra(moonSidLon) {
  const lon = ((moonSidLon % 360) + 360) % 360;
  const nakshatraIndex = Math.floor(lon / NAKSHATRA_SPAN_DEG);
  const progress = (lon % NAKSHATRA_SPAN_DEG) / NAKSHATRA_SPAN_DEG;
  const pada = Math.floor(progress * 4) + 1;
  return { nakshatra: NAKSHATRAS[nakshatraIndex], progress, pada };
}

async function getAllPlanetPositions(jd) {
  swisseph.swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
  const flags = swisseph.SEFLG_SIDEREAL | swisseph.SEFLG_SPEED;
  const planetList = [
    { key: 'sun',     num: swisseph.SE_SUN       },
    { key: 'moon',    num: swisseph.SE_MOON      },
    { key: 'mercury', num: swisseph.SE_MERCURY   },
    { key: 'venus',   num: swisseph.SE_VENUS     },
    { key: 'mars',    num: swisseph.SE_MARS      },
    { key: 'jupiter', num: swisseph.SE_JUPITER   },
    { key: 'saturn',  num: swisseph.SE_SATURN    },
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
 * ラグナ計算
 * トロピカルでハウス計算 → アヤナームシャを引いてシデリアルに変換
 * swe_houses の正しいシグネチャ: (tjd_ut, geolat, geolon, hsys) - iflagなし
 */
function getLagna(jd, lat, lon) {
  try {
    swisseph.swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
    const ayanamsa = swisseph.swe_get_ayanamsa_ut(jd);

    // iflag引数なし版（正しいシグネチャ）
    const result = swisseph.swe_houses(jd, lat, lon, 'P');

    console.log('[getLagna] raw result:', JSON.stringify(result));
    console.log('[getLagna] ayanamsa:', ayanamsa);

    if (!result || result.error) {
      console.error('[getLagna] error in result:', result?.error);
      return Promise.resolve(null);
    }

    // ascendant が直接あるか、house配列の[0]にあるか両方試す
    const tropicalAsc = result.ascendant !== undefined
      ? result.ascendant
      : (result.house && result.house[0] !== undefined ? result.house[0] : null);

    if (tropicalAsc === null) {
      console.error('[getLagna] ascendant not found in result');
      return Promise.resolve(null);
    }

    const sidLagna = ((tropicalAsc - ayanamsa) % 360 + 360) % 360;
    console.log('[getLagna] tropical asc:', tropicalAsc, '→ sidereal lagna:', sidLagna);
    return Promise.resolve(sidLagna);

  } catch (e) {
    console.error('[getLagna] exception:', e.message);
    return Promise.resolve(null);
  }
}

/**
 * デバッグ用: swe_houses の生の戻り値を返す
 */
function debugHouses(jd, lat, lon) {
  try {
    swisseph.swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
    const ayanamsa = swisseph.swe_get_ayanamsa_ut(jd);

    const r1 = (() => { try { return swisseph.swe_houses(jd, lat, lon, 'P'); } catch(e) { return { error: e.message }; } })();
    const r2 = (() => { try { return swisseph.swe_houses_ex(jd, 0, lat, lon, 'P'); } catch(e) { return { error: e.message }; } })();
    const r3 = (() => { try { return swisseph.swe_houses_ex(jd, swisseph.SEFLG_SIDEREAL, lat, lon, 'P'); } catch(e) { return { error: e.message }; } })();

    return { ayanamsa, swe_houses: r1, swe_houses_ex_0: r2, swe_houses_ex_sidereal: r3 };
  } catch (e) {
    return { error: e.message };
  }
}

function getSign(longitude) {
  const SIGNS = [
    'Aries','Taurus','Gemini','Cancer',
    'Leo','Virgo','Libra','Scorpio',
    'Sagittarius','Capricorn','Aquarius','Pisces'
  ];
  const lon = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(lon / 30);
  return { sign: SIGNS[signIndex], signIndex, degrees: parseFloat((lon % 30).toFixed(4)) };
}

module.exports = {
  dateToJD, getSiderealLongitude, getMoonNakshatra,
  getAllPlanetPositions, getLagna, getSign, debugHouses,
};
