/**
 * astro-interpreter.js
 * チャートデータを動的に解釈してプロンプト用テキストを生成
 * The Oracle ✦ 魂の設計図
 */

// 惑星の支配星座（ルーラーシップ）
const PLANET_RULERSHIPS = {
  sun:     [4],   // Leo (獅子座)
  moon:    [3],   // Cancer (蟹座)
  mercury: [2,5], // Gemini, Virgo
  venus:   [1,6], // Taurus, Libra
  mars:    [0,7], // Aries, Scorpio
  jupiter: [8,11],// Sagittarius, Pisces
  saturn:  [9,10],// Capricorn, Aquarius
  rahu:    [],
  ketu:    [],
};

const SIGN_NAMES_JP = [
  '牡羊座','牡牛座','双子座','蟹座','獅子座','乙女座',
  '天秤座','蠍座','射手座','山羊座','水瓶座','魚座'
];

const PLANET_NAMES_JP = {
  sun: '太陽', moon: '月', mercury: '水星', venus: '金星',
  mars: '火星', jupiter: '木星', saturn: '土星',
  rahu: 'ラーフ', ketu: 'ケートゥ',
};

const HOUSE_MEANINGS = {
  1:  '自己・外見・第一印象',
  2:  '収入・言葉・家族・資産',
  3:  '勇気・行動力・兄弟・短距離移動',
  4:  '家・母・精神的基盤・不動産',
  5:  '創造性・知性・恋愛・子供・自己表現',
  6:  '競争・労働・健康・敵に勝つ力',
  7:  'パートナーシップ・結婚・ビジネス関係',
  8:  '変容・隠れた力・突発的変化・神秘',
  9:  '運・哲学・高等教育・海外・精神的成長',
  10: 'キャリア・社会的地位・公的な行動',
  11: '利益・目標達成・友人・コミュニティ',
  12: '解放・海外・オンライン・潜在意識・孤独な作業',
};

const PLANET_NATURE = {
  sun:     { nature: '権威・自我・プライド', positive: 'リーダーシップ・自信', negative: '傲慢・承認欲求' },
  moon:    { nature: '感情・直感・適応力', positive: '共感力・柔軟性', negative: '感情の波・依存傾向' },
  mercury: { nature: '知性・分析・コミュニケーション', positive: '情報処理能力・言語力', negative: '優柔不断・神経過敏' },
  venus:   { nature: '美・調和・快楽・愛', positive: '審美眼・人を引き寄せる力', negative: '快楽主義・散財' },
  mars:    { nature: '行動力・意志・競争心', positive: '実行力・勇気', negative: '焦り・短気・衝動' },
  jupiter: { nature: '拡大・学習・幸運・知恵', positive: '成長・楽観性・チャンス', negative: '過剰・怠慢' },
  saturn:  { nature: '制限・試練・規律・時間', positive: '忍耐・着実な成果', negative: '遅延・孤独・恐怖' },
  rahu:    { nature: '執着・拡大・未知への欲求', positive: '革新・突破力', negative: '混乱・中毒・現実逃避' },
  ketu:    { nature: '解放・スピリチュアル・過去世の智慧', positive: '直感・悟り', negative: '無気力・分離感' },
};

