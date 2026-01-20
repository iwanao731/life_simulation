import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Generate financial advice using Gemini API
 * @param {string} apiKey - User's Gemini API Key
 * @param {object} simulationData - Consolidated simulation data
 * @returns {Promise<string>} Markdown advice
 */
export async function getFinancialAdvice(apiKey, simulationData) {
    if (!apiKey) throw new Error("API Key is required");

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Construct System + User Prompt
    // Construct Detailed Prompt
    const prompt = `
あなたはプロフェッショナルな日本のファイナンシャルプランナー(FP)です。
以下の詳細なライフプラン・家計シミュレーションデータを分析し、ユーザーに対して具体的で温かみのあるアドバイスを提供してください。
マークダウン形式で出力してください。

## 1. 基本情報
- 子供人数: ${simulationData.family.childCount}人
- 現在の貯蓄: ${(simulationData.assets.initialSavings || 0)}万円

## 2. 住宅ローン設定
- 借入総額: ${(simulationData.mortgage.loanAmount || 0)}万円
- ボーナス払い分: ${(simulationData.mortgage.bonusPrincipal || 0)}万円
- ペアローン: ${simulationData.mortgage.isPairLoan ? 'あり (共働き前提)' : 'なし'}
- 適用金利推移 (当初〜35年目): ${(simulationData.mortgage.rates || []).join('% -> ')}%

## 3. 家計・支出の状況
- 基本生活費(月額): ${(simulationData.expenses.baseMonthly || 0).toLocaleString()}円
- 費目別内訳:
${(simulationData.expenses.list || []).map(e => `  - ${e.name}: ${e.amount.toLocaleString()}円`).join('\n')}

## 4. 働き方・収入設定
- 共働きの有無: ${simulationData.mortgage.isPairLoan ? 'あり' : 'なし'}
- 妻(配偶者)の副業設定: ${(simulationData.income.config?.partner?.hasSideBusiness) ? `あり (年額 ${(simulationData.income.config.partner.sideBusiness.annual || 0)}万円)` : 'なし'}
- 妻(配偶者)の時短勤務: ${(simulationData.income.config?.partner?.hasJitan) ? 'あり (給与カット発生)' : 'なし'}
- 退職金(手取見込): 本人 ${(simulationData.income.config?.main?.retirementAllowance || 0)}万円 / 配偶者 ${(simulationData.income.config?.partner?.retirementAllowance || 0)}万円
- 年金(月額手取): 本人 ${(simulationData.income.config?.main?.pension?.monthly || 0)}万円(${(simulationData.income.config?.main?.pension?.startAge || 65)}歳〜) / 配偶者 ${(simulationData.income.config?.partner?.pension?.monthly || 0)}万円(${(simulationData.income.config?.partner?.pension?.startAge || 65)}歳〜)
- 想定昇給率(年率): 本人 ${(simulationData.income.config?.main?.salaryIncrease || 0)}% / 配偶者 ${(simulationData.income.config?.partner?.salaryIncrease || 0)}%

## 5. 資産運用 (NISA等)
- 設定状況:
${(simulationData.assets.config?.investments || []).map(inv => `  - ${inv.name}: 月額 ${inv.monthly}万円 (想定利回り ${inv.rate}%)`).join('\n')}

## 6. シミュレーション結果 (35年間)
- **破産リスク**: ${simulationData.analysis.hasNegativeCash ? '【警告】あり (途中で資金ショートする可能性が高い)' : 'なし (概ね黒字で推移)'}
- 最終資産残高: ${(simulationData.analysis.finalBalance / 10000).toFixed(1)}万円 (現金 + 投資)
- 資産ピーク: ${(simulationData.analysis.peakBalance / 10000).toFixed(1)}万円
- 生涯総収入: ${(simulationData.analysis.totalIncome / 10000).toFixed(1)}万円
- 生涯総支出: ${(simulationData.analysis.totalExpense / 10000).toFixed(1)}万円

## 指示
1. **総評 (判定)**: 家計の健全度をS/A/B/C/Dで評価し、その理由を一言で。
2. **良い点**: このプランの具体的な強みを2点（例：NISAの積立効果、副業による収入増など）。
3. **リスクと課題**: 具体的な懸念点を2点（例：金利上昇時のローン負担増、特定費目の支出過多など）。現在の金利設定（${(simulationData.mortgage.rates || [])[Math.floor(((simulationData.mortgage.rates || []).length - 1) / 2)]}% 付近）を踏まえてコメントしてください。
4. **改善アドバイス**: 
   - 住宅ローン: 変動金利のリスク許容度について
   - 家計全般: 固定費（${(simulationData.expenses.list || [])[0]?.name}など）の見直し余地
   - 資産運用: 現在の積立額での十分性
   これらを踏まえた具体的なアクションを3つ提案してください。

語り口は丁寧ですが、破産リスクがある場合ははっきりと警告してください。
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error("AI診断の生成に失敗しました。APIキーを確認するか、しばらく待ってから再試行してください。");
    }
}
