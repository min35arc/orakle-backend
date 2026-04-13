require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { calculateFullDasha } = require('./dasha');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'The Oracle ✦ 魂の設計図' });
});

app.get('/api/test-dasha', async (req, res) => {
  try {
    const { year=1990, month=1, day=1, hour=12, minute=0, tz=9, lat, lon } = req.query;

    const birthData = {
      year: parseInt(year), month: parseInt(month), day: parseInt(day),
      hour: parseInt(hour), minute: parseInt(minute), tzOffset: parseFloat(tz),
      lat: lat !== undefined ? parseFloat(lat) : undefined,
      lon: lon !== undefined ? parseFloat(lon) : undefined,
    };

    const result = await calculateFullDasha(birthData);

    res.json({
      ok: true,
      moon: result.astro.moon,
      lagna: result.astro.lagna,   // ← 追加
      currentDasha: {
        maha:     result.currentDasha.current?.lordName      ?? null,
        antar:    result.currentDasha.currentAntar?.lordName ?? null,
        mahaEnd:  result.currentDasha.current?.endDate       ?? null,
        antarEnd: result.currentDasha.currentAntar?.endDate  ?? null,
      },
      summaryForAI: result.summaryForAI,
      allMahadashas: result.allMahadashas.map(m => ({
        lord: m.lordName, start: m.startDate, end: m.endDate, years: m.durationYears,
      })),
    });
  } catch (err) {
    console.error('dasha error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`The Oracle running on port ${PORT}`));
