import React, { useEffect } from 'react';
import { CreditCard, TrendingUp, DollarSign, Wallet, Plus, X } from 'lucide-react';
import { estimateNetIncome, calculatePensionEstimate } from '../lib/simulation';

export function MortgageForm({
  amount, setAmount,
  bonusPrincipal, setBonusPrincipal,
  rates, setRates,
  hasDeduction, setHasDeduction,
  property, setProperty,
  initialExpenses, setInitialExpenses,
  isPairLoan, pairLoanConfig, setPairLoanConfig
}) {
  const handleRateChange = (index, value) => {
    const newRates = [...rates];
    newRates[index] = Number(value);
    setRates(newRates);
  };

  const handlePairSplitChange = (field, value) => {
    // If we update Main, we assume Partner takes the rest of TOTAL
    // If we update BonusMain, Partner takes rest of Bonus
    if (!setPairLoanConfig) return;

    const val = Number(value);
    setPairLoanConfig(prev => {
      const newConfig = { ...prev, [field]: val };
      // Auto-balance
      if (field === 'main') {
        newConfig.partner = Math.max(0, amount - val);
      }
      if (field === 'bonusMain') {
        newConfig.bonusPartner = Math.max(0, bonusPrincipal - val);
      }
      return newConfig;
    });
  };

  // Sync effect: If Total Amount changes, keep ratio or just re-calc partner?
  // Simple: Re-calc partner based on fixed main.
  // Warning: This needs to be done in parent or here?
  // Let's do a simple render-time calc or effect?
  // Better: Just relying on the inputs to trigger updates. 
  // If user changes Total `amount`, we should probably update `pairLoanConfig` in App?
  // For now, let's assume user sets Total first, then Split. 
  // We can add a "Update Partner" button or just let the effect in change handle it.

  // Actually, to keep it sync, we should update partner if amount changes?
  // Let's rely on the user to adjust split if they change total.
  // Or better: In the render, if isPairLoan, show inputs.

  const addInitialExpense = () => {
    setInitialExpenses([...(initialExpenses || []), { id: Date.now(), name: '', amount: 0 }]);
  };

  const removeInitialExpense = (id) => {
    setInitialExpenses((initialExpenses || []).filter(e => e.id !== id));
  };

  const updateInitialExpense = (id, field, value) => {
    setInitialExpenses((initialExpenses || []).map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const totalInitialCost = (initialExpenses || []).reduce((sum, e) => sum + e.amount, 0);

  // Auto-calculate Brokerage Fee
  useEffect(() => {
    const land = property?.landPrice || 0;
    const building = property?.buildingPrice || 0;
    const price = land + building;

    if (price <= 0) return;

    // Formula: (Price * 3% + 60,000yen) * Tax
    // Units are in Man-yen. 60,000yen = 6 man-yen.
    const fee = ((price * 0.03) + 6) * 1.1;
    const feeRounded = Math.round(fee * 10) / 10; // Round to 1 decimal

    setInitialExpenses(prev => {
      const current = prev || [];
      const index = current.findIndex(e => e.name === '仲介手数料');

      if (index >= 0) {
        // Only update if value matches "close enough" to avoid overwrite loop? 
        // Or strictly update? User asked for "default". 
        // If we strictly update, user can't edit it unless they change name.
        // Let's check if the amount is already same.
        if (Math.abs(current[index].amount - feeRounded) < 0.1) return prev;

        const next = [...current];
        next[index] = { ...next[index], amount: feeRounded };
        return next;
      } else {
        // Create new entry
        return [...current, { id: Date.now(), name: '仲介手数料', amount: feeRounded }];
      }
    });
  }, [property?.landPrice, property?.buildingPrice, setInitialExpenses]);

  const periods = [
    '1-5年', '6-10年', '11-15年', '16-20年', '21-25年', '26-30年', '31-35年'
  ];

  return (
    <div className="card">
      <div className="card-header">
        <CreditCard className="icon" />
        <h2>住宅ローン設定</h2>
      </div>

      {/* Property & Tax Settings (Moved to Top) */}
      <div className="section-group" style={{ marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#334155', fontWeight: 'bold' }}>物件・固定資産税 詳細設定</h3>

        {/* Building Type Selector (New) */}
        <div style={{ marginBottom: '1rem', background: '#ecfdf5', padding: '0.75rem', borderRadius: '6px', border: '1px solid #10b981' }}>
          <label className="lbl-xs" style={{ fontWeight: 'bold', color: '#064e3b', marginBottom: '0.5rem', display: 'block' }}>住宅性能 (ローン控除・税額判定用)</label>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="radio" name="bType"
                checked={property?.buildingType === 'general' || !property?.buildingType}
                onChange={() => setProperty(prev => ({ ...prev, buildingType: 'general' }))}
              /> 一般住宅
            </label>
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="radio" name="bType"
                checked={property?.buildingType === 'zeh'}
                onChange={() => setProperty(prev => ({ ...prev, buildingType: 'zeh' }))}
              /> ZEH水準・省エネ
            </label>
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="radio" name="bType"
                checked={property?.buildingType === 'longterm'}
                onChange={() => setProperty(prev => ({ ...prev, buildingType: 'longterm' }))}
              /> 長期優良・低炭素
            </label>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#065f46', marginTop: '4px' }}>
            ※ 2024-25年のローン控除限度額: {
              property?.buildingType === 'longterm' ? '4500万円' :
                property?.buildingType === 'zeh' ? '3500万円' : '3000万円'
            } (子育て世帯)
          </div>
        </div>

        {/* Land */}
        <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label className="lbl-xs" style={{ fontWeight: 'bold', color: '#475569' }}>土地 (Land)</label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label className="lbl-xs">価格 (実勢)</label>
              <div className="input-wrapper-sm">
                <input type="number" value={property?.landPrice || ''}
                  onChange={e => setProperty(prev => ({ ...prev, landPrice: Number(e.target.value) }))}
                  className="input-sm" style={{ width: '100%' }} />
                <span className="unit-xs">万円</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label className="lbl-xs">面積</label>
              <div className="input-wrapper-sm">
                <input type="number" value={property?.landArea || ''}
                  onChange={e => setProperty(prev => ({ ...prev, landArea: Number(e.target.value) }))}
                  className="input-sm" style={{ width: '100%' }} />
                <span className="unit-xs">m²</span>
              </div>
            </div>
          </div>
        </div>

        {/* Building */}
        <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
            <label className="lbl-xs" style={{ fontWeight: 'bold', color: '#475569' }}>建物 (Building)</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <label className="checkbox-label" style={{ fontSize: '0.7rem' }}>
                <input type="checkbox" checked={property?.isNew ?? true} onChange={e => setProperty(prev => ({ ...prev, isNew: e.target.checked }))} />
                新築
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label className="lbl-xs">価格 (税抜・請負)</label>
              <div className="input-wrapper-sm">
                <input type="number" value={property?.buildingPrice || ''}
                  onChange={e => setProperty(prev => ({ ...prev, buildingPrice: Number(e.target.value) }))}
                  className="input-sm" style={{ width: '100%' }} />
                <span className="unit-xs">万円</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label className="lbl-xs">延床面積</label>
              <div className="input-wrapper-sm">
                <input type="number" value={property?.buildingArea || ''}
                  onChange={e => setProperty(prev => ({ ...prev, buildingArea: Number(e.target.value) }))}
                  className="input-sm" style={{ width: '100%' }} />
                <span className="unit-xs">m²</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label className="lbl-xs">構造</label>
              <select className="input-sm" style={{ width: '100%' }}
                value={property?.structure || 'wood'}
                onChange={e => setProperty(prev => ({ ...prev, structure: e.target.value }))}>
                <option value="wood">木造 (Wood)</option>
                <option value="steel">鉄骨造 (Steel)</option>
                <option value="rc">RC造 (Reinforced Concrete)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              {/* Empty for balance or add other prop */}
            </div>
          </div>
        </div>

        {/* Advanced Ratios Toggle */}
        <details style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
          <summary style={{ cursor: 'pointer', marginBottom: '0.5rem', userSelect: 'none' }}>詳細パラメータ調整 (係数・税率)</summary>
          <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '4px' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label className="lbl-xs">土地評価掛目</label>
                <input type="number" step="0.1" value={property?.configs?.landRatio ?? 0.7}
                  onChange={e => setProperty(prev => ({ ...prev, configs: { ...prev.configs, landRatio: Number(e.target.value) } }))}
                  className="input-xs" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="lbl-xs">建物評価掛目</label>
                <input type="number" step="0.1" value={property?.configs?.buildingRatio ?? 0.6}
                  onChange={e => setProperty(prev => ({ ...prev, configs: { ...prev.configs, buildingRatio: Number(e.target.value) } }))}
                  className="input-xs" style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label className="lbl-xs">固定資産税率(%)</label>
                <input type="number" step="0.1" value={property?.configs?.fixedRate ?? 1.4}
                  onChange={e => setProperty(prev => ({ ...prev, configs: { ...prev.configs, fixedRate: Number(e.target.value) } }))}
                  className="input-xs" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="lbl-xs">都市計画税率(%)</label>
                <input type="number" step="0.1" value={property?.configs?.cityRate ?? 0.3}
                  onChange={e => setProperty(prev => ({ ...prev, configs: { ...prev.configs, cityRate: Number(e.target.value) } }))}
                  className="input-xs" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </details>

        {/* Tax Calc Method */}
        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
          <label className="lbl-xs" style={{ display: 'block', marginBottom: '0.5rem' }}>計算モード</label>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input type="radio"
                checked={property?.fixedAssetTax?.method === 'auto'}
                onChange={() => setProperty(prev => ({ ...prev, fixedAssetTax: { ...prev.fixedAssetTax, method: 'auto' } }))} />
              詳細シミュレーション
            </label>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input type="radio"
                checked={property?.fixedAssetTax?.method === 'manual'}
                onChange={() => setProperty(prev => ({ ...prev, fixedAssetTax: { ...prev.fixedAssetTax, method: 'manual' } }))} />
              手動入力 (固定額)
            </label>
          </div>

          {property?.fixedAssetTax?.method === 'auto' ? (
            <div style={{ background: '#ecfdf5', padding: '0.75rem', borderRadius: '4px', border: '1px solid #10b981' }}>
              <div style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 'bold' }}>
                初年度目安: 約 {(() => {
                  const l = (property?.landPrice || 0) * 10000 * (property?.configs?.landRatio ?? 0.7);
                  const b = (property?.buildingPrice || 0) * 10000 * (property?.configs?.buildingRatio ?? 0.6);
                  const fRate = (property?.configs?.fixedRate ?? 1.4) / 100;
                  const landTaxEst = l * (property?.landArea <= 200 ? 1 / 6 : 1 / 3) * fRate;
                  const buildTaxEst = b * fRate * (property?.isNew ? 0.5 : 1.0);
                  return Math.round((landTaxEst + buildTaxEst) / 10000);
                })()} 万円 / 年
              </div>
              <div style={{ fontSize: '0.7rem', color: '#065f46', marginTop: '2px' }}>
                ※ 土地軽減特例・新築軽減・経年減価を適用してシミュレーションします
              </div>
            </div>
          ) : (
            <div className="input-wrapper-sm">
              <input type="number"
                value={property?.fixedAssetTax?.manualAmount || ''}
                onChange={e => setProperty(prev => ({ ...prev, fixedAssetTax: { ...prev.fixedAssetTax, manualAmount: Number(e.target.value) } }))}
                className="input-sm" style={{ width: '100%' }} />
              <span className="unit-xs">万円/年</span>
            </div>
          )}
        </div>
      </div>

      {/* Funding Plan (Existing) */}
      <div className="form-group" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <DollarSign size={16} /> 資金計画 (Funding)
        </h3>

        <div style={{ marginBottom: '0.75rem' }}>
          <label className="lbl-sm" style={{ fontWeight: 'bold' }}>物件価格 (総額)</label>
          <div className="input-wrapper">
            <input
              type="number"
              value={property?.price || ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                setProperty(prev => ({ ...prev, price: val }));
                setAmount(Math.max(0, val - (property.deposit || 0) - (property.downPayment || 0)));
              }}
              className="input-premium"
              onFocus={e => e.target.select()}
            />
            <span className="unit">万円</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <label className="lbl-xs">手付金 (現金)</label>
            <div className="input-wrapper-sm">
              <input
                type="number"
                value={property?.deposit || ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setProperty(prev => ({ ...prev, deposit: val }));
                  setAmount(Math.max(0, (property.price || 0) - val - (property.downPayment || 0)));
                }}
                className="input-sm" style={{ width: '100%' }}
              />
              <span className="unit-xs">万円</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="lbl-xs">頭金 (現金)</label>
            <div className="input-wrapper-sm">
              <input
                type="number"
                value={property?.downPayment || ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setProperty(prev => ({ ...prev, downPayment: val }));
                  setAmount(Math.max(0, (property.price || 0) - (property.deposit || 0) - val));
                }}
                className="input-sm" style={{ width: '100%' }}
              />
              <span className="unit-xs">万円</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
          <label className="lbl-sm" style={{ color: '#0f172a', fontWeight: 'bold' }}>借入金額 (ローン)</label>
          <div className="input-wrapper">
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="input-premium"
              style={{ borderColor: '#3b82f6', background: '#eff6ff' }}
              onFocus={e => e.target.select()}
            />
            <span className="unit">万円</span>
          </div>
          <p className="helper-text" style={{ marginTop: '4px' }}>※ 物件価格 - (手付金 + 頭金) が初期値として計算されます</p>
        </div>

        {/* Pair Loan Split UI */}
        {isPairLoan && pairLoanConfig && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
            <h4 style={{ fontSize: '0.85rem', color: '#1e40af', marginBottom: '0.5rem' }}>ペアローン内訳 (総額: {amount}万円)</h4>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label className="lbl-xs">夫 (主) 借入</label>
                <div className="input-wrapper-sm">
                  <input type="number"
                    value={pairLoanConfig.main}
                    onChange={e => handlePairSplitChange('main', e.target.value)}
                    className="input-sm" style={{ width: '100%', borderColor: '#3b82f6' }}
                  />
                  <span className="unit-xs">万円</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label className="lbl-xs">妻 (配偶者) 借入</label>
                <div className="input-wrapper-sm">
                  <input type="number"
                    value={amount - pairLoanConfig.main} // Auto calc for display/logic check
                    disabled
                    className="input-sm" style={{ width: '100%', background: '#f1f5f9' }}
                  />
                  <span className="unit-xs">万円</span>
                </div>
              </div>
            </div>

            {/* Bonus Split */}
            {bonusPrincipal > 0 && (
              <div style={{ borderTop: '1px dashed #bfdbfe', paddingTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#1e40af', marginBottom: '0.5rem' }}>ボーナス払い内訳 (総額: {bonusPrincipal}万円)</h4>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="lbl-xs">夫 (主) 分</label>
                    <div className="input-wrapper-sm">
                      <input type="number"
                        value={pairLoanConfig.bonusMain}
                        onChange={e => handlePairSplitChange('bonusMain', e.target.value)}
                        className="input-sm" style={{ width: '100%', borderColor: '#3b82f6' }}
                      />
                      <span className="unit-xs">万円</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="lbl-xs">妻 (配偶者) 分</label>
                    <div className="input-wrapper-sm">
                      <input type="number"
                        value={bonusPrincipal - pairLoanConfig.bonusMain}
                        disabled
                        className="input-sm" style={{ width: '100%', background: '#f1f5f9' }}
                      />
                      <span className="unit-xs">万円</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', marginTop: '1rem' }}>
          <div className="form-group">
            <label>ボーナス払い分 元金 (万円)</label>
            <div className="input-wrapper">
              <input
                type="number"
                value={bonusPrincipal || ''}
                onChange={(e) => setBonusPrincipal(Number(e.target.value))}
                className="input-premium"
                onFocus={e => e.target.select()}
              />
              <span className="unit">万円</span>
            </div>
            <p className="helper-text">総額のうち、ボーナス払いに割り当てる元金</p>
          </div>

          <div className="form-group checkbox-group" style={{ marginBottom: '1.5rem' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasDeduction}
                onChange={(e) => setHasDeduction(e.target.checked)}
              />
              住宅ローン控除を利用する (13年間)
            </label>
          </div>

          <div className="form-group">
            <label>金利プラン (5年ごと変動)</label>
            <div className="rate-grid">
              {periods.map((period, idx) => (
                <div key={idx} className="rate-item">
                  <span className="rate-label">{period}</span>
                  <div className="input-wrapper-sm">
                    <input
                      type="number"
                      step="0.01"
                      value={rates[idx]}
                      onChange={(e) => handleRateChange(idx, e.target.value)}
                    />
                    <span className="unit">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Initial One-time Expenses */}
      <div className="section-group" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#334155', fontWeight: 'bold' }}>
          購入時諸経費 (手数料・家具・引越し等)
        </h3>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
          {(initialExpenses || []).map(item => (
            <div key={item.id} style={{ display: 'flex', gap: '8px', padding: '8px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
              <input type="text" placeholder="項目名" value={item.name}
                onChange={e => updateInitialExpense(item.id, 'name', e.target.value)}
                className="input-sm" style={{ flex: 2 }} />
              <div className="input-wrapper-sm" style={{ flex: 1 }}>
                <input type="number" value={item.amount || ''}
                  onChange={e => updateInitialExpense(item.id, 'amount', Number(e.target.value))}
                  className="input-sm" style={{ width: '100%' }} />
                <span className="unit-xs">万円</span>
              </div>
              <button onClick={() => removeInitialExpense(item.id)} className="btn-icon-xs"><X size={14} /></button>
            </div>
          ))}
          <div style={{ padding: '8px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={addInitialExpense} className="btn-dashed-xm" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>+ 追加</button>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>合計: {totalInitialCost} 万円</div>
          </div>
        </div>
      </div>




    </div>
  );
}

export function ExpenseForm({ expenses, setExpenses }) {
  const addExpense = () => {
    setExpenses([...expenses, { id: Date.now(), name: '', amount: 0 }]);
  };

  const removeExpense = (id) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const updateExpense = (id, field, value) => {
    setExpenses(expenses.map(e =>
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const totalMonthly = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="card">
      <div className="card-header">
        <TrendingUp className="icon" />
        <h2>生活費詳細 ({(totalMonthly / 10000).toFixed(1)}万円/月)</h2>
      </div>

      <div className="expense-list">
        {expenses.map((item) => (
          <div key={item.id} className="expense-row">
            <input
              type="text"
              placeholder="項目名"
              value={item.name}
              onChange={(e) => updateExpense(item.id, 'name', e.target.value)}
              className="input-sm name-input"
            />
            <div className="input-wrapper-xs">
              <input
                type="number"
                value={item.amount || ''}
                onChange={(e) => updateExpense(item.id, 'amount', Number(e.target.value))}
                className="input-sm amount-input"
              />
              <span className="unit-xs">円</span>
            </div>
            <button onClick={() => removeExpense(item.id)} className="btn-icon-xs"><X size={16} /></button>
          </div>
        ))}
      </div>
      <button onClick={addExpense} className="btn-dashed">+ 項目を追加</button>
    </div>
  );
}

export function IncomeForm({ income, setIncome, isPairLoan, setIsPairLoan }) {
  const updateIncome = (person, field, value) => {
    setIncome(prev => ({
      ...prev,
      [person]: { ...prev[person], [field]: Number(value) }
    }));
  };

  // Helper to show estimated monthly net from monthly gross
  const getNetMonthly = (grossManYen) => {
    if (!grossManYen) return 0;
    const grossAnnual = grossManYen * 10000 * 12;
    const netAnnual = estimateNetIncome(grossAnnual);
    return Math.round((netAnnual / 12) / 10000 * 10) / 10;
  };

  return (
    <div className="card">
      <div className="card-header">
        <Wallet className="icon" />
        <h2>世帯収入 (額面)</h2>
      </div>

      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isPairLoan}
            onChange={(e) => setIsPairLoan(e.target.checked)}
          />
          ペアローン / 共働き
        </label>
      </div>

      <div className="income-grid">
        <div className="income-col">
          <div className="income-sub-header">
            <h3>夫 (主)</h3>
            <div className="age-inputs">
              <label className="lbl-xs">現在<input type="number" value={income.main.age} onChange={e => updateIncome('main', 'age', Number(e.target.value))} className="input-xs" />歳</label>
              <label className="lbl-xs">引退<input type="number" value={income.main.retirementAge} onChange={e => updateIncome('main', 'retirementAge', Number(e.target.value))} className="input-xs" />歳</label>
            </div>

            <div className="leave-inputs" style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', padding: '0.5rem', borderRadius: '4px' }}>
              <label className="checkbox-label" style={{ marginBottom: '6px' }}>
                <input type="checkbox" checked={income.main.hasLeave || false} onChange={e => {
                  setIncome(prev => ({ ...prev, main: { ...prev.main, hasLeave: e.target.checked } }));
                }} />
                <span style={{ fontWeight: 'bold', fontSize: '12px' }}>育児休業を取得</span>
              </label>

              {income.main.hasLeave && (
                <>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label className="lbl-xs">
                      開始<input type="number" value={income.main.leaveStartYear || 0} onChange={e => {
                        const val = Number(e.target.value);
                        setIncome(prev => ({ ...prev, main: { ...prev.main, leaveStartYear: val } }));
                      }} className="input-xs" />年目
                    </label>
                    <label className="lbl-xs">
                      期間<input type="number" value={income.main.leaveDurationMonths || 0} onChange={e => {
                        const val = Number(e.target.value);
                        setIncome(prev => ({ ...prev, main: { ...prev.main, leaveDurationMonths: val } }));
                      }} className="input-xs" />ヶ月
                    </label>
                  </div>
                  <label className="checkbox-label" style={{ marginTop: '8px', alignItems: 'start' }}>
                    <input type="checkbox" checked={income.main.applyNewBenefit || false} onChange={e => {
                      setIncome(prev => ({ ...prev, main: { ...prev.main, applyNewBenefit: e.target.checked } }));
                    }} />
                    <span style={{ fontSize: '11px', lineHeight: '1.4' }}>
                      <strong>育児休業給付金・出生後休業支援給付金を受給</strong><br />
                      <span style={{ color: '#64748b' }}>※チェックを外すと給付金0円 (収入減の影響を確認)</span>
                    </span>
                  </label>
                </>
              )}
            </div>

            <div className="work-style-jitan" style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', padding: '0.5rem', borderRadius: '4px' }}>
              <label className="checkbox-label" style={{ marginBottom: '4px' }}>
                <input type="checkbox" checked={income.main.hasJitan || false} onChange={e => {
                  setIncome(prev => ({ ...prev, main: { ...prev.main, hasJitan: e.target.checked } }));
                }} />
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>時短勤務を設定 (給与カット)</span>
              </label>

              {income.main.hasJitan && (
                <>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: '4px' }}>
                    <label className="lbl-xs">開始<input type="number" value={income.main.jitan?.startYear || 0} onChange={e => {
                      const val = Number(e.target.value);
                      setIncome(prev => ({ ...prev, main: { ...prev.main, jitan: { ...prev.main.jitan, startYear: val } } }));
                    }} className="input-xs" />年目</label>
                    <label className="lbl-xs">期間<input type="number" value={income.main.jitan?.duration || 0} onChange={e => {
                      const val = Number(e.target.value);
                      setIncome(prev => ({ ...prev, main: { ...prev.main, jitan: { ...prev.main.jitan, duration: val } } }));
                    }} className="input-xs" />年</label>
                    <label className="lbl-xs">掛率<input type="number" value={income.main.jitan?.ratio ?? 100} onChange={e => {
                      const val = Number(e.target.value);
                      setIncome(prev => ({ ...prev, main: { ...prev.main, jitan: { ...prev.main.jitan, ratio: val } } }));
                    }} className="input-xs" />%</label>
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px', marginTop: '2px' }}>
                    ※2歳未満の子がいる場合、賃金の10%が給付されます（育児時短就業給付金）
                  </div>
                </>
              )}
            </div>

            <div className="work-style-side" style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', padding: '0.5rem', borderRadius: '4px' }}>
              <label className="checkbox-label" style={{ marginBottom: '4px' }}>
                <input type="checkbox" checked={income.main.hasSideBusiness || false} onChange={e => {
                  setIncome(prev => ({ ...prev, main: { ...prev.main, hasSideBusiness: e.target.checked } }));
                }} />
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>副業収入を設定 (年額・額面)</span>
              </label>

              {income.main.hasSideBusiness && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: '4px' }}>
                  <label className="lbl-xs">年額<input type="number" value={income.main.sideBusiness?.annual || ''} onChange={e => {
                    const val = Number(e.target.value);
                    setIncome(prev => ({ ...prev, main: { ...prev.main, sideBusiness: { ...prev.main.sideBusiness, annual: val } } }));
                  }} className="input-xs" style={{ width: '6rem' }} />万円</label>
                  <label className="lbl-xs">開始<input type="number" value={income.main.sideBusiness?.startYear || 0} onChange={e => {
                    const val = Number(e.target.value);
                    setIncome(prev => ({ ...prev, main: { ...prev.main, sideBusiness: { ...prev.main.sideBusiness, startYear: val } } }));
                  }} className="input-xs" />年目</label>
                  <label className="lbl-xs">期間<input type="number" value={income.main.sideBusiness?.duration || 0} onChange={e => {
                    const val = Number(e.target.value);
                    setIncome(prev => ({ ...prev, main: { ...prev.main, sideBusiness: { ...prev.main.sideBusiness, duration: val } } }));
                  }} className="input-xs" />年</label>
                </div>
              )}
            </div>
          </div>

          <label>月収 (額面)</label>
          <div className="input-wrapper">
            <input
              type="number"
              value={income.main.salary || ''}
              onChange={(e) => updateIncome('main', 'salary', e.target.value)}
              className="input-premium"
              onFocus={e => e.target.select()}
            />
            <span className="unit">万円</span>
          </div>
          <div className="helper-text-highlight">
            手取目安: 約 <span className="val">{getNetMonthly(income.main.salary)}</span> 万円
          </div>

          <label style={{ marginTop: '0.5rem' }}>年間ボーナス (額面)</label>
          <div className="input-wrapper">
            <input
              type="number"
              value={income.main.bonus || ''}
              onChange={(e) => updateIncome('main', 'bonus', e.target.value)}
              className="input-premium"
              onFocus={e => e.target.select()}
            />
            <span className="unit">万円</span>
          </div>

          <label style={{ marginTop: '0.5rem' }}>昇給率 (年率)</label>
          <div className="input-wrapper">
            <input
              type="number"
              value={income.main.salaryIncrease || 0}
              onChange={(e) => updateIncome('main', 'salaryIncrease', Number(e.target.value))}
              className="input-premium"
              onFocus={e => e.target.select()}
            />
            <span className="unit">%</span>
          </div>
          <div className="helper-text">
            ※ 毎年この率で給与とボーナスが増加します (例: 1%〜3%)
          </div>

          <div className="retirement-section" style={{ marginTop: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#475569' }}>老後の収入設定</h4>

            {/* Method Selection */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label className="lbl-xs" style={{ display: 'block', marginBottom: '0.25rem' }}>退職金計算設定</label>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={income.main.retirementConfig?.method === 'manual'}
                    onChange={() => setIncome(prev => ({ ...prev, main: { ...prev.main, retirementConfig: { ...prev.main.retirementConfig, method: 'manual' } } }))}
                  />
                  金額指定
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={income.main.retirementConfig?.method === 'auto'}
                    onChange={() => setIncome(prev => ({ ...prev, main: { ...prev.main, retirementConfig: { ...prev.main.retirementConfig, method: 'auto' } } }))}
                  />
                  勤続年数から試算
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {income.main.retirementConfig?.method === 'manual' ? (
                <div>
                  <label className="lbl-xs" style={{ display: 'block', marginBottom: '0.25rem' }}>退職金 (額面)</label>
                  <div className="input-wrapper-sm">
                    <input type="number"
                      value={income.main.retirementAllowance || ''}
                      onChange={e => setIncome(prev => ({ ...prev, main: { ...prev.main, retirementAllowance: Number(e.target.value) } }))}
                      className="input-sm" style={{ width: '100%' }} />
                    <span className="unit-xs">万円</span>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label className="lbl-xs">勤続開始年齢</label>
                      <div className="input-wrapper-sm">
                        <input type="number"
                          value={income.main.retirementConfig?.serviceStartAge ?? 22}
                          onChange={e => setIncome(prev => ({ ...prev, main: { ...prev.main, retirementConfig: { ...prev.main.retirementConfig, serviceStartAge: Number(e.target.value) } } }))}
                          className="input-sm" style={{ width: '100%' }}
                        />
                        <span className="unit-xs">歳</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="lbl-xs">支給係数</label>
                      <div className="input-wrapper-sm">
                        <input type="number" step="0.1"
                          value={income.main.retirementConfig?.multiplier ?? 1.0}
                          onChange={e => setIncome(prev => ({ ...prev, main: { ...prev.main, retirementConfig: { ...prev.main.retirementConfig, multiplier: Number(e.target.value) } } }))}
                          className="input-sm" style={{ width: '100%' }}
                        />
                        <span className="unit-xs">倍</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    目安: <strong>{Math.round((income.main.salary || 0) * (income.main.retirementAge - (income.main.retirementConfig?.serviceStartAge || 22)) * (income.main.retirementConfig?.multiplier || 1.0))}</strong> 万円 (現在月収ベース)
                  </div>
                </div>
              )}

              <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="lbl-xs" style={{ fontWeight: 'bold', color: '#475569' }}>年金設定</label>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <input type="radio" checked={income.main.pensionConfig?.method === 'manual'} onChange={() => setIncome(prev => ({ ...prev, main: { ...prev.main, pensionConfig: { ...prev.main.pensionConfig, method: 'manual' } } }))} />
                      金額指定
                    </label>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <input type="radio" checked={income.main.pensionConfig?.method === 'auto'} onChange={() => setIncome(prev => ({ ...prev, main: { ...prev.main, pensionConfig: { ...prev.main.pensionConfig, method: 'auto' } } }))} />
                      年収から試算
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    {income.main.pensionConfig?.method === 'manual' ? (
                      <>
                        <label className="lbl-xs" style={{ display: 'block', marginBottom: '0.25rem' }}>月額 (手取)</label>
                        <div className="input-wrapper-sm">
                          <input type="number"
                            value={income.main.pension?.monthly || ''}
                            onChange={e => setIncome(prev => ({ ...prev, main: { ...prev.main, pension: { ...prev.main.pension, monthly: Number(e.target.value) } } }))}
                            className="input-sm" style={{ width: '100%' }} />
                          <span className="unit-xs">万円</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="lbl-xs" style={{ display: 'block', marginBottom: '0.25rem' }}>勤続開始年齢</label>
                        <div className="input-wrapper-sm">
                          <input type="number"
                            value={income.main.pensionConfig?.serviceStartAge ?? 22}
                            onChange={e => setIncome(prev => ({ ...prev, main: { ...prev.main, pensionConfig: { ...prev.main.pensionConfig, serviceStartAge: Number(e.target.value) } } }))}
                            className="input-sm" style={{ width: '100%' }} />
                          <span className="unit-xs">歳</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          目安: {calculatePensionEstimate((income.main.salary * 12 + (income.main.bonus || 0)), income.main.age, income.main.pensionConfig?.serviceStartAge, income.main.retirementAge)} 万円
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ width: '40%' }}>
                    <label className="lbl-xs" style={{ display: 'block', marginBottom: '0.25rem' }}>受給開始</label>
                    <div className="input-wrapper-sm">
                      <input type="number"
                        value={income.main.pension?.startAge || 65}
                        onChange={e => setIncome(prev => ({ ...prev, main: { ...prev.main, pension: { ...prev.main.pension, startAge: Number(e.target.value) } } }))}
                        className="input-sm" style={{ width: '100%' }} />
                      <span className="unit-xs">歳</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isPairLoan && (
          <div className="income-col">
            <div className="income-sub-header">
              <h3>妻 (配偶者)</h3>
              <div className="age-inputs">
                <label>
                  現在<input type="number" value={income.partner.age} onChange={e => updateIncome('partner', 'age', Number(e.target.value))} className="input-xs" />歳
                </label>
                <label>
                  引退<input type="number" value={income.partner.retirementAge} onChange={e => updateIncome('partner', 'retirementAge', Number(e.target.value))} className="input-xs" />歳
                </label>
              </div>

              <div className="leave-inputs" style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', padding: '0.5rem', borderRadius: '4px' }}>
                <label className="checkbox-label" style={{ marginBottom: '6px' }}>
                  <input type="checkbox" checked={income.partner.hasLeave || false} onChange={e => {
                    setIncome(prev => ({ ...prev, partner: { ...prev.partner, hasLeave: e.target.checked } }));
                  }} />
                  <span style={{ fontWeight: 'bold', fontSize: '12px' }}>育児休業を取得</span>
                </label>

                {income.partner.hasLeave && (
                  <>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <label className="lbl-xs">
                        開始<input type="number" value={income.partner.leaveStartYear || 0} onChange={e => updateIncome('partner', 'leaveStartYear', Number(e.target.value))} className="input-xs" />年目
                      </label>
                      <label className="lbl-xs">
                        期間<input type="number" value={income.partner.leaveDurationMonths || 0} onChange={e => updateIncome('partner', 'leaveDurationMonths', Number(e.target.value))} className="input-xs" />ヶ月
                      </label>
                    </div>
                    <label className="checkbox-label" style={{ marginTop: '8px', alignItems: 'start' }}>
                      <input type="checkbox" checked={income.partner.applyNewBenefit || false} onChange={e => updateIncome('partner', 'applyNewBenefit', e.target.checked)} />
                      <span style={{ fontSize: '11px', lineHeight: '1.4' }}>
                        <strong>育児休業給付金・出生後休業支援給付金を受給</strong><br />
                        <span style={{ color: '#64748b' }}>※チェックを外すと給付金0円 (収入減の影響を確認)</span>
                      </span>
                    </label>
                  </>
                )}
              </div>

              <div className="work-style-jitan" style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', padding: '0.5rem', borderRadius: '4px' }}>
                <label className="checkbox-label" style={{ marginBottom: '4px' }}>
                  <input type="checkbox" checked={income.partner.hasJitan || false} onChange={e => {
                    setIncome(prev => ({ ...prev, partner: { ...prev.partner, hasJitan: e.target.checked } }));
                  }} />
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>時短勤務を設定 (給与カット)</span>
                </label>

                {income.partner.hasJitan && (
                  <>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: '4px' }}>
                      <label className="lbl-xs">開始<input type="number" value={income.partner.jitan?.startYear || 0} onChange={e => {
                        const val = Number(e.target.value);
                        setIncome(prev => ({ ...prev, partner: { ...prev.partner, jitan: { ...prev.partner.jitan, startYear: val } } }));
                      }} className="input-xs" />年目</label>
                      <label className="lbl-xs">期間<input type="number" value={income.partner.jitan?.duration || 0} onChange={e => {
                        const val = Number(e.target.value);
                        setIncome(prev => ({ ...prev, partner: { ...prev.partner, jitan: { ...prev.partner.jitan, duration: val } } }));
                      }} className="input-xs" />年</label>
                      <label className="lbl-xs">掛率<input type="number" value={income.partner.jitan?.ratio ?? 100} onChange={e => {
                        const val = Number(e.target.value);
                        setIncome(prev => ({ ...prev, partner: { ...prev.partner, jitan: { ...prev.partner.jitan, ratio: val } } }));
                      }} className="input-xs" />%</label>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px', marginTop: '2px' }}>
                      ※2歳未満の子がいる場合、賃金の10%が給付されます（育児時短就業給付金）
                    </div>
                  </>
                )}
              </div>

              <div className="work-style-side" style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', padding: '0.5rem', borderRadius: '4px' }}>
                <label className="checkbox-label" style={{ marginBottom: '4px' }}>
                  <input type="checkbox" checked={income.partner.hasSideBusiness || false} onChange={e => {
                    const checked = e.target.checked;
                    setIncome(prev => ({
                      ...prev,
                      partner: {
                        ...prev.partner,
                        hasSideBusiness: checked,
                        // Set default duration to 10 if enabling and currently 0
                        sideBusiness: {
                          ...prev.partner.sideBusiness,
                          duration: (checked && (!prev.partner.sideBusiness?.duration)) ? 10 : (prev.partner.sideBusiness?.duration || 0)
                        }
                      }
                    }));
                  }} />
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>副業収入を設定 (年額・額面)</span>
                </label>

                {income.partner.hasSideBusiness && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: '4px' }}>
                    <label className="lbl-xs">年額<input type="number" value={income.partner.sideBusiness?.annual || ''} onChange={e => {
                      const val = Number(e.target.value);
                      setIncome(prev => ({ ...prev, partner: { ...prev.partner, sideBusiness: { ...prev.partner.sideBusiness, annual: val } } }));
                    }} className="input-xs" style={{ width: '6rem' }} />万円</label>
                    <label className="lbl-xs">開始<input type="number" value={income.partner.sideBusiness?.startYear || 0} onChange={e => {
                      const val = Number(e.target.value);
                      setIncome(prev => ({ ...prev, partner: { ...prev.partner, sideBusiness: { ...prev.partner.sideBusiness, startYear: val } } }));
                    }} className="input-xs" />年目</label>
                    <label className="lbl-xs">期間<input type="number" value={income.partner.sideBusiness?.duration || 0} onChange={e => {
                      const val = Number(e.target.value);
                      setIncome(prev => ({ ...prev, partner: { ...prev.partner, sideBusiness: { ...prev.partner.sideBusiness, duration: val } } }));
                    }} className="input-xs" />年</label>
                  </div>
                )}
              </div>

            </div>

            <label>月収 (額面)</label>
            <div className="input-wrapper">
              <input
                type="number"
                value={income.partner.salary || ''}
                onChange={(e) => updateIncome('partner', 'salary', e.target.value)}
                className="input-premium"
                onFocus={e => e.target.select()}
              />
              <span className="unit">万円</span>
            </div>
            <div className="helper-text-highlight">
              手取目安: 約 <span className="val">{getNetMonthly(income.partner.salary)}</span> 万円
            </div>

            <label style={{ marginTop: '0.5rem' }}>年間ボーナス (額面)</label>
            <div className="input-wrapper">
              <input
                type="number"
                value={income.partner.bonus || ''}
                onChange={(e) => updateIncome('partner', 'bonus', e.target.value)}
                className="input-premium"
                onFocus={e => e.target.select()}
              />
              <span className="unit">万円</span>
            </div>

            <label style={{ marginTop: '0.5rem' }}>昇給率 (年率)</label>
            <div className="input-wrapper">
              <input
                type="number"
                value={income.partner.salaryIncrease || 0}
                onChange={(e) => updateIncome('partner', 'salaryIncrease', Number(e.target.value))}
                className="input-premium"
                onFocus={e => e.target.select()}
              />
              <span className="unit">%</span>
            </div>
            <div className="helper-text">
              ※ 毎年この率で給与とボーナスが増加します
            </div>

            <div className="retirement-section" style={{ marginTop: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#475569' }}>老後の収入設定</h4>

              {/* Method Selection */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="lbl-xs" style={{ display: 'block', marginBottom: '0.25rem' }}>退職金計算設定</label>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={income.partner.retirementConfig?.method === 'manual'}
                      onChange={() => setIncome(prev => ({ ...prev, partner: { ...prev.partner, retirementConfig: { ...prev.partner.retirementConfig, method: 'manual' } } }))}
                    />
                    金額指定
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={income.partner.retirementConfig?.method === 'auto'}
                      onChange={() => setIncome(prev => ({ ...prev, partner: { ...prev.partner, retirementConfig: { ...prev.partner.retirementConfig, method: 'auto' } } }))}
                    />
                    勤続年数から試算
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {income.partner.retirementConfig?.method === 'manual' ? (
                  <div>
                    <label className="lbl-xs" style={{ display: 'block', marginBottom: '0.25rem' }}>退職金 (額面)</label>
                    <div className="input-wrapper-sm">
                      <input type="number"
                        value={income.partner.retirementAllowance || ''}
                        onChange={e => setIncome(prev => ({ ...prev, partner: { ...prev.partner, retirementAllowance: Number(e.target.value) } }))}
                        className="input-sm" style={{ width: '100%' }} />
                      <span className="unit-xs">万円</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <label className="lbl-xs">勤続開始年齢</label>
                        <div className="input-wrapper-sm">
                          <input type="number"
                            value={income.partner.retirementConfig?.serviceStartAge ?? 22}
                            onChange={e => setIncome(prev => ({ ...prev, partner: { ...prev.partner, retirementConfig: { ...prev.partner.retirementConfig, serviceStartAge: Number(e.target.value) } } }))}
                            className="input-sm" style={{ width: '100%' }}
                          />
                          <span className="unit-xs">歳</span>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="lbl-xs">支給係数</label>
                        <div className="input-wrapper-sm">
                          <input type="number" step="0.1"
                            value={income.partner.retirementConfig?.multiplier ?? 1.0}
                            onChange={e => setIncome(prev => ({ ...prev, partner: { ...prev.partner, retirementConfig: { ...prev.partner.retirementConfig, multiplier: Number(e.target.value) } } }))}
                            className="input-sm" style={{ width: '100%' }}
                          />
                          <span className="unit-xs">倍</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      目安: <strong>{Math.round((income.partner.salary || 0) * (income.partner.retirementAge - (income.partner.retirementConfig?.serviceStartAge || 22)) * (income.partner.retirementConfig?.multiplier || 1.0))}</strong> 万円 (現在月収ベース)
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                  <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="lbl-xs" style={{ fontWeight: 'bold', color: '#475569' }}>年金設定</label>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
                      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <input type="radio" checked={income.partner.pensionConfig?.method === 'manual'} onChange={() => setIncome(prev => ({ ...prev, partner: { ...prev.partner, pensionConfig: { ...prev.partner.pensionConfig, method: 'manual' } } }))} />
                        金額指定
                      </label>
                      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <input type="radio" checked={income.partner.pensionConfig?.method === 'auto'} onChange={() => setIncome(prev => ({ ...prev, partner: { ...prev.partner, pensionConfig: { ...prev.partner.pensionConfig, method: 'auto' } } }))} />
                        年収から試算
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      {income.partner.pensionConfig?.method === 'manual' ? (
                        <>
                          <label className="lbl-xs" style={{ display: 'block', marginBottom: '0.25rem' }}>月額 (手取)</label>
                          <div className="input-wrapper-sm">
                            <input type="number"
                              value={income.partner.pension?.monthly || ''}
                              onChange={e => setIncome(prev => ({ ...prev, partner: { ...prev.partner, pension: { ...prev.partner.pension, monthly: Number(e.target.value) } } }))}
                              className="input-sm" style={{ width: '100%' }} />
                            <span className="unit-xs">万円</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <label className="lbl-xs" style={{ display: 'block', marginBottom: '0.25rem' }}>勤続開始年齢</label>
                          <div className="input-wrapper-sm">
                            <input type="number"
                              value={income.partner.pensionConfig?.serviceStartAge ?? 22}
                              onChange={e => setIncome(prev => ({ ...prev, partner: { ...prev.partner, pensionConfig: { ...prev.partner.pensionConfig, serviceStartAge: Number(e.target.value) } } }))}
                              className="input-sm" style={{ width: '100%' }} />
                            <span className="unit-xs">歳</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                            目安: {calculatePensionEstimate((income.partner.salary * 12 + (income.partner.bonus || 0)), income.partner.age, income.partner.pensionConfig?.serviceStartAge, income.partner.retirementAge)} 万円
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ width: '40%' }}>
                      <label className="lbl-xs" style={{ display: 'block', marginBottom: '0.25rem' }}>受給開始</label>
                      <div className="input-wrapper-sm">
                        <input type="number"
                          value={income.partner.pension?.startAge || 65}
                          onChange={e => setIncome(prev => ({ ...prev, partner: { ...prev.partner, pension: { ...prev.partner.pension, startAge: Number(e.target.value) } } }))}
                          className="input-sm" style={{ width: '100%' }} />
                        <span className="unit-xs">歳</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="helper-text" style={{ marginTop: '1rem' }}>
        ※ 引退年齢以降は給与収入が0円になります
      </p>
    </div >
  );
}


export function FamilyForm({
  childrenData, setChildrenData, isTokyo, setIsTokyo, hasAllowance, setHasAllowance, isFreeNursery, setIsFreeNursery
}) {
  const addChild = () => {
    setChildrenData([...childrenData, {
      age: 0,
      education: {
        kindergarten: 'public',
        elementary: 'public',
        juniorHigh: 'public',
        highSchool: 'public',
        university: 'private_arts'
      }
    }]);
  };

  const removeChild = (index) => {
    const newData = [...childrenData];
    newData.splice(index, 1);
    setChildrenData(newData);
  };

  const updateChild = (index, field, value) => {
    const newData = [...childrenData];
    newData[index][field] = value;
    setChildrenData(newData);
  };

  const updateEdu = (index, stage, value) => {
    const newData = [...childrenData];
    // Ensure education object exists
    if (!newData[index].education) {
      newData[index].education = {
        kindergarten: 'public', elementary: 'public', juniorHigh: 'public', highSchool: 'public', university: 'private_arts'
      };
    }
    newData[index].education[stage] = value;
    setChildrenData(newData);
  };

  return (
    <div className="card">
      <div className="card-header">
        <DollarSign className="icon" />
        <h2>教育費・子育て支援</h2>
      </div>

      <div className="form-group">
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="checkbox-label" style={{ alignItems: 'start' }}>
            <input
              type="checkbox"
              checked={isTokyo}
              onChange={(e) => setIsTokyo(e.target.checked)}
            />
            <span style={{ flex: 1 }}>
              <strong>東京都 高校授業料実質無償化</strong><br />
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>※公立/私立高・都立大の実質無償化(2024制度)を適用</span>
            </span>
          </label>

          <label className="checkbox-label" style={{ alignItems: 'start' }}>
            <input
              type="checkbox"
              checked={hasAllowance}
              onChange={(e) => setHasAllowance(e.target.checked)}
            />
            <span style={{ flex: 1 }}>
              <strong>児童手当を受給</strong><br />
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>※0-2歳: 1.5万円, 3-18歳: 1万円/月</span>
            </span>
          </label>

          <label className="checkbox-label" style={{ alignItems: 'start' }}>
            <input
              type="checkbox"
              checked={isFreeNursery}
              onChange={(e) => setIsFreeNursery(e.target.checked)}
            />
            <span style={{ flex: 1 }}>
              <strong>幼児教育・保育の無償化</strong><br />
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>※保育園・幼稚園(3-5歳)の利用料を0円として計算</span>
            </span>
          </label>
        </div>

        <div className="flex-between">
          <label>子供の人数: {childrenData.length}人</label>
          <button onClick={addChild} className="btn-secondary">+ 追加</button>
        </div>

        <div className="children-list">
          {childrenData.map((child, idx) => {
            const edu = child.education || { kindergarten: 'public', elementary: 'public', juniorHigh: 'public', highSchool: 'public', university: 'private_arts' };
            return (
              <div key={idx} className="child-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="child-label">子 {idx + 1}</span>
                    <label>年齢:
                      <input
                        type="number"
                        value={child.age || ''}
                        onChange={(e) => updateChild(idx, 'age', Number(e.target.value))}
                        className="input-xs"
                      />
                      歳
                    </label>
                  </div>
                  <button onClick={() => removeChild(idx)} className="btn-icon">×</button>
                </div>

                <div className="education-grid">
                  <div className="edu-col">
                    <span className="lbl-mini">幼</span>
                    <select value={edu.kindergarten} onChange={e => updateEdu(idx, 'kindergarten', e.target.value)} className="select-mini">
                      <option value="public">公</option>
                      <option value="private">私</option>
                    </select>
                  </div>
                  <div className="edu-col">
                    <span className="lbl-mini">小</span>
                    <select value={edu.elementary} onChange={e => updateEdu(idx, 'elementary', e.target.value)} className="select-mini">
                      <option value="public">公</option>
                      <option value="private">私</option>
                    </select>
                  </div>
                  <div className="edu-col">
                    <span className="lbl-mini">中</span>
                    <select value={edu.juniorHigh} onChange={e => updateEdu(idx, 'juniorHigh', e.target.value)} className="select-mini">
                      <option value="public">公</option>
                      <option value="private">私</option>
                    </select>
                  </div>
                  <div className="edu-col">
                    <span className="lbl-mini">高</span>
                    <select value={edu.highSchool} onChange={e => updateEdu(idx, 'highSchool', e.target.value)} className="select-mini">
                      <option value="public">公</option>
                      <option value="private">私</option>
                    </select>
                  </div>
                  <div className="edu-col">
                    <span className="lbl-mini">大</span>
                    <select value={edu.university} onChange={e => updateEdu(idx, 'university', e.target.value)} className="select-mini">
                      <option value="public">国公</option>
                      <option value="private_arts">私文</option>
                      <option value="private_science">私理</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


export function AssetForm({ assets, setAssets }) {
  const handleInitialChange = (val) => {
    setAssets({ ...assets, initialSavings: Number(val) });
  };

  const addInvestment = () => {
    const newInv = { id: Date.now(), name: '', initial: 0, monthly: 0, duration: 20, rate: 3 };
    setAssets({ ...assets, investments: [...assets.investments, newInv] });
  };

  const removeInvestment = (id) => {
    setAssets({ ...assets, investments: assets.investments.filter(i => i.id !== id) });
  };

  const updateInvestment = (id, field, value) => {
    setAssets({
      ...assets,
      investments: assets.investments.map(i => i.id === id ? { ...i, [field]: value } : i)
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <TrendingUp className="icon" />
        <h2>資産・投資設定</h2>
      </div>

      <div className="form-group">
        <label>現在の貯蓄 (万円)</label>
        <div className="input-wrapper">
          <input
            type="number"
            value={assets.initialSavings || ''}
            onChange={(e) => handleInitialChange(e.target.value)}
            className="input-premium"
            onFocus={e => e.target.select()}
          />
          <span className="unit">万円</span>
        </div>
      </div>

      <div className="form-group">
        <div className="flex-between">
          <label>投資・積立</label>
          <button onClick={addInvestment} className="btn-secondary">+ 追加</button>
        </div>

        <div className="children-list">
          {assets.investments.map(inv => (
            <div key={inv.id} className="child-row" style={{ flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <input
                  type="text"
                  placeholder="項目名 (例: NISA)"
                  value={inv.name}
                  onChange={(e) => updateInvestment(inv.id, 'name', e.target.value)}
                  className="input-sm name-input"
                  style={{ fontWeight: 'bold' }}
                />
                <button onClick={() => removeInvestment(inv.id)} className="btn-icon-xs"><X size={16} /></button>
              </div>

              <div className="inv-grid">
                <div>
                  <label className="lbl-xs">現在額</label>
                  <div className="input-wrapper-sm">
                    <input type="number" value={inv.initial || ''} onChange={e => updateInvestment(inv.id, 'initial', e.target.value)} className="input-sm" />
                    <span className="unit-xs">万円</span>
                  </div>
                </div>
                <div>
                  <label className="lbl-xs">毎月積立</label>
                  <div className="input-wrapper-sm">
                    <input type="number" value={inv.monthly || ''} onChange={e => updateInvestment(inv.id, 'monthly', e.target.value)} className="input-sm" />
                    <span className="unit-xs">万円</span>
                  </div>
                </div>
                <div>
                  <label className="lbl-xs">積立期間</label>
                  <div className="input-wrapper-sm">
                    <input type="number" value={inv.duration || ''} onChange={e => updateInvestment(inv.id, 'duration', e.target.value)} className="input-sm" />
                    <span className="unit-xs">年</span>
                  </div>
                </div>
                <div>
                  <label className="lbl-xs">利回り(年)</label>
                  <div className="input-wrapper-sm">
                    <input type="number" value={inv.rate || ''} onChange={e => updateInvestment(inv.id, 'rate', e.target.value)} className="input-sm" />
                    <span className="unit-xs">%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InsuranceForm({ insurance, setInsurance }) {
  const updateInsurance = (person, field, value) => {
    // Allow empty string to be set (to clear input)
    // Coerce to number only if not empty
    const newValue = value === '' ? '' : Number(value);
    setInsurance(prev => ({
      ...prev,
      [person]: { ...prev[person], [field]: newValue }
    }));
  };

  return (
    <div className="card">
      <div className="card-header">
        <DollarSign className="icon" />
        <h2>民間保険 (死亡保障)</h2>
      </div>

      <div className="insurance-grid" style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
        {['main', 'partner'].map((person, idx) => (
          <div key={person} className="person-insurance" style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#334155', fontWeight: 'bold' }}>
              {person === 'main' ? '夫 (主)' : '妻 (配偶者)'}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label className="lbl-xs">月額支払(保険料)</label>
                <div className="input-wrapper-sm">
                  <input
                    type="number"
                    value={insurance[person].premium || ''}
                    onChange={(e) => updateInsurance(person, 'premium', e.target.value)}
                    className="input-sm" style={{ width: '100%' }}
                    placeholder="0"
                  />
                  <span className="unit-xs">円</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label className="lbl-xs">受取額(月額)</label>
                <div className="input-wrapper-sm">
                  <input
                    type="number"
                    value={insurance[person].benefitMonthly || ''}
                    onChange={(e) => updateInsurance(person, 'benefitMonthly', e.target.value)}
                    className="input-sm" style={{ width: '100%' }}
                    placeholder="0"
                  />
                  <span className="unit-xs">万円</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label className="lbl-xs">受取期間(子供が)</label>
                <div className="input-wrapper-sm">
                  <input
                    type="number"
                    value={insurance[person].benefitDurationYears ?? ''}
                    onChange={(e) => updateInsurance(person, 'benefitDurationYears', e.target.value)}
                    className="input-sm" style={{ width: '100%' }}
                    placeholder="18"
                  />
                  <span className="unit-xs">歳まで</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  ※死亡時から末子がこの年齢になるまで受給
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeathSettingsForm({ deathSettings, setDeathSettings }) {
  const updateDeath = (person, field, value) => {
    // Checkbox is boolean, age is number or empty string
    let newValue = value;
    if (field === 'age') {
      newValue = value === '' ? '' : Number(value);
    }
    setDeathSettings(prev => ({
      ...prev,
      [person]: { ...prev[person], [field]: newValue }
    }));
  };

  return (
    <div className="card" style={{ borderColor: '#ef4444' }}>
      <div className="card-header" style={{ color: '#ef4444' }}>
        <X className="icon" />
        <h2>死亡シミュレーション</h2>
      </div>

      <div className="death-grid" style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
        {['main', 'partner'].map((person) => (
          <div key={person} style={{ background: '#fff1f2', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fecaca' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#991b1b', fontWeight: 'bold' }}>
                {person === 'main' ? '夫 (主)' : '妻 (配偶者)'}
              </h3>
              <label className="checkbox-label" style={{ color: '#991b1b' }}>
                <input
                  type="checkbox"
                  checked={deathSettings[person].enabled}
                  onChange={(e) => updateDeath(person, 'enabled', e.target.checked)}
                />
                シミュレーション有効
              </label>
            </div>

            {deathSettings[person].enabled && (
              <div>
                <label className="lbl-xs" style={{ color: '#991b1b' }}>死亡年齢</label>
                <div className="input-wrapper-sm">
                  <input
                    type="number"
                    value={deathSettings[person].age || ''}
                    onChange={(e) => updateDeath(person, 'age', e.target.value)}
                    className="input-sm" style={{ width: '100%', borderColor: '#fca5a5' }}
                    placeholder="60"
                  />
                  <span className="unit-xs">歳</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '4px' }}>
                  ※この年齢で死亡した場合の収支を試算します。<br />
                  ・以後の給与収入は0になります。<br />
                  ・住宅ローンは団信により0になります(全額)。<br />
                  ・遺族年金・死亡保険金が加算されます。
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