const NAKSHATRA_PROFILES = {
  'Ashwini':           { keyword: '先駆者・スピード', trait: '行動が速く、最初に動くタイプ。医療・癒しとの縁', weakness: '飽きやすい・衝動的' },
  'Bharani':           { keyword: '創造と破壊', trait: '強烈な生命力。芸術や官能的なものへの感受性が高い', weakness: '自己中心的になりやすい' },
  'Krittika':          { keyword: '切断・純化', trait: '鋭い批判力と高い基準。完璧を求める', weakness: '攻撃的・人を傷つけやすい' },
  'Rohini':            { keyword: '豊かさ・創造力', trait: '美的センスと実用性を兼ね備える。物質的な豊かさを引き寄せる', weakness: '所有欲・嫉妬' },
  'Mrigashira':        { keyword: '探求・好奇心', trait: '常に新しいものを探している。知的で多才', weakness: '落ち着きがない・方向が定まらない' },
  'Ardra':             { keyword: '嵐・変革', trait: '激しい変化の中で力を発揮する。研究・分析能力が高い', weakness: '感情の嵐・壊したがる' },
  'Punarvasu':         { keyword: '再生・帰還', trait: '何度でも立て直せる回復力。楽観的で哲学的', weakness: '同じ過ちを繰り返す' },
  'Pushya':            { keyword: '養う・育てる', trait: '人を助け育てることに喜びを感じる。安定志向', weakness: '過保護・依存させやすい' },
  'Ashlesha':          { keyword: '洞察・蛇の智慧', trait: '人の本質を見抜く力。戦略的で粘り強い', weakness: '操作的・疑り深い' },
  'Magha':             { keyword: '王権・祖先', trait: '自然なカリスマ性。伝統と権威を重んじる', weakness: '傲慢・特権意識' },
  'Purva Phalguni':    { keyword: '享楽・創造的表現', trait: '人を楽しませる才能。芸術・エンタメとの縁', weakness: '快楽主義・怠惰' },
  'Uttara Phalguni':   { keyword: '支援・約束', trait: '人との深い絆を大切にする。責任感が強い', weakness: '頑固・自分を犠牲にしすぎる' },
  'Hasta':             { keyword: '手・技術', trait: '器用で実用的。手を使う仕事や細かい作業に長けている', weakness: '狡賢い・細かすぎる' },
  'Chitra':            { keyword: '輝き・建築', trait: '美的センスと完璧主義。デザイン・建築・装飾の才能', weakness: '見た目重視・虚栄心' },
  'Swati':             { keyword: '独立・風', trait: '自由と独立を何より重視。柔軟性と適応力', weakness: '優柔不断・孤立しやすい' },
  'Vishakha':          { keyword: '目標・二股', trait: '強烈な目標への執着。一度決めたら徹底的にやり遂げる', weakness: '人を踏み台にしやすい・焦燥感' },
  'Anuradha':          { keyword: '友情・献身', trait: '深い友情と集団への貢献。組織運営の才能', weakness: '友人関係への依存' },
  'Jyeshtha':          { keyword: '長老・保護', trait: '自然なリーダーシップ。困難な状況でこそ力を発揮する', weakness: '自己主張が強すぎる・嫉妬' },
  'Mula':              { keyword: '根・解体', trait: '物事の根本を掘り下げる。研究・哲学・神秘への強い引力', weakness: '破壊的傾向・極端' },
  'Purva Ashadha':     { keyword: '勝利・水の力', trait: '説得力と粘り強さ。一度始めたことを諦めない', weakness: '強引・頑固' },
  'Uttara Ashadha':    { keyword: '最終的勝利', trait: '長期的な視点と誠実さ。時間をかけて成功を掴む', weakness: '遅い・孤立しやすい' },
  'Shravana':          { keyword: '聴く・学ぶ・伝える', trait: '情報を吸収し整理する能力が異常に高い。単独作業向き。感情表現は不器用だが内面は豊か。「役に立つか」で物事を測る実用主義', weakness: '完璧主義で発信できない・一人で抱え込む・100点じゃないと出せない病' },
  'Dhanishtha':        { keyword: '富・音楽・団体', trait: '多才で社交的。音楽・リズム・集団活動に適性', weakness: '物質主義・人の物を欲しがる' },
  'Shatabhisha':       { keyword: '癒し・孤独な探求', trait: '独自の研究と秘密の知識。一人で深く掘り下げる', weakness: '孤立・秘密主義' },
  'Purva Bhadrapada':  { keyword: '二面性・浄化の炎', trait: '強烈な変革力。一度覚醒すると手が付けられない', weakness: '極端・不安定' },
  'Uttara Bhadrapada': { keyword: '深海・悟り', trait: '深い智慧と忍耐。ゆっくり確実に力をつける', weakness: '遅い・引きこもりがち' },
  'Revati':            { keyword: '旅の終わり・慈悲', trait: '共感力と奉仕の精神。芸術・音楽・旅との縁', weakness: '現実逃避・感傷的すぎる' },
};

