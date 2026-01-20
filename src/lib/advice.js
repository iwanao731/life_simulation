/**
 * AI Financial Planner Logic
 * Analyzes the simulation data and provides heuristic advice.
 */

export function analyzeSimulation(assetData, incomeSchedule, mortgageData) {
    const results = {
        score: 0, // 0-100
        status: 'safe', // safe, warning, danger
        title: '',
        messages: [],
    };

    if (!assetData || !assetData.totalAssets) return results;

    const { totalAssets, cashAssets, investmentAssets } = assetData;
    const years = totalAssets.length;
    const finalAsset = totalAssets[years - 1] / 10000; // Man-yen
    const minCash = Math.min(...cashAssets) / 10000; // Man-yen

    // 1. Bankruptcy Check (Cash Shortage)
    if (minCash < 0) {
        results.status = 'danger';
        results.score = 30;
        results.title = '資金ショートの危険性があります';

        // Find first year of negative cash
        const dangerIndex = cashAssets.findIndex(c => c < 0);
        const dangerYear = dangerIndex + 1;

        results.messages.push({
            type: 'danger',
            text: `${dangerYear}年目に現預金がマイナスになる予測です。支出の見直しや、積立額の調整が必要です。`
        });
    } else if (minCash < 100) {
        results.status = 'warning';
        results.score = 60;
        results.title = '予備資金が少なくなります';
        results.messages.push({
            type: 'warning',
            text: '現預金が100万円を切る時期があります。突発的な出費に備え、もう少し手元資金を残す計画を推奨します。'
        });
    } else {
        results.status = 'safe';
        results.score = 80;
        results.title = '安定した資金計画です';
        results.messages.push({
            type: 'success',
            text: 'シミュレーション期間を通じて、現預金が不足することはありません。'
        });
    }

    // 2. Retirement Asset Check (Old Age 20M Problem)
    // Assuming 35 years leads to approx retirement age (e.g. 60-65)
    if (finalAsset < 2000) {
        if (results.status === 'safe') {
            results.status = 'warning'; // Downgrade if safe
            results.score = Math.min(results.score, 70);
            results.title += ' (老後資金要確認)';
        }
        results.messages.push({
            type: 'warning',
            text: `35年後の総資産が${Math.round(finalAsset)}万円です。老後2000万円問題に対し、少し心許ない可能性があります。積立投資の増額や、長く働くことを検討してください。`
        });
    } else {
        results.score += 10;
        results.messages.push({
            type: 'success',
            text: `35年後には約${Math.round(finalAsset)}万円の資産が形成される見込みです。老後の備えとしては順調です。`
        });
    }

    // 3. Investment Ratio
    const finalInv = investmentAssets[years - 1] / 10000;
    const invRatio = finalInv / finalAsset;

    if (invRatio > 0.8) {
        results.messages.push({
            type: 'info',
            text: '資産の大部分が投資に回っています。市場暴落時のリスク許容度を確認してください。'
        });
    } else if (invRatio < 0.1 && minCash > 0) {
        results.messages.push({
            type: 'info',
            text: '現預金の比率が高いです。インフレリスクに備え、もう少し投資に回す余地があるかもしれません。'
        });
    }

    // Cap score
    results.score = Math.min(100, Math.max(0, results.score));

    return results;
}
