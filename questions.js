/**
 * questions.js
 * The Oracle ✦ 魂の設計図 - 45商品の質問定義
 * 
 * 15ジャンル × 3質問 = 45商品 @ 各980円
 * 最大客単価 44,100円
 */

const GENRES = [
  {
    id: 'love',
    name: '恋愛・パートナーシップ',
    icon: '💫',
    questions: [
      { id: 'love_1', text: '今の私の恋愛運はどうなっていますか？出会いや縁について教えてください。' },
      { id: 'love_2', text: '現在のパートナー（または気になる人）との関係性と今後の展開を教えてください。' },
      { id: 'love_3', text: '私が真の愛を引き寄せるために、今何をすべきですか？' },
    ],
  },
  {
    id: 'career',
    name: '仕事・キャリア',
    icon: '⚡',
    questions: [
      { id: 'career_1', text: '今の仕事運と、キャリアの方向性について教えてください。' },
      { id: 'career_2', text: '転職・独立・起業のタイミングと可能性について教えてください。' },
      { id: 'career_3', text: '私の才能と天職は何ですか？どの分野で輝けますか？' },
    ],
  },
  {
    id: 'money',
    name: '金運・財運',
    icon: '✨',
    questions: [
      { id: 'money_1', text: '今の金運と、お金の流れについて教えてください。' },
      { id: 'money_2', text: '投資・副業・新しい収入源の可能性について教えてください。' },
      { id: 'money_3', text: '私が豊かさを手にするために、乗り越えるべき課題は何ですか？' },
    ],
  },
  {
    id: 'destiny',
    name: '運命・使命',
    icon: '🌟',
    questions: [
      { id: 'destiny_1', text: '私がこの世に生まれてきた使命と目的を教えてください。' },
      { id: 'destiny_2', text: '私の魂が今世で学ぶべきテーマと課題は何ですか？' },
      { id: 'destiny_3', text: '私の人生の転換点はいつ頃訪れますか？' },
    ],
  },
  {
    id: 'timing',
    name: '時期・タイミング',
    icon: '⏳',
    questions: [
      { id: 'timing_1', text: '今から1年間の運気の流れと、重要な時期を教えてください。' },
      { id: 'timing_2', text: '今が「動く時期」と「待つ時期」のどちらですか？何に集中すべきですか？' },
      { id: 'timing_3', text: '今後3〜5年の大きな流れと、人生の節目について教えてください。' },
    ],
  },
  {
    id: 'health',
    name: '健康・生命力',
    icon: '🌿',
    questions: [
      { id: 'health_1', text: '私の心身の状態と、注意すべき健康面について教えてください。' },
      { id: 'health_2', text: '今の私のエネルギー状態と、活力を高めるためのアドバイスをください。' },
      { id: 'health_3', text: '心の平和と精神的な安定を得るために、何が必要ですか？' },
    ],
  },
  {
    id: 'human',
    name: '人間関係',
    icon: '🤝',
    questions: [
      { id: 'human_1', text: '私の対人運と、重要な人間関係について教えてください。' },
      { id: 'human_2', text: '私の周囲にいる人との関係性で、特に注目すべきことは何ですか？' },
      { id: 'human_3', text: '私の人生を豊かにする人間関係を築くためのアドバイスをください。' },
    ],
  },
  {
    id: 'family',
    name: '家族・家庭',
    icon: '🏠',
    questions: [
      { id: 'family_1', text: '家族との関係性と、家庭運について教えてください。' },
      { id: 'family_2', text: '結婚・出産・家族計画のタイミングと可能性について教えてください。' },
      { id: 'family_3', text: '家族との間にある課題と、その解決の糸口を教えてください。' },
    ],
  },
  {
    id: 'talent',
    name: '才能・創造性',
    icon: '🎨',
    questions: [
      { id: 'talent_1', text: '私が生まれ持った才能と、それを活かす方法を教えてください。' },
      { id: 'talent_2', text: '創造的な活動や表現において、今の私に必要なことは何ですか？' },
      { id: 'talent_3', text: '私が最も輝ける表現の場と、それを見つけるためのヒントをください。' },
    ],
  },
  {
    id: 'spiritual',
    name: '精神・スピリチュアル',
    icon: '🔮',
    questions: [
      { id: 'spiritual_1', text: '私の霊的な成長段階と、今取り組むべき内面の課題を教えてください。' },
      { id: 'spiritual_2', text: '私の直感やサイキック能力について、どう活かすべきですか？' },
      { id: 'spiritual_3', text: '宇宙からのメッセージとして、今の私に伝えたいことは何ですか？' },
    ],
  },
  {
    id: 'past',
    name: '過去・カルマ',
    icon: '🌊',
    questions: [
      { id: 'past_1', text: '私が持つカルマとは何ですか？今世でどう解消できますか？' },
      { id: 'past_2', text: '過去の経験が今の私にどう影響していますか？解放すべきものは？' },
      { id: 'past_3', text: '私の魂の系譜と、前世からの影響について教えてください。' },
    ],
  },
  {
    id: 'decision',
    name: '決断・選択',
    icon: '⚖️',
    questions: [
      { id: 'decision_1', text: '今、私の人生の岐路に立っています。どちらの道を選ぶべきですか？' },
      { id: 'decision_2', text: '大きな決断を前に迷っています。今の星の配置から見てどうすべきですか？' },
      { id: 'decision_3', text: '私が後悔しない選択をするために、今最も大切にすべき価値観は何ですか？' },
    ],
  },
  {
    id: 'obstacle',
    name: '障害・試練',
    icon: '🔥',
    questions: [
      { id: 'obstacle_1', text: '今、私の前に立ちはだかる障害の本質と、乗り越え方を教えてください。' },
      { id: 'obstacle_2', text: '繰り返し起きるパターンや問題の根本原因と解決策を教えてください。' },
      { id: 'obstacle_3', text: 'この試練は私にとってどんな意味を持ち、どう活かせますか？' },
    ],
  },
  {
    id: 'success',
    name: '成功・目標達成',
    icon: '🏆',
    questions: [
      { id: 'success_1', text: '私が目標を達成するために、今最も重要なアクションは何ですか？' },
      { id: 'success_2', text: '成功を引き寄せるために、手放すべきものと取り込むべきものを教えてください。' },
      { id: 'success_3', text: '私が描くビジョンを現実化する可能性と、そのための道筋を教えてください。' },
    ],
  },
  {
    id: 'selfknowledge',
    name: '自己理解・本質',
    icon: '🪞',
    questions: [
      { id: 'selfknowledge_1', text: '私の本質的な性格と、真の強みは何ですか？' },
      { id: 'selfknowledge_2', text: '私が気づいていない自分の側面（シャドウ）と、その統合方法を教えてください。' },
      { id: 'selfknowledge_3', text: '私の魂の本当の望みと、今の自分の姿のギャップを教えてください。' },
    ],
  },
];

// 全45商品をフラットなマップにする
const QUESTION_MAP = {};
for (const genre of GENRES) {
  for (const q of genre.questions) {
    QUESTION_MAP[q.id] = { ...q, genreId: genre.id, genreName: genre.name };
  }
}

module.exports = { GENRES, QUESTION_MAP };