const DASHA_LORD_MEANINGS = {
  KE: { jp: 'ケートゥ', nature: '解放・スピリチュアル・過去のカルマ清算', life: '物質から離れ、内向きになる。突然の喪失や断ち切り。精神的な目覚めが起きやすい' },
  VE: { jp: '金星', nature: '美・愛・快楽・芸術・人間関係', life: '恋愛・美的追求・快楽・クリエイティブな活動が活性化。人を引き寄せる力が高まる。散財リスクも増す' },
  SU: { jp: '太陽', nature: '権威・自我・キャリア・父親', life: '自己主張が強まる。権力者との関わり。承認欲求が前面に出る。政府・組織との接点' },
  MO: { jp: '月', nature: '感情・母親・大衆・変化', life: '感情の波が大きくなる。大衆との縁が強まる。引越し・変化が多い。母親や女性との関わりが増す' },
  MA: { jp: '火星', nature: '行動・競争・不動産・兄弟', life: '行動力が増す。競争に打ち勝てる時期。不動産取引のチャンス。衝動的になりやすいので注意' },
  RA: { jp: 'ラーフ', nature: '執着・拡大・混乱・外国・テクノロジー', life: '予想外の展開が多い。急激な変化。執着が強まる。外国や新しい分野との縁。既成概念を壊す' },
  JU: { jp: '木星', nature: '拡大・学習・知恵・精神的成長', life: '運気が上向く。学習・成長の機会が増える。精神的に安定する。長期的な繁栄の基盤を作る時期' },
  SA: { jp: '土星', nature: '制限・試練・規律・長期的な成果', life: '試練と制限の時期。焦りは禁物。地道な努力が実を結ぶ。健康に注意。因果関係が明確に現れる' },
  ME: { jp: '水星', nature: '知性・コミュニケーション・ビジネス', life: 'ビジネス・学習・コミュニケーションが活発になる。複数のことを同時進行しやすい。情報処理能力が高まる' },
};

/**
 * ホールサインハウスで各惑星の室を計算
 * @param {object} planets - 惑星位置データ
 * @param {object} lagna - ラグナデータ {sign, signIndex, degrees}
 * @returns {object} 惑星ごとのハウス番号
 */
function calculateHouses(planets, lagna) {
  if (!lagna) return {};
  const lagnaSignIndex = lagna.signIndex; // 0=牡羊座 〜 11=魚座

  const houses = {};
  for (const [key, data] of Object.entries(planets)) {
    const lon = ((data.longitude % 360) + 360) % 360;
    const planetSignIndex = Math.floor(lon / 30);
    const house = ((planetSignIndex - lagnaSignIndex + 12) % 12) + 1;
    houses[key] = house;
  }
  return houses;
}

/**
 * 惑星が自室かどうか判定
 */
function isOwnSign(planetKey, signIndex) {
  const rulerships = PLANET_RULERSHIPS[planetKey] || [];
  return rulerships.includes(signIndex);
}

/**
 * チャートデータから動的な解釈テキストを生成
 * reading.js のシステムプロンプトに埋め込む
 */
