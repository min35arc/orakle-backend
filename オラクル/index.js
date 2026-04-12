/**
 * index.js
 * The Oracle ✦ 魂の設計図 - Express サーバー
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { calculateFullDasha } = require('./src/astro/dasha');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ヘルスチェック
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'The Oracle ✦ 魂の設計図' });
});

// ダシャー計算テストエンドポイント
// GET /api/test-dasha?year=1990&month=1&day=1&hour=12&minute=0&tz=9
app.get('/api/test-dasha', (req, res) => {
  try {
    const {
      year   = 1990,
      month  = 1,
      day    = 1,
      hour   = 12,
      minute = 0,
      tz     = 9,
    } = req.query;

    const birthData = {
      year:     parseInt(year),
      month:    parseInt(month),
      day:      parseInt(day),
      hour:     parseInt(hour),
      minute:   parseInt(minute),
      tzOffset: parseFloat(tz),
    };

    const result = calculateFullDasha(birthData);

    res.json({
      ok: true,
      moon: result.astro.moon,
      currentDasha: {
        maha:  result.currentDasha.current  ? result.currentDasha.current.lordName  : null,
        antar: result.currentDasha.currentAntar ? result.currentDasha.currentAntar.lordName : null,
        mahaEnd:  result.currentDasha.current  ? result.currentDasha.current.endDate  : null,
        antarEnd: result.currentDasha.currentAntar ? result.currentDasha.currentAntar.endDate : null,
      },
      summaryForAI: result.summaryForAI,
      allMahadashas: result.allMahadashas.map(m => ({
        lord: m.lordName,
        start: m.startDate,
        end: m.endDate,
        years: m.durationYears,
      })),
    });

  } catch (err) {
    console.error('dasha error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`The Oracle running on port ${PORT}`);
});
