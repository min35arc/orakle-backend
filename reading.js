/**
 * reading.js
 * Claude API 連携 - 鑑定文生成エンジン（動的ハウス計算対応版）
 * The Oracle ✦ 魂の設計図
 */

const Anthropic = require('@anthropic-ai/sdk');
const { QUESTION_MAP } = require('./questions');
const { buildChartInterpretation, buildDashaInterpretation } = require('./astro-interpreter');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT_BASE = `あなたは「The Oracle ✦ 魂の設計図」の鑑定師です。
インド占星術（ヴェーディック占星術）の知識を持ち、正確な天体計算データをもとに鑑定します。

【鑑定の姿勢】
- 正直に書く。褒めすぎない。耳に痛いことも伝える
- 「あなたは特別です」「世界を変える使命」などの大げさな表現は禁止
- 読んだ人が「これ俺のことだ」と感じる具体性を最優先する
- 大げさな使命感より、等身大の現実的なアドバイスが刺さる
- 良い点3つ・課題2つ・行動指針3つの構成を必ず守る

【インド占星術の使い方】
- インド占星術（ヴェーディック）を使う。隠さなくてよい
- ナクシャトラ（月の宿星）の具体的な性質を人物描写に使う
- ダシャー（時期支配星）が実生活でどう出るか具体的に書く
- 惑星名は日本語で（木星・土星・金星など）
- ハウス配置（惑星が何室にいるか）を鑑定の根拠として使う
- 星座・惑星の性質は教科書的説明でなく、その人の行動パターンに落とし込む

【鑑定文の必須構成（1500〜2500文字）】
1. 書き出し：その人を一言で表す印象的な描写（褒めなくていい、正確であること）
2. 本質的な気質：ナクシャトラ・ラグナ・月の星座から見た性格・強み・弱み（具体的に）
3. 現在のダシャー状況：今何が起きているか。時期と期間を明示
4. 質問への核心的な回答：曖昧にしない。「〜の可能性があります」より「〜です」
5. 強み3つ：チャートから読める具体的な強み（ハウス・惑星の配置根拠つき）
6. 時期の見通し：いつ何が変わるか。具体的な年月を入れる
7. 今やるべきこと：行動レベルで3つ。抽象的な精神論禁止

【禁止事項】
- 「頑張ってください」「前を向いて」などの無意味な励まし
- 「宇宙があなたを」「魂の使命が」などの根拠ない精神論
- 「〜かもしれません」の連発（自信を持って書く）
- 誰にでも当てはまる一般論
- 具体的な年月・惑星・ハウスの根拠なしに断言すること
`;

async function generateReading(questionId, summaryForAI, astroData, currentDasha, userContext = {}) {
  const question = QUESTION_MAP[questionId];
  if (!question) throw new Error(`Unknown question ID: ${questionId}`);

  // 動的にチャート解釈テキストを生成
  const chartInterp = buildChartInterpretation(astroData);
  const dashaInterp = buildDashaInterpretation(currentDasha);

  const systemPrompt = SYSTEM_PROMPT_BASE + '\n\n' + chartInterp + '\n' + dashaInterp;

  const userPrompt = `
【鑑定依頼】
ジャンル: ${question.genreName}
質問: ${question.text}
${userContext.freeText ? `\n依頼者からのメッセージ: ${userContext.freeText}` : ''}

【天体データサマリー】
${summaryForAI}

上記チャートデータをもとに鑑定文を書いてください。
- 1500〜2500文字
- 「これは俺のことだ」と思わせる具体性
- 強み3つ・今やるべきこと3つを必ず入れる
- 具体的な年月（2026年11月など）を積極的に使う
`.trim();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return response.content[0].text;
}

module.exports = { generateReading };