function buildChartInterpretation(astroData) {
  const { moon, lagna, planets } = astroData;
  if (!moon || !lagna || !planets) return '';

  const houses = calculateHouses(planets, lagna);
  const lines = [];

  // ─── ラグナ ───
  const lagnaSign = lagna.sign;
  const lagnaSignJP = SIGN_NAMES_JP[lagna.signIndex];
  lines.push(`【ラグナ（アセンダント）: ${lagnaSignJP}】`);
  lines.push(`この人の外見・性格の基本軸は${lagnaSignJP}です。`);

  // ─── ナクシャトラ ───
  const nk = NAKSHATRA_PROFILES[moon.nakshatra];
  lines.push(`\n【月のナクシャトラ: ${moon.nakshatra}（${moon.sign.sign} ${moon.sign.degrees.toFixed(1)}°）パーダ${moon.pada}】`);
  if (nk) {
    lines.push(`キーワード: ${nk.keyword}`);
    lines.push(`特質: ${nk.trait}`);
    lines.push(`弱点・盲点: ${nk.weakness}`);
  }

  // ─── 惑星ハウス配置 ───
  lines.push(`\n【惑星のハウス配置（ホールサイン）】`);
  
  const PLANET_ORDER = ['sun','moon','mercury','venus','mars','jupiter','saturn','rahu','ketu'];
  for (const key of PLANET_ORDER) {
    if (!planets[key]) continue;
    const house = houses[key];
    if (!house) continue;
    
    const lon = ((planets[key].longitude % 360) + 360) % 360;
    const signIdx = Math.floor(lon / 30);
    const signJP = SIGN_NAMES_JP[signIdx];
    const ownSign = isOwnSign(key, signIdx) ? '【自室・強い】' : '';
    const retro = planets[key].isRetrograde ? '【逆行】' : '';
    const pName = PLANET_NAMES_JP[key];
    const houseMeaning = HOUSE_MEANINGS[house] || '';
    const pNature = PLANET_NATURE[key];

    lines.push(`${pName}が${signJP}・${house}室${ownSign}${retro}: ${houseMeaning}の部屋にある。${pNature?.nature}をこの領域で発揮する。`);
  }

  // ─── 重要な配置をピックアップ ───
  lines.push(`\n【特に重要な配置（鑑定で必ず言及すること）】`);
  
  for (const key of PLANET_ORDER) {
    if (!planets[key]) continue;
    const house = houses[key];
    const lon = ((planets[key].longitude % 360) + 360) % 360;
    const signIdx = Math.floor(lon / 30);
    const ownSign = isOwnSign(key, signIdx);
    const pName = PLANET_NAMES_JP[key];
    const pNature = PLANET_NATURE[key];

    // 自室の惑星は特に強い
    if (ownSign) {
      lines.push(`★ ${pName}が${SIGN_NAMES_JP[signIdx]}（自室）${house}室: 非常に強い配置。${pNature?.positive}が${HOUSE_MEANINGS[house]}の領域で際立つ。`);
    }
    // ケンドラ（1,4,7,10室）にいる惑星
    if ([1,4,7,10].includes(house)) {
      lines.push(`◆ ${pName}が${house}室（ケンドラ）: 人生の基盤となる重要な配置。力が強く表れやすい。`);
    }
    // トリコーナ（1,5,9室）にいる惑星
    if ([5,9].includes(house)) {
      lines.push(`◆ ${pName}が${house}室（トリコーナ）: 幸運・才能・運命に関わる吉配置。`);
    }
  }

  return lines.join('\n');
}

/**
 * ダシャー情報の解釈テキストを生成
 */
function buildDashaInterpretation(currentDasha) {
  if (!currentDasha?.current) return '';
  
  const lines = [];
  const maha = currentDasha.current;
  const antar = currentDasha.currentAntar;
  const nextAntar = currentDasha.nextAntar;

  const mahaInfo = DASHA_LORD_MEANINGS[maha.lord];
  lines.push(`\n【現在のダシャー状況】`);
  
  if (mahaInfo) {
    const endDate = new Date(maha.endDate);
    const endStr = `${endDate.getFullYear()}年${endDate.getMonth()+1}月`;
    lines.push(`マハーダシャー: ${mahaInfo.jp}期（${endStr}まで残り${maha.remainingDays}日）`);
    lines.push(`この期間の性質: ${mahaInfo.life}`);
  }

  if (antar) {
    const antarInfo = DASHA_LORD_MEANINGS[antar.lord];
    if (antarInfo) {
      const antarEnd = new Date(antar.endDate);
      const antarEndStr = `${antarEnd.getFullYear()}年${antarEnd.getMonth()+1}月`;
      lines.push(`\nアンタルダシャー: ${antarInfo.jp}（${antarEndStr}まで残り${antar.remainingDays}日）`);
      lines.push(`この副期の性質: ${antarInfo.nature}`);
      lines.push(`具体的な影響: ${antarInfo.life}`);
    }
  }

  if (nextAntar) {
    const nextInfo = DASHA_LORD_MEANINGS[nextAntar.lord];
    if (nextInfo) {
      const nextStart = new Date(nextAntar.startDate);
      const nextStartStr = `${nextStart.getFullYear()}年${nextStart.getMonth()+1}月`;
      lines.push(`\n次のアンタル: ${nextInfo.jp}（${nextStartStr}〜）`);
      lines.push(`次の副期への変化: ${nextInfo.life}`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  buildChartInterpretation,
  buildDashaInterpretation,
  calculateHouses,
  NAKSHATRA_PROFILES,
  DASHA_LORD_MEANINGS,
  SIGN_NAMES_JP,
  PLANET_NAMES_JP,
};
