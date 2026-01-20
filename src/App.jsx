import { useState, useMemo, useEffect } from 'react';
import './App.css';
import { MortgageForm, FamilyForm, ExpenseForm, IncomeForm, AssetForm, InsuranceForm, DeathSettingsForm } from './components/Forms';
import { Dashboard } from './components/Dashboard';
import { calculateMortgage, calculateEducation, estimateNetIncome, calculateTaxDeduction, calculateAssets, calculateInvestmentFlow, calculateAdjustedNetIncome, calculateChildAllowance, calculateRetirementNet, calculatePensionEstimate, calculateFixedAssetTaxSchedule, calculateSurvivorPension } from './lib/simulation';
import { Home, Download, Upload } from 'lucide-react';
import { useRef } from 'react';

function App() {
  // State (All in Man-yen / 万円 unit for major financial inputs to avoid input lag)
  const [loanAmount, setLoanAmount] = useState(4000); // 4000万円
  const [bonusPrincipal, setBonusPrincipal] = useState(1000); // 1000万円
  const [rates, setRates] = useState([0.4, 0.4, 0.8, 1.0, 1.2, 1.5, 1.8]);
  const [hasDeduction, setHasDeduction] = useState(true);
  const [property, setProperty] = useState({
    price: 5000,
    deposit: 0, // 手付金 (Man-yen)
    downPayment: 0, // 頭金 (Man-yen)
    // Detailed inputs for Tax
    landPrice: 3000,
    landArea: 100,
    buildingPrice: 2000,
    buildingArea: 90,
    structure: 'wood', // 'wood', 'steel', 'rc'
    buildingType: 'longterm', // 'general', 'zeh', 'longterm'
    isNew: true,
    // Advanced Settings
    configs: {
      landRatio: 0.7,
      buildingRatio: 0.6,
      fixedRate: 1.4,
      cityRate: 0.3
    },
    fixedAssetTax: { method: 'auto', manualAmount: 15 } // annual Man-yen
  });

  // V2: Expenses (Keep in Yen for precision)
  const [expenses, setExpenses] = useState([
    { id: 1, name: "食費", amount: 70000 },
    { id: 2, name: "電気・ガス・水道", amount: 25000 },
    { id: 3, name: "通信費(スマホ・光)", amount: 15000 },
    { id: 4, name: "日用品・消耗品", amount: 10000 },
    { id: 5, name: "被服・美容", amount: 20000 },
    { id: 6, name: "医療・保険(掛捨)", amount: 10000 },
    { id: 7, name: "夫婦お小遣い", amount: 60000 },
    { id: 8, name: "趣味・交際・レジャー", amount: 40000 },
    { id: 9, name: "車維持費(ガソリン等)", amount: 15000 },
    { id: 11, name: "民間保険", amount: 0 }, // New synced item
    { id: 10, name: "その他予備費", amount: 10000 },
  ]);

  // Initial One-time Expenses (Man-yen)
  const [initialExpenses, setInitialExpenses] = useState([
    { id: 1, name: "仲介手数料 (物件価格×3%+6万)", amount: 0 },
    { id: 2, name: "登記・ローン関連諸費用", amount: 100 },
    { id: 3, name: "引越し費用", amount: 20 },
    { id: 4, name: "家具・家電・インテリア", amount: 100 },
    { id: 5, name: "その他 (リフォーム等)", amount: 0 },
  ]);

  // V2: Income & Pair Loan (State in Man-yen)
  const [isPairLoan, setIsPairLoan] = useState(false);
  const [pairLoanConfig, setPairLoanConfig] = useState({
    main: 2000, // Man-yen
    partner: 2000,
    bonusMain: 500,
    bonusPartner: 500
  });

  const [income, setIncome] = useState({
    main: {
      salary: 45, bonus: 120, age: 30, retirementAge: 65,
      retirementAllowance: 0, // Man-yen
      pension: { monthly: 0, startAge: 65 }, // monthly in Man-yen
      salaryIncrease: 0, // Annual increase rate %
      leaveStartYear: 1, leaveDurationMonths: 0, applyNewBenefit: false,
      jitan: { startYear: 1, duration: 0, ratio: 100 },
      sideBusiness: { annual: 0, startYear: 1, duration: 0 },
      retirementConfig: { method: 'manual', serviceStartAge: 22, multiplier: 1.0 },
      pensionConfig: { method: 'manual', serviceStartAge: 22 }
    },
    partner: {
      salary: 30, bonus: 80, age: 30, retirementAge: 65,
      retirementAllowance: 0,
      pension: { monthly: 0, startAge: 65 },
      salaryIncrease: 0, // Annual increase rate %
      leaveStartYear: 1, leaveDurationMonths: 0, applyNewBenefit: false,
      jitan: { startYear: 1, duration: 0, ratio: 100 },
      sideBusiness: { annual: 0, startYear: 1, duration: 0 },
      retirementConfig: { method: 'manual', serviceStartAge: 22, multiplier: 1.0 },
      pensionConfig: { method: 'manual', serviceStartAge: 22 }
    }
  });

  const [children, setChildren] = useState([
    {
      age: 2,
      education: {
        kindergarten: 'public',
        elementary: 'public',
        juniorHigh: 'public',
        highSchool: 'public',
        university: 'private_arts'
      }
    }
  ]);
  const [isTokyo, setIsTokyo] = useState(false);
  const [hasAllowance, setHasAllowance] = useState(false);
  const [isFreeNursery, setIsFreeNursery] = useState(false);

  // V5: Assets
  const [assets, setAssets] = useState({
    initialSavings: 500, // Man-yen
    investments: [
      { id: 1, name: '積立NISA', initial: 0, monthly: 5, duration: 20, rate: 5 }
    ]
  });

  // V6: Insurance & Death
  const [insurance, setInsurance] = useState({
    main: { premium: 0, benefitMonthly: 0, benefitDurationYears: 18 },
    partner: { premium: 0, benefitMonthly: 0, benefitDurationYears: 18 }
  });
  const [deathSettings, setDeathSettings] = useState({
    main: { enabled: false, age: 60 },
    partner: { enabled: false, age: 60 }
  });




  const fileInputRef = useRef(null);

  const handleExport = () => {
    const data = {
      version: 1,
      loanAmount,
      bonusPrincipal,
      rates,
      hasDeduction,
      property,
      initialExpenses,
      expenses,
      isPairLoan,
      pairLoanConfig,
      income,
      children,
      isTokyo,
      hasAllowance,
      isFreeNursery,
      assets,
      insurance,
      deathSettings
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "life_plan_data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.loanAmount !== undefined) setLoanAmount(data.loanAmount);
        if (data.bonusPrincipal !== undefined) setBonusPrincipal(data.bonusPrincipal);
        if (data.rates !== undefined) setRates(data.rates);
        if (data.hasDeduction !== undefined) setHasDeduction(data.hasDeduction);
        if (data.property !== undefined) setProperty(data.property);
        if (data.initialExpenses !== undefined) setInitialExpenses(data.initialExpenses);
        if (data.expenses !== undefined) setExpenses(data.expenses);
        if (data.expenses !== undefined) setExpenses(data.expenses);
        if (data.isPairLoan !== undefined) setIsPairLoan(data.isPairLoan);
        if (data.pairLoanConfig !== undefined) setPairLoanConfig(data.pairLoanConfig);
        if (data.income !== undefined) setIncome(data.income);
        if (data.children !== undefined) setChildren(data.children);
        if (data.isTokyo !== undefined) setIsTokyo(data.isTokyo);
        if (data.hasAllowance !== undefined) setHasAllowance(data.hasAllowance);
        if (data.isFreeNursery !== undefined) setIsFreeNursery(data.isFreeNursery);
        if (data.assets !== undefined) setAssets(data.assets);
        if (data.insurance !== undefined) setInsurance(data.insurance);
        if (data.deathSettings !== undefined) setDeathSettings(data.deathSettings);
        alert("データを読み込みました");
      } catch (err) {
        alert("ファイルの読み込みに失敗しました");
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset inputs
    e.target.value = '';
  };

  // Sync: Insurance State -> Expense List (ID 11)
  useEffect(() => {
    const totalPremium = (insurance.main.premium || 0) + (insurance.partner.premium || 0);
    setExpenses(prev => {
      const target = prev.find(e => e.id === 11);
      if (target) {
        if (target.amount !== totalPremium) {
          return prev.map(e => e.id === 11 ? { ...e, amount: totalPremium } : e);
        }
        return prev;
      } else {
        // Force add if missing (e.g. existing state before code update)
        return [...prev, { id: 11, name: "民間保険", amount: totalPremium }];
      }
    });
  }, [insurance]);

  // Sync: Expense List (ID 11) -> Insurance State
  // Note: If user edits Expense ID 11, we attribute change to Main Premium (simplification)
  useEffect(() => {
    const target = expenses.find(e => e.id === 11);
    if (!target) return;

    // Check if change originated from expenses form (avoid loop if values match)
    const currentTotal = (insurance.main.premium || 0) + (insurance.partner.premium || 0);
    if (target.amount !== currentTotal) {
      // Attribute difference to Main, keep Partner constant
      const newMainPremium = Math.max(0, target.amount - (insurance.partner.premium || 0));
      setInsurance(prev => ({
        ...prev,
        main: { ...prev.main, premium: newMainPremium }
      }));
    }
  }, [expenses]);

  // Calculations (Convert Man-yen to Yen for logic)
  const rawMortgageData = useMemo(() => {
    if (isPairLoan) {
      // Calculate separately using Derived amounts (Safety against state desync)
      const mainAmt = pairLoanConfig.main;
      const partnerAmt = Math.max(0, loanAmount - mainAmt);
      const mainBonus = pairLoanConfig.bonusMain;
      const partnerBonus = Math.max(0, bonusPrincipal - mainBonus);

      const mainM = calculateMortgage(mainAmt * 10000, mainBonus * 10000, rates);
      const partnerM = calculateMortgage(partnerAmt * 10000, partnerBonus * 10000, rates);
      return { isSplit: true, main: mainM, partner: partnerM };
    }
    return { isSplit: false, data: calculateMortgage(loanAmount * 10000, bonusPrincipal * 10000, rates) };
  }, [loanAmount, bonusPrincipal, rates, isPairLoan, pairLoanConfig]);

  // Apply Death (Danshin) to Mortgage Data
  const mortgageData = useMemo(() => {
    // If not split
    if (!rawMortgageData.isSplit) {
      return rawMortgageData.data.map((d, i) => {
        const mainAge = income.main.age + i;
        const partnerAge = income.partner.age + i;
        const mainDead = deathSettings.main.enabled && mainAge >= deathSettings.main.age;
        const partnerDead = deathSettings.partner.enabled && partnerAge >= deathSettings.partner.age;

        if (mainDead || partnerDead) {
          // Single loan (usually Main's name, or joint unlimited liability).
          // If Main dies -> Clear.
          // If Partner dies -> Usually DOES NOT clear unless Pair Loan or Cross Support.
          // Simplification: If Main dies, clear all (assumed main debtor).
          // If Partner dies in single loan? usually nothing happens to loan, just income loss.
          // Let's assume ONLY Main death clears single loan.
          if (mainDead) {
            return { ...d, annualPayment: 0, monthlyPayment: 0, bonusPayment: 0, interestPaid: 0, principalPaid: 0, remainingPrincipal: 0 };
          }
        }
        return d;
      });
    }

    // If Split (Pair Loan)
    const { main, partner } = rawMortgageData;
    const length = Math.max(main.length, partner.length);
    const result = [];

    for (let i = 0; i < length; i++) {
      const mainD = main[i] || { annualPayment: 0, remainingPrincipal: 0 }; // fallback
      const partnerD = partner[i] || { annualPayment: 0, remainingPrincipal: 0 };

      const mainAge = income.main.age + i;
      const partnerAge = income.partner.age + i;
      const mainDead = deathSettings.main.enabled && mainAge >= deathSettings.main.age;
      const partnerDead = deathSettings.partner.enabled && partnerAge >= deathSettings.partner.age;

      let mPay = mainD.annualPayment;
      let pPay = partnerD.annualPayment;
      let mRem = mainD.remainingPrincipal;
      let pRem = partnerD.remainingPrincipal;

      // Apply Danshin Individually
      if (mainDead) { mPay = 0; mRem = 0; }
      if (partnerDead) { pPay = 0; pRem = 0; }

      result.push({
        year: i + 1,
        // Combined totals for display
        annualPayment: mPay + pPay,
        remainingPrincipal: mRem + pRem,
        // Approximations for other fields if needed for display (like montly)
        monthlyPayment: (mainDead ? 0 : mainD.monthlyPayment) + (partnerDead ? 0 : partnerD.monthlyPayment),
        bonusPayment: (mainDead ? 0 : mainD.bonusPayment) + (partnerDead ? 0 : partnerD.bonusPayment),
        principalPaid: (mainDead ? 0 : mainD.principalPaid) + (partnerDead ? 0 : partnerD.principalPaid),
        interestPaid: (mainDead ? 0 : mainD.interestPaid) + (partnerDead ? 0 : partnerD.interestPaid),
      });
    }
    return result;

  }, [rawMortgageData, income, deathSettings]);

  const taxDeductionData = useMemo(() => {
    if (!hasDeduction) return Array(35).fill(0);
    return calculateTaxDeduction(mortgageData, property);
  }, [mortgageData, hasDeduction, property]);

  const educationData = useMemo(() => {
    return calculateEducation(children, isTokyo, isFreeNursery);
  }, [children, isTokyo, isFreeNursery]);

  // Allowance Flow
  const allowanceData = useMemo(() => {
    if (!hasAllowance) return Array(35).fill(0);
    return calculateChildAllowance(children);
  }, [children, hasAllowance]);

  // Total Monthly Living Cost
  const totalMonthlyLivingCost = expenses.reduce((sum, item) => sum + item.amount, 0);

  // Income Schedule Calculation (35 years)
  const incomeSchedule = useMemo(() => {
    // Inputs are in Man-yen
    const grossMainSalary = income.main.salary * 10000 * 12;
    const grossMainBonus = income.main.bonus * 10000;

    const grossPartnerSalary = income.partner.salary * 10000 * 12;
    const grossPartnerBonus = income.partner.bonus * 10000;

    // Helper to calculating months of leave in a specific simulation year (1-index)
    const getLeaveMonths = (personYear, startYear, duration) => {
      if (!startYear || !duration) return 0;
      // Leave is from startYear to startYear + duration / 12 ...
      // Simplification: leave starts at beginning of startYear? Or mid year?
      // Let's assume startYear means "The year leave starts".
      // If duration > 12, it spills over.

      const startMonthTotal = (startYear - 1) * 12; // Start of simulation is month 0? No, year 1 starts at month 0.
      // Let's say Year 1 is months 0-11. Year 2 is 12-23.
      // Leave starts at startYear (Jan).
      const leaveStartTotal = (startYear - 1) * 12;
      const leaveEndTotal = leaveStartTotal + duration;

      const currentYearStart = (personYear - 1) * 12;
      const currentYearEnd = currentYearStart + 12;

      // Overlap
      const overlapStart = Math.max(leaveStartTotal, currentYearStart);
      const overlapEnd = Math.min(leaveEndTotal, currentYearEnd);

      if (overlapStart < overlapEnd) {
        return overlapEnd - overlapStart;
      }
      return 0;
    };

    // Variables to track cumulative leave for tiering (80%/67%/50%)
    let cumulativeLeaveMain = 0;
    let cumulativeLeavePartner = 0;

    // Create 35-year schedule
    return Array.from({ length: 35 }, (_, i) => {
      let yearIncome = 0;
      let breakdown = {
        salary: 0,
        bonus: 0,
        business: 0,
        pension: 0, // Old Age
        survivor: { basic: 0, welfare: 0, widow: 0, total: 0 },
        insurance: 0,
        retirement: 0,
        leaveBenefit: 0 // New field
      };

      const currentYear = i + 1;

      // --- Main Person Logic ---
      const mainCurrentAge = income.main.age + i;
      const mainDead = deathSettings.main.enabled && mainCurrentAge >= deathSettings.main.age;

      if (!mainDead) {
        // ... (Logic helpers) ...
        const getAdjustedGross = (personIncome, baseSalary, baseBonus) => {
          let adjSalary = baseSalary;
          let adjBonus = baseBonus;
          const { hasJitan, jitan } = personIncome;
          if (hasJitan && jitan && jitan.duration > 0 && currentYear >= jitan.startYear && currentYear < jitan.startYear + jitan.duration) {
            const ratio = Math.max(0, jitan.ratio) / 100;
            adjSalary *= ratio;
            adjBonus *= ratio;
          }
          return { adjSalary, adjBonus };
        };

        const getSideBusinessNet = (personIncome) => {
          const { hasSideBusiness, sideBusiness } = personIncome;
          if (hasSideBusiness && sideBusiness && sideBusiness.annual > 0) {
            const startYear = sideBusiness.startYear || 1;
            const duration = sideBusiness.duration || 35;
            if (currentYear >= startYear && currentYear < startYear + duration) {
              const annualSideGross = sideBusiness.annual * 10000;
              return estimateNetIncome(annualSideGross);
            }
          }
          return 0;
        };

        const getJitanBenefit = (personIncome, adjSalary, adjBonus, monthsLeave) => {
          const { hasJitan, jitan } = personIncome;
          const isJitanActive = hasJitan && jitan && jitan.duration > 0 && currentYear >= jitan.startYear && currentYear < jitan.startYear + jitan.duration;
          if (!isJitanActive) return 0;
          const hasUnder2Child = children.some(child => {
            const childAge = child.age + i;
            return childAge < 2;
          });
          if (hasUnder2Child) {
            const workRatio = Math.max(0, 12 - monthsLeave) / 12;
            const workingGross = (adjSalary + adjBonus) * workRatio;
            return workingGross * 0.10;
          }
          return 0;
        };

        // Side Business
        const sb = getSideBusinessNet(income.main);
        breakdown.business += sb;
        yearIncome += sb;

        // Retirement
        if (mainCurrentAge === income.main.retirementAge) {
          const config = income.main.retirementConfig || { method: 'manual', serviceStartAge: 22, multiplier: 1.0 };
          const yearsService = Math.max(1, income.main.retirementAge - config.serviceStartAge);
          let grossAllowanceMan = income.main.retirementAllowance || 0;
          if (config.method === 'auto') {
            const growthRate = (income.main.salaryIncrease || 0) / 100;
            const projectedAnnualSalary = grossMainSalary * Math.pow(1 + growthRate, i);
            const projectedMonthlySalary = projectedAnnualSalary / 12;
            const grossAllowanceYen = projectedMonthlySalary * yearsService * config.multiplier;
            grossAllowanceMan = grossAllowanceYen / 10000;
          }
          const retInc = calculateRetirementNet(grossAllowanceMan, yearsService);
          breakdown.retirement += retInc;
          yearIncome += retInc;
        }

        // Pension (If Alive)
        if (mainCurrentAge >= (income.main.pension?.startAge || 65)) {
          const config = income.main.pensionConfig || { method: 'manual', serviceStartAge: 22 };
          let monthlyPensionMan = income.main.pension?.monthly || 0;
          if (config.method === 'auto') {
            const annualGrossMan = (income.main.salary * 12) + (income.main.bonus || 0);
            monthlyPensionMan = calculatePensionEstimate(annualGrossMan, mainCurrentAge, config.serviceStartAge, income.main.retirementAge);
          }
          const penInc = monthlyPensionMan * 10000 * 12;
          breakdown.pension += penInc;
          yearIncome += penInc;
        }

        // Working Income
        if (mainCurrentAge < income.main.retirementAge) {
          const growthRate = (income.main.salaryIncrease || 0) / 100;
          const currentSalary = grossMainSalary * Math.pow(1 + growthRate, i);
          const currentBonus = grossMainBonus * Math.pow(1 + growthRate, i);
          const { adjSalary, adjBonus } = getAdjustedGross(income.main, currentSalary, currentBonus);
          const monthsLeave = income.main.hasLeave ? getLeaveMonths(currentYear, income.main.leaveStartYear, income.main.leaveDurationMonths) : 0;
          const prevLeave = cumulativeLeaveMain;
          cumulativeLeaveMain += monthsLeave;



          /* Refactor for Leave Benefit Separation */
          const netObj = calculateAdjustedNetIncome(adjSalary, adjBonus, monthsLeave, income.main.applyNewBenefit, prevLeave);
          // netObj = { total, workedNet, allowance }
          const jitanBenefit = getJitanBenefit(income.main, adjSalary, adjBonus, monthsLeave);

          breakdown.salary += netObj.workedNet + jitanBenefit;
          breakdown.leaveBenefit += netObj.allowance;
          yearIncome += netObj.total + jitanBenefit;
        }

      } else {
        // Main IS DEAD
        const currentChildren = children.map(c => ({ age: c.age + i }));
        const deceased = {
          annualSalary: (income.main.salary * 12) + (income.main.bonus || 0),
          startAge: income.main.retirementConfig?.serviceStartAge || 22,
          deathAge: deathSettings.main.age
        };
        const survivor = {
          age: income.partner.age + i,
          isWife: true
        };

        // Add Pension (Object Return)
        const sp = calculateSurvivorPension(deceased, survivor, currentChildren);
        breakdown.survivor.total += sp.total;
        breakdown.survivor.basic += sp.breakdown?.basic || 0;
        breakdown.survivor.welfare += sp.breakdown?.welfare || 0;
        breakdown.survivor.widow += sp.breakdown?.widow || 0;
        yearIncome += sp.total;

        // Private Insurance
        if (currentChildren.length > 0) {
          const youngestAge = Math.min(...currentChildren.map(c => c.age));
          if (youngestAge <= insurance.main.benefitDurationYears) {
            const benefitYen = (insurance.main.benefitMonthly || 0) * 10000;
            const annBenefit = benefitYen * 12;
            breakdown.insurance += annBenefit;
            yearIncome += annBenefit;
          }
        }
      }

      // --- Partner Logic ---
      const partnerCurrentAge = income.partner.age + i;
      const partnerDead = deathSettings.partner.enabled && partnerCurrentAge >= deathSettings.partner.age;

      if (!partnerDead) {
        if (isPairLoan) {
          const getAdjustedGrossP = (personIncome, baseSalary, baseBonus) => {
            let adjSalary = baseSalary;
            let adjBonus = baseBonus;
            // ... same helpers ...
            const { hasJitan, jitan } = personIncome;
            if (hasJitan && jitan && jitan.duration > 0 && currentYear >= jitan.startYear && currentYear < jitan.startYear + jitan.duration) {
              const ratio = Math.max(0, jitan.ratio) / 100;
              adjSalary *= ratio;
              adjBonus *= ratio;
            }
            return { adjSalary, adjBonus };
          };
          const getSideBusinessNetP = (personIncome) => {
            const { hasSideBusiness, sideBusiness } = personIncome;
            if (hasSideBusiness && sideBusiness && sideBusiness.annual > 0) {
              const startYear = sideBusiness.startYear || 1;
              const duration = sideBusiness.duration || 35;
              if (currentYear >= startYear && currentYear < startYear + duration) {
                const annualSideGross = sideBusiness.annual * 10000;
                return estimateNetIncome(annualSideGross);
              }
            }
            return 0;
          };
          const getJitanBenefitP = (personIncome, adjSalary, adjBonus, monthsLeave) => {
            const { hasJitan, jitan } = personIncome;
            const isJitanActive = hasJitan && jitan && jitan.duration > 0 && currentYear >= jitan.startYear && currentYear < jitan.startYear + jitan.duration;
            if (!isJitanActive) return 0;
            const hasUnder2Child = children.some(child => {
              const childAge = child.age + i;
              return childAge < 2;
            });
            if (hasUnder2Child) {
              const workRatio = Math.max(0, 12 - monthsLeave) / 12;
              const workingGross = (adjSalary + adjBonus) * workRatio;
              return workingGross * 0.10;
            }
            return 0;
          };

          const sbP = getSideBusinessNetP(income.partner);
          breakdown.business += sbP;
          yearIncome += sbP;

          if (partnerCurrentAge === income.partner.retirementAge) {
            const config = income.partner.retirementConfig || { method: 'manual', serviceStartAge: 22, multiplier: 1.0 };
            const yearsService = Math.max(1, income.partner.retirementAge - config.serviceStartAge);
            let grossAllowanceMan = income.partner.retirementAllowance || 0;
            if (config.method === 'auto') {
              const growthRate = (income.partner.salaryIncrease || 0) / 100;
              const projectedAnnualSalary = grossPartnerSalary * Math.pow(1 + growthRate, i);
              const projectedMonthlySalary = projectedAnnualSalary / 12;
              const grossAllowanceYen = projectedMonthlySalary * yearsService * config.multiplier;
              grossAllowanceMan = grossAllowanceYen / 10000;
            }
            const retIncP = calculateRetirementNet(grossAllowanceMan, yearsService);
            breakdown.retirement += retIncP;
            yearIncome += retIncP;
          }

          if (partnerCurrentAge >= (income.partner.pension?.startAge || 65)) {
            const config = income.partner.pensionConfig || { method: 'manual', serviceStartAge: 22 };
            let monthlyPensionMan = income.partner.pension?.monthly || 0;
            if (config.method === 'auto') {
              const annualGrossMan = (income.partner.salary * 12) + (income.partner.bonus || 0);
              monthlyPensionMan = calculatePensionEstimate(annualGrossMan, partnerCurrentAge, config.serviceStartAge, income.partner.retirementAge);
            }
            const penIncP = monthlyPensionMan * 10000 * 12;
            breakdown.pension += penIncP;
            yearIncome += penIncP;
          }

          if (partnerCurrentAge < income.partner.retirementAge) {
            const growthRate = (income.partner.salaryIncrease || 0) / 100;
            const currentSalary = grossPartnerSalary * Math.pow(1 + growthRate, i);
            const currentBonus = grossPartnerBonus * Math.pow(1 + growthRate, i);
            const { adjSalary, adjBonus } = getAdjustedGrossP(income.partner, currentSalary, currentBonus);
            const monthsLeave = income.partner.hasLeave ? getLeaveMonths(currentYear, income.partner.leaveStartYear, income.partner.leaveDurationMonths) : 0;
            const prevLeave = cumulativeLeavePartner;
            cumulativeLeavePartner += monthsLeave;

            /* Refactor for Leave Benefit Separation */
            const netObjP = calculateAdjustedNetIncome(adjSalary, adjBonus, monthsLeave, income.partner.applyNewBenefit, prevLeave);
            // workIncP is no longer single string
            let workIncP = netObjP.workedNet + getJitanBenefitP(income.partner, adjSalary, adjBonus, monthsLeave);

            // Add benefit separation to breakdown
            breakdown.salary += workIncP;
            breakdown.leaveBenefit += netObjP.allowance;
            yearIncome += netObjP.total + getJitanBenefitP(income.partner, adjSalary, adjBonus, monthsLeave);


          }
        }
      } else {
        // Partner IS DEAD
        const currentChildren = children.map(c => ({ age: c.age + i }));
        const deceased = {
          annualSalary: (income.partner.salary * 12) + (income.partner.bonus || 0),
          startAge: income.partner.retirementConfig?.serviceStartAge || 22,
          deathAge: deathSettings.partner.age
        };
        const survivor = {
          age: income.main.age + i,
          isWife: false // Surviving Partner is Husband (Main)
        };

        const sp = calculateSurvivorPension(deceased, survivor, currentChildren);
        breakdown.survivor.total += sp.total;
        breakdown.survivor.basic += sp.breakdown?.basic || 0;
        breakdown.survivor.welfare += sp.breakdown?.welfare || 0;
        breakdown.survivor.widow += sp.breakdown?.widow || 0;
        yearIncome += sp.total;

        // Private Insurance
        if (currentChildren.length > 0) {
          const youngestAge = Math.min(...currentChildren.map(c => c.age));
          if (youngestAge <= insurance.partner.benefitDurationYears) {
            const benefitYen = (insurance.partner.benefitMonthly || 0) * 10000;
            const annBenefit = benefitYen * 12;
            breakdown.insurance += annBenefit;
            yearIncome += annBenefit;
          }
        }
      }

      return { total: yearIncome, breakdown };
    });
  }, [income, isPairLoan, children, deathSettings, insurance]);

  // V7: Investment Flow
  const investmentFlow = useMemo(() => {
    return calculateInvestmentFlow(assets);
  }, [assets]);

  // Asset Simulation
  const assetData = useMemo(() => {
    // Other Annual Expenses (Private Insurance)
    const otherExpenses = Array.from({ length: 35 }, (_, i) => {
      let premium = 0;
      const mainAge = income.main.age + i;
      const partnerAge = income.partner.age + i;
      const mainDead = deathSettings.main.enabled && mainAge >= deathSettings.main.age;
      const partnerDead = deathSettings.partner.enabled && partnerAge >= deathSettings.partner.age;
      if (!mainDead) premium += (insurance.main.premium || 0);
      if (!partnerDead) premium += (insurance.partner.premium || 0);
      return premium * 12; // Yen
    });

    // Fixed Asset Tax
    let fixedAssetCosts;
    if (property.fixedAssetTax?.method === 'manual') {
      const manualYen = (property.fixedAssetTax.manualAmount || 0) * 10000;
      fixedAssetCosts = new Array(35).fill(manualYen);
    } else {
      fixedAssetCosts = calculateFixedAssetTaxSchedule(property, 35);
    }

    // Calculate Net Initial Savings (Deduct Initial Costs)
    const totalInitialExp = initialExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netInitialSavings = (assets.initialSavings || 0)
      - (property.deposit || 0)
      - (property.downPayment || 0)
      - totalInitialExp;

    const effectiveAssetsConfig = {
      ...assets,
      initialSavings: netInitialSavings
    };

    return calculateAssets(
      incomeSchedule.map(d => d.total + d.breakdown.survivor.total + d.breakdown.insurance + d.breakdown.leaveBenefit),
      mortgageData.map(d => d.annualPayment),
      educationData,
      totalMonthlyLivingCost * 12, // Annual Living Cost
      fixedAssetCosts,
      investmentFlow,
      effectiveAssetsConfig,
      otherExpenses
    );
  }, [incomeSchedule, mortgageData, educationData, totalMonthlyLivingCost, investmentFlow, assets, insurance, property, initialExpenses, income, deathSettings]);


  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title">
          <Home />
          Life Simulation
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> 保存
          </button>
          <button className="btn-secondary" onClick={() => fileInputRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={16} /> 読込
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json,application/json"
            onChange={handleImport}
          />
        </div>
      </header>

      <main className="main-content">
        <aside className="sidebar">
          <IncomeForm
            income={income}
            setIncome={setIncome}
            isPairLoan={isPairLoan}
            setIsPairLoan={setIsPairLoan}
          />
          <InsuranceForm
            insurance={insurance}
            setInsurance={setInsurance}
          />
          <DeathSettingsForm
            deathSettings={deathSettings}
            setDeathSettings={setDeathSettings}
          />
          <AssetForm
            assets={assets}
            setAssets={setAssets}
          />
          <MortgageForm
            amount={loanAmount}
            setAmount={setLoanAmount}
            bonusPrincipal={bonusPrincipal}
            setBonusPrincipal={setBonusPrincipal}
            rates={rates}
            setRates={setRates}
            isPairLoan={isPairLoan}
            pairLoanConfig={pairLoanConfig}
            setPairLoanConfig={setPairLoanConfig}
            hasDeduction={hasDeduction}
            setHasDeduction={setHasDeduction}
            property={property}
            setProperty={setProperty}
            initialExpenses={initialExpenses}
            setInitialExpenses={setInitialExpenses}
          />
          <ExpenseForm
            expenses={expenses}
            setExpenses={setExpenses}
          />
          <FamilyForm
            childrenData={children}
            setChildrenData={setChildren}
            isTokyo={isTokyo}
            setIsTokyo={setIsTokyo}
            hasAllowance={hasAllowance}
            setHasAllowance={setHasAllowance}
            isFreeNursery={isFreeNursery}
            setIsFreeNursery={setIsFreeNursery}
          />
        </aside>

        <section className="dashboard-section">
          <Dashboard
            mortgageData={mortgageData}
            educationData={educationData}
            baseLivingCost={totalMonthlyLivingCost}
            incomeSchedule={incomeSchedule}
            taxDeductionData={taxDeductionData}
            assetData={assetData}
            investmentFlow={investmentFlow}
            allowanceData={allowanceData}
            isPairLoan={isPairLoan}
            childCount={children.length}
            // Configuration for AI Context
            loanAmount={loanAmount}
            bonusPrincipal={bonusPrincipal}
            rates={rates}
            expensesList={expenses}
            incomeConfig={income}
            assetsConfig={assets}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
