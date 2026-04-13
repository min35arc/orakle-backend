require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { calculateFullDasha } = require('./dasha');
const { generateReading }    = require('./reading');
const { GENRES }             = require('./questions');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── ヘルスチェック ───────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'The Oracle ✦ 魂の設計図' });
});

// ─── 商品一覧（フロント用） ───────────────────────────────
app.get('/api/questions', (req, res) => {
  res.json({ genres: GENRES });
});

// ─── ダシャー計算 ─────────────────────────────────────────
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
      moon:    result.astro.moon,
      lagna:   result.astro.lagna,
      planets: result.astro.planets,
      currentDasha: {
        maha:               result.currentDasha.current?.lordName       ?? null,
        antar:              result.currentDasha.currentAntar?.lordName  ?? null,
        mahaEnd:            result.currentDasha.current?.endDate        ?? null,
        antarEnd:           result.currentDasha.currentAntar?.endDate   ?? null,
        remainingMahaDays:  result.currentDasha.current?.remainingDays  ?? null,
        remainingAntarDays: result.currentDasha.currentAntar?.remainingDays ?? null,
        nextAntar:          result.currentDasha.nextAntar?.lordName     ?? null,
        nextAntarStart:     result.currentDasha.nextAntar?.startDate    ?? null,
      },
      upcoming:      result.upcoming,
      allMahadashas: result.allMahadashas.map(m => ({
        lord: m.lordName, start: m.startDate, end: m.endDate, years: m.durationYears,
      })),
      summaryForAI: result.summaryForAI,
    });
  } catch (err) {
    console.error('dasha error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── 鑑定文生成（メインAPI） ──────────────────────────────
/**
 * POST /api/reading
 * Body: {
 *   birthData: { year, month, day, hour, minute, tzOffset, lat?, lon? },
 *   questionId: 'love_1',
 *   freeText?: '追加メッセージ'
 * }
 */
app.post('/api/reading', async (req, res) => {
  try {
    const { birthData, questionId, freeText } = req.body;

    if (!birthData || !questionId) {
      return res.status(400).json({ ok: false, error: 'birthData と questionId は必須です' });
    }

    // Step 1: 天体計算
    const dashaResult = await calculateFullDasha(birthData);

    // Step 2: Claude API で鑑定文生成
    const readingText = await generateReading(
      questionId,
      dashaResult.summaryForAI,
      { freeText }
    );

    res.json({
      ok: true,
      questionId,
      reading: readingText,
      // フロントで表示用に使えるデータも返す
      astroSummary: {
        moon:  dashaResult.astro.moon,
        lagna: dashaResult.astro.lagna,
        currentDasha: {
          maha:  dashaResult.currentDasha.current?.lordName     ?? null,
          antar: dashaResult.currentDasha.currentAntar?.lordName ?? null,
          mahaEnd: dashaResult.currentDasha.current?.endDate    ?? null,
        },
      },
    });

  } catch (err) {
    console.error('reading error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`The Oracle running on port ${PORT}`));
