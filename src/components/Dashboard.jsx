import { useRef, useEffect, useMemo, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { Bot, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { AiPlannerModal } from './AiPlannerModal';
import { TrendingUp, Wallet, ArrowDownCircle } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export function Dashboard({
    mortgageData,
    educationData,
    baseLivingCost,
    incomeSchedule,
    taxDeductionData,
    assetData,
    investmentFlow,
    allowanceData,
    isPairLoan,
    childCount,
    // Configs
    loanAmount,
    bonusPrincipal,
    rates,
    expensesList,
    incomeConfig,
    assetsConfig
}) {
    const [showAi, setShowAi] = useState(false);


    const chartData = useMemo(() => {
        const labels = mortgageData.map(d => `${d.year}年目`);

        // Expenses
        const mortgageCosts = mortgageData.map(d => (d.annualPayment - (taxDeductionData?.[d.year - 1] || 0)) / 10000);
        const educationCosts = educationData.map(v => v / 10000);
        const livingCosts = incomeSchedule.map(() => (baseLivingCost * 12) / 10000);
        const investmentCosts = (investmentFlow || []).map(v => v / 10000);
        const taxCosts = (assetData?.fixedAssetHistory || []).map(v => v / 10000);

        // Income with Tax Deduction
        const totalIncomeLine = mortgageData.map((_, i) => {
            const scheduleIn = incomeSchedule[i]?.total || 0;
            const deduction = taxDeductionData[i] || 0;
            return (scheduleIn + deduction) / 10000;
        });

        return {
            labels,
            datasets: [
                {
                    type: 'line',
                    label: '手取り年収 + 控除',
                    data: totalIncomeLine,
                    borderColor: '#10b981',
                    borderWidth: 2,
                    pointRadius: 0,
                    borderDash: [5, 5],
                    order: 0
                },
                {
                    type: 'bar',
                    label: '住宅ローン(控除後)',
                    data: mortgageCosts,
                    backgroundColor: '#3b82f6',
                    stack: 'Stack 0',
                    order: 1
                },
                {
                    type: 'bar',
                    label: '固定資産税',
                    data: taxCosts,
                    backgroundColor: '#f97316',
                    stack: 'Stack 0',
                    order: 1
                },
                {
                    type: 'bar',
                    label: '教育費',
                    data: educationCosts,
                    backgroundColor: '#10b981',
                    stack: 'Stack 0',
                    order: 1
                },
                {
                    type: 'bar',
                    label: '基本生活費',
                    data: livingCosts,
                    backgroundColor: '#94a3b8',
                    stack: 'Stack 0',
                    order: 1
                },
                {
                    type: 'bar',
                    label: '積立投資',
                    data: investmentCosts,
                    backgroundColor: '#8b5cf6', // Violet
                    stack: 'Stack 0',
                    order: 1
                },
            ],
        };
    });

    const incomeChartData = useMemo(() => {
        const labels = mortgageData.map(d => `${d.year}年目`);
        // Breakdown: salary, bonus, business, pension, survivor(basic, welfare, widow), insurance, retirement
        const salary = incomeSchedule.map(d => (d.breakdown?.salary || 0) / 10000);
        const business = incomeSchedule.map(d => (d.breakdown?.business || 0) / 10000);
        const pension = incomeSchedule.map(d => (d.breakdown?.pension || 0) / 10000);
        const retirement = incomeSchedule.map(d => (d.breakdown?.retirement || 0) / 10000);
        const insurance = incomeSchedule.map(d => (d.breakdown?.insurance || 0) / 10000);
        const leaveBenefit = incomeSchedule.map(d => (d.breakdown?.leaveBenefit || 0) / 10000);

        // Survivor Components
        const survBasic = incomeSchedule.map(d => (d.breakdown?.survivor?.basic || 0) / 10000);
        const survWelfare = incomeSchedule.map(d => (d.breakdown?.survivor?.welfare || 0) / 10000);
        const survWidow = incomeSchedule.map(d => (d.breakdown?.survivor?.widow || 0) / 10000);

        return {
            labels,
            datasets: [
                { type: 'bar', label: '給与・賞与', data: salary, backgroundColor: '#10b981', stack: 'Income' },
                { type: 'bar', label: '育児休業給付金', data: leaveBenefit, backgroundColor: '#6ee7b7', stack: 'Income' },
                { type: 'bar', label: '副業', data: business, backgroundColor: '#059669', stack: 'Income' },
                { type: 'bar', label: '退職金', data: retirement, backgroundColor: '#fcd34d', stack: 'Income' },
                { type: 'bar', label: '老齢年金', data: pension, backgroundColor: '#3b82f6', stack: 'Income' },
                { type: 'bar', label: '遺族基礎年金', data: survBasic, backgroundColor: '#fca5a5', stack: 'Income' },
                { type: 'bar', label: '遺族厚生年金', data: survWelfare, backgroundColor: '#ef4444', stack: 'Income' },
                { type: 'bar', label: '中高齢寡婦加算', data: survWidow, backgroundColor: '#b91c1c', stack: 'Income' },
                { type: 'bar', label: '民間保険金', data: insurance, backgroundColor: '#f97316', stack: 'Income' },
            ]
        };
    }, [incomeSchedule, mortgageData]);

    const assetChartData = useMemo(() => {
        if (!assetData) return null;
        const labels = mortgageData.map(d => `${d.year}年目`);

        const cash = assetData.cashAssets.map(v => v / 10000);
        const investments = assetData.investmentAssets.map(v => v / 10000);
        // Total line not strictly needed if stacking, but good for reference.
        // Let's do Stacked Area for Cash / Investments

        return {
            labels,
            datasets: [
                {
                    type: 'line',
                    label: '現金資産',
                    data: cash,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)', // Blue fill
                    borderColor: '#3b82f6',
                    fill: true,
                    borderWidth: 1,
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    type: 'line',
                    label: '投資資産',
                    data: investments,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)', // Green fill
                    borderColor: '#10b981',
                    fill: true,
                    borderWidth: 1,
                    pointRadius: 0,
                    tension: 0.4
                }
            ]
        };
    }, [assetData, mortgageData]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: (context) => {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) label += Math.round(context.parsed.y) + '万円';
                        return label;
                    }
                }
            },
        },
        scales: {
            x: { grid: { display: false } },
            y: { stacked: true, grid: { color: '#f1f5f9' } },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    // Monthly breakdown for Year 1 (Sample)
    const monthlySample = useMemo(() => {
        const m = mortgageData[0];
        const monthlyLoan = m.monthlyPayment; // yen
        const bonusLoan = m.bonusPayment; // yen (paid twice)
        const monthlyLiving = baseLivingCost;

        return { monthlyLoan, bonusLoan, monthlyLiving };
    }, [mortgageData, baseLivingCost]);

    return (
        <div className="dashboard-container">
            <div className="summary-cards">
                {/* AI Button Section */}
                <div className="summary-card" style={{
                    cursor: 'pointer',
                    background: 'var(--color-primary-bg)',
                    border: '1px solid var(--color-primary)'
                }} onClick={() => setShowAi(true)}>
                    <div className="summary-icon" style={{ color: 'var(--color-primary)', margin: 0 }}><Bot /></div>
                    <div className="summary-content">
                        <h3>AI診断</h3>
                        <p className="summary-value" style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                            家計診断を実行
                        </p>
                        <p className="summary-sub">
                            フィードバックを確認
                        </p>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon"><Wallet /></div>
                    <div className="summary-content">
                        <h3>月々の支払 (1年目)</h3>
                        <p className="summary-value">
                            {Math.round((monthlySample.monthlyLoan + monthlySample.monthlyLiving) / 10000)}万円
                        </p>
                        <p className="summary-sub">
                            ローン: {(monthlySample.monthlyLoan / 10000).toFixed(1)}万 + 生活: {(monthlySample.monthlyLiving / 10000).toFixed(1)}万
                        </p>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon"><ArrowDownCircle /></div>
                    <div className="summary-content">
                        <h3>ボーナス月支払 (年2回)</h3>
                        <p className="summary-value">
                            +{(monthlySample.bonusLoan / 10000).toFixed(1)}万円
                        </p>
                        <p className="summary-sub">
                            ローン加算分
                        </p>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon"><CheckCircle /></div>
                    <div className="summary-content">
                        <h3>住宅ローン総返済額 (35年)</h3>
                        <p className="summary-value">
                            {Math.round(mortgageData.reduce((acc, curr) => acc + curr.annualPayment, 0) / 10000).toLocaleString()}万円
                        </p>
                        <p className="summary-sub">
                            元本 + 利息合計
                        </p>
                    </div>
                </div>
            </div>

            <div className="chart-wrapper">
                <h3>年間収支シミュレーション</h3>
                <div style={{ height: '300px' }}>
                    <Chart type='bar' options={options} data={chartData} />
                </div>
            </div>

            {assetChartData && (
                <div className="chart-wrapper">
                    <h3>資産推移シミュレーション</h3>
                    <div style={{ height: '300px' }}>
                        <Chart type='line' options={options} data={assetChartData} />
                    </div>
                </div>
            )}

            <div className="chart-wrapper">
                <h3>収入内訳 (給与・年金・保険)</h3>
                <div style={{ height: '300px' }}>
                    <Chart type='bar' options={options} data={incomeChartData} />
                </div>
            </div>

            {/* AI Feedback Modal */}
            {showAi && (
                <AiPlannerModal
                    onClose={() => setShowAi(false)}
                    simulationData={{
                        mortgage: {
                            totalLoan: mortgageData[0]?.remainingPrincipal + (mortgageData[0]?.principalPaid || 0),
                            months: mortgageData.length * 12,
                            isPairLoan: isPairLoan,
                            loanAmount: loanAmount,
                            bonusPrincipal: bonusPrincipal,
                            rates: rates
                        },
                        family: {
                            childCount: childCount
                        },
                        assets: {
                            initialSavings: assetData?.cashAssets[0] / 10000 || 0, // Approx
                            config: assetsConfig
                        },
                        expenses: {
                            list: expensesList,
                            baseMonthly: baseLivingCost
                        },
                        income: {
                            config: incomeConfig
                        },
                        analysis: {
                            hasNegativeCash: (assetData?.cashAssets || []).some(v => v < 0),
                            finalBalance: (assetData?.totalAssets || []).slice(-1)[0] || 0,
                            peakBalance: Math.max(...(assetData?.totalAssets || [0])),
                            minBalance: Math.min(...(assetData?.totalAssets || [0])),
                            totalIncome: (incomeSchedule || []).reduce((a, b) => a + (b.total || 0), 0),
                            totalExpense: (mortgageData || []).reduce((a, b) => a + b.annualPayment, 0) + (educationData || []).reduce((a, b) => a + b, 0) + (baseLivingCost * 12 * 35)
                        }
                    }}
                />
            )}
        </div>
    );
}
