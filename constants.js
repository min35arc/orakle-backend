/**
 * constants.js
 * インド占星術 ヴィムショッタリー・ダシャー計算用定数
 * The Oracle ✦ 魂の設計図
 */

// ヴィムショッタリー・ダシャー 主星と年数（合計120年）
const DASHA_LORDS = [
  { id: 'KE', name: 'Ketu',    years: 7  },
  { id: 'VE', name: 'Venus',   years: 20 },
  { id: 'SU', name: 'Sun',     years: 6  },
  { id: 'MO', name: 'Moon',    years: 10 },
  { id: 'MA', name: 'Mars',    years: 7  },
  { id: 'RA', name: 'Rahu',    years: 18 },
  { id: 'JU', name: 'Jupiter', years: 16 },
  { id: 'SA', name: 'Saturn',  years: 19 },
  { id: 'ME', name: 'Mercury', years: 17 },
];
const DASHA_TOTAL_YEARS = 120;

// 27 ナクシャトラ（各13°20' = 13.333...°）
// 各ナクシャトラに対応するダシャー主星（0-indexed → DASHA_LORDS index）
const NAKSHATRAS = [
  { index: 0,  name: 'Ashwini',           lord: 0 }, // Ketu
  { index: 1,  name: 'Bharani',           lord: 1 }, // Venus
  { index: 2,  name: 'Krittika',          lord: 2 }, // Sun
  { index: 3,  name: 'Rohini',            lord: 3 }, // Moon
  { index: 4,  name: 'Mrigashira',        lord: 4 }, // Mars
  { index: 5,  name: 'Ardra',             lord: 5 }, // Rahu
  { index: 6,  name: 'Punarvasu',         lord: 6 }, // Jupiter
  { index: 7,  name: 'Pushya',            lord: 7 }, // Saturn
  { index: 8,  name: 'Ashlesha',          lord: 8 }, // Mercury
  { index: 9,  name: 'Magha',             lord: 0 }, // Ketu
  { index: 10, name: 'Purva Phalguni',    lord: 1 }, // Venus
  { index: 11, name: 'Uttara Phalguni',   lord: 2 }, // Sun
  { index: 12, name: 'Hasta',             lord: 3 }, // Moon
  { index: 13, name: 'Chitra',            lord: 4 }, // Mars
  { index: 14, name: 'Swati',             lord: 5 }, // Rahu
  { index: 15, name: 'Vishakha',          lord: 6 }, // Jupiter
  { index: 16, name: 'Anuradha',          lord: 7 }, // Saturn
  { index: 17, name: 'Jyeshtha',          lord: 8 }, // Mercury
  { index: 18, name: 'Mula',              lord: 0 }, // Ketu
  { index: 19, name: 'Purva Ashadha',     lord: 1 }, // Venus
  { index: 20, name: 'Uttara Ashadha',    lord: 2 }, // Sun
  { index: 21, name: 'Shravana',          lord: 3 }, // Moon
  { index: 22, name: 'Dhanishtha',        lord: 4 }, // Mars
  { index: 23, name: 'Shatabhisha',       lord: 5 }, // Rahu
  { index: 24, name: 'Purva Bhadrapada',  lord: 6 }, // Jupiter
  { index: 25, name: 'Uttara Bhadrapada', lord: 7 }, // Saturn
  { index: 26, name: 'Revati',            lord: 8 }, // Mercury
];

const NAKSHATRA_SPAN_DEG = 360 / 27; // 13.333...°

// swisseph 惑星番号
const SE_PLANETS = {
  SUN:     0,
  MOON:    1,
  MERCURY: 2,
  VENUS:   3,
  MARS:    4,
  JUPITER: 5,
  SATURN:  6,
  // Rahu/Ketu = 月の交点
  TRUE_NODE: 11, // Rahu（真の交点）
};

// ラーヒリ アヤナームシャ（最もポピュラーなシデリアル基準）
const SE_SIDM_LAHIRI = 1;

// 鑑定文用：ブランド名（インド占星術とは出さない）
const BRAND = {
  dasha: '時の波動（ダイナミクス）',
  antardasha: '内なる波動',
  nakshatra: '魂の星座',
};

module.exports = {
  DASHA_LORDS,
  DASHA_TOTAL_YEARS,
  NAKSHATRAS,
  NAKSHATRA_SPAN_DEG,
  SE_PLANETS,
  SE_SIDM_LAHIRI,
  BRAND,
};
