
export const PAYMENT_TYPE = {
    BONUS: 'BONUS',
    MONTHLY: 'MONTHLY'
};

/**
 * Calculate yearly mortgage payments with variable interest rates.
 * Supports Bonus Repayment differentiation.
 * 
 * @param {number} totalLoanAmount - Total loan (Yen)
 * @param {number} bonusPrincipal - Amount of loan allocated to bonus repayment (Yen)
 * @param {Array<number>} rates - Array of annual interest rates (percent) for each 5-year block
 * @returns {Array<object>} Yearly data
 */
export function calculateMortgage(totalLoanAmount, bonusPrincipal, rates) {
    // 1. Monthly Portion
    const monthlyPrincipal = totalLoanAmount - bonusPrincipal;

    // 2. Bonus Portion
    // Bonus payments usually happen 2x a year (e.g., Jul/Dec).
    // We calculate it as if it's a loan with 2 payments per year.
    // Or simpler: Convert annual rate to semi-annual rate?
    // Standard practice: Treat as distinct amortization schedule.

    const monthlyData = calculateSubLoan(monthlyPrincipal, rates, 12);
    const bonusData = calculateSubLoan(bonusPrincipal, rates, 2);

    // Merge Data
    const yearlyData = [];
    const TOTAL_YEARS = 35;

    for (let i = 0; i < TOTAL_YEARS; i++) {
        const m = monthlyData[i];
        const b = bonusData[i];

        yearlyData.push({
            year: i + 1,
            rate: m.rate,
            annualPayment: m.annualPayment + b.annualPayment,
            monthlyPayment: Math.round(m.annualPayment / 12),
            bonusPayment: Math.round(b.annualPayment / 2),
            interestPaid: m.interestPaid + b.interestPaid,
            principalPaid: m.principalPaid + b.principalPaid,
            remainingPrincipal: m.remainingPrincipal + b.remainingPrincipal
        });
    }

    return yearlyData;
}

function calculateSubLoan(principal, rates, paymentsPerYear) {
    let currentPrincipal = principal;
    const yearlyData = [];
    const TOTAL_YEARS = 35;
    const BLOCK_SIZE = 5;

    for (let year = 1; year <= TOTAL_YEARS; year++) {
        const rateIndex = Math.floor((year - 1) / BLOCK_SIZE);
        const annualRatePct = rates[rateIndex] || rates[rates.length - 1] || 0.5;
        const annualRate = annualRatePct / 100;

        // Rate for one payment period
        const periodRate = annualRate / paymentsPerYear;

        // Remaining periods
        const remainingYears = TOTAL_YEARS - (year - 1);
        const remainingPeriods = remainingYears * paymentsPerYear;

        let periodPayment = 0;

        if (principal <= 0) {
            // Handle explicit 0 principal case
            periodPayment = 0;
        } else if (periodRate === 0) {
            periodPayment = currentPrincipal / remainingPeriods;
        } else {
            periodPayment = (currentPrincipal * periodRate * Math.pow(1 + periodRate, remainingPeriods)) / (Math.pow(1 + periodRate, remainingPeriods) - 1);
        }

        let yearPayment = 0;
        let yearInterest = 0;
        let yearPrincipalPaid = 0;

        for (let p = 0; p < paymentsPerYear; p++) {
            const interest = currentPrincipal * periodRate;
            let principalPart = periodPayment - interest;

            if (currentPrincipal - principalPart < 0 || (year === TOTAL_YEARS && p === paymentsPerYear - 1)) {
                // Adjust last payment
                principalPart = currentPrincipal;
                periodPayment = principalPart + interest;
            }

            currentPrincipal -= principalPart;

            yearPayment += periodPayment;
            yearInterest += interest;
            yearPrincipalPaid += principalPart;
        }

        yearlyData.push({
            year,
            rate: annualRatePct,
            annualPayment: Math.round(yearPayment),
            interestPaid: Math.round(yearInterest),
            principalPaid: Math.round(yearPrincipalPaid),
            remainingPrincipal: Math.max(0, Math.round(currentPrincipal))
        });
    }
    return yearlyData;
}

/**
 * Estimate Education Cost
 * @param {Array<{age: number, type: 'public'|'private'}>} children
 * @param {boolean} isTokyo - Apply Tokyo 2024 tuition-free rules
 * @param {boolean} isFreeNursery - Apply Free Nursery/Childcare rules
 * Data source: MEXT (Ministry of Education) averages (approximate)
 */
export function calculateEducation(children, isTokyo = false, isFreeNursery = false) {
    // Approximate annual costs in Yen
    const COSTS = {
        nursery: 480000,
        kindergarten_public: 220000,
        kindergarten_private: 500000,
        elementary_public: 320000,
        elementary_private: 1600000,
        junior_public: 490000,
        junior_private: 1400000,
        high_public: 460000,
        high_private: 970000,
        uni_public: 820000, // National avg roughly
        uni_private_arts: 1200000,
        uni_private_science: 1600000,
    };

    // Subsidies (Tokyo 2024 / National)
    const SUBSIDY = {
        nursery_free: 480000, // Cap for free nursery
        kindergarten_free: 308000, // National cap (25,700/mo)
        hs_public: 120000, // National support
        hs_private: 480000, // Tokyo support approx
        uni_public: 540000, // Reduced tuition
    };

    const yearlyCosts = Array(35).fill(0);

    children.forEach(child => {
        let currentAge = child.age;
        // Default education path if not defined
        const edu = child.education || {
            kindergarten: 'public',
            elementary: 'public',
            juniorHigh: 'public',
            highSchool: 'public',
            university: 'private_arts'
        };

        for (let i = 0; i < 35; i++) {
            const age = currentAge + i;
            let cost = 0;

            if (age >= 0 && age <= 2) {
                // Nursery (0-2)
                // If free nursery enabled, cost is 0. Otherwise standard.
                cost = isFreeNursery ? 0 : COSTS.nursery;
            } else if (age >= 3 && age <= 5) {
                // Kindergarten (3-5)
                const type = edu.kindergarten;
                const base = type === 'private' ? COSTS.kindergarten_private : COSTS.kindergarten_public;
                // Free nursery/kindergarten applies here too (3-5 is free nationally mostly)
                // Use isFreeNursery flag as "Apply Free Rules"
                if (isFreeNursery) {
                    cost = Math.max(0, base - SUBSIDY.kindergarten_free);
                } else {
                    cost = base;
                }
            }
            else if (age >= 6 && age <= 11) {
                // Elementary
                cost = edu.elementary === 'private' ? COSTS.elementary_private : COSTS.elementary_public;
            }
            else if (age >= 12 && age <= 14) {
                // Junior High
                cost = edu.juniorHigh === 'private' ? COSTS.junior_private : COSTS.junior_public;
            }
            else if (age >= 15 && age <= 17) {
                // High School
                const type = edu.highSchool;
                let base = type === 'private' ? COSTS.high_private : COSTS.high_public;

                // Tokyo Subsidy Logic
                if (isTokyo) {
                    // Full tuition support logic approximation
                    const subsidy = type === 'private' ? SUBSIDY.hs_private : SUBSIDY.hs_public;
                    cost = Math.max(0, base - subsidy);
                } else {
                    cost = base;
                }
            }
            else if (age >= 18 && age <= 21) {
                // University
                const type = edu.university;
                let base = 0;
                if (type === 'public') base = COSTS.uni_public;
                else if (type === 'private_science') base = COSTS.uni_private_science;
                else base = COSTS.uni_private_arts; // default private

                if (isTokyo && type === 'public') {
                    // Tokyo Metro Univ equivalent subsidy
                    base = Math.max(0, base - SUBSIDY.uni_public);
                }
                cost = base;
            }

            yearlyCosts[i] += cost;
        }
    });

    return yearlyCosts;
}

/**
 * Estimate annual Net Income from Gross Income.
 * Simplified progressive tax/social insurance approximation.
 * @param {number} annualGross - Annual Gross Income (Yen)
 * @returns {number} Net Income (Yen)
 */
export function estimateNetIncome(annualGross) {
    // Very rough approximation for Japan:
    // < 3M: ~80%
    // 3M - 6M: ~78%
    // 6M - 10M: ~75%
    // > 10M: ~70% or less
    let rate = 0.8;
    if (annualGross > 10000000) rate = 0.70;
    else if (annualGross > 6000000) rate = 0.75;
    else if (annualGross > 3000000) rate = 0.78;

    return annualGross * rate;
}

/**
 * Calculate Housing Loan Tax Deduction (13 years).
 * @param {Array<object>} mortgageData - The simulation result
 * @returns {Array<number>} Array of refund amounts for 35 years
 */
export function calculateTaxDeduction(mortgageData, propertyConfig = null) {
    // Current rules (2024-2025 for Child/Young Couple, Simplified): 
    // Deduction Rate: 0.7%
    // Duration: 13 years

    // Borrowing Limits:
    // Long-term / Low Carbon: 45M
    // ZEH Level: 35M
    // General (New): 30M (assuming child-rearing)
    // Non-New/Other: 20M or 0 depending on year. Assuming New for simplicity or 20M.

    let borrowingLimit = 30000000; // Default General

    if (propertyConfig && propertyConfig.buildingType) {
        switch (propertyConfig.buildingType) {
            case 'longterm':
                borrowingLimit = 45000000;
                break;
            case 'zeh':
                borrowingLimit = 35000000;
                break;
            case 'general':
            default:
                borrowingLimit = 30000000;
                break;
        }
    } else {
        // Fallback or legacy (assume ZEH level as safe middle or keep existing 210k max logic?)
        // Previous logic was 210,000 max deduction => 30M limit (30M * 0.007 = 210k).
        borrowingLimit = 30000000;
    }

    const RATE = 0.007; // 0.7%
    const DURATION = 13;

    return mortgageData.map((data, index) => {
        if (index >= DURATION) return 0;

        // Deduction is calculated on Year-End Balance
        // Capped by Borrowing Limit
        const balance = Math.min(data.remainingPrincipal, borrowingLimit);

        const deduction = balance * RATE;
        return Math.floor(deduction);
    });
}

/**
 * Calculate Asset Transition (35 years)
 * @param {Array<number>} incomeSchedule - Annual Net Income schedule (Yen)
 * @param {Array<number>} mortgagePayments - Annual Mortgage Payment (Yen)
 * @param {Array<number>} educationCosts - Annual Education Cost (Yen)
 * @param {number} annualLivingCost - Annual Base Living Cost (Yen)
 * @param {Array<number>} investmentFlow - Annual Investment Contribution (Yen)
 * @param {object} assetsConfig - { initialSavings: number(Man), investments: Array }
 * @returns {object} { totalAssets, cashAssets, investmentAssets } (Array<number> Yen)
 */
export function calculateAssets(
    incomeSchedule,
    mortgagePayments,
    educationCosts,
    annualLivingCost,
    fixedAssetCosts,
    investmentFlow,
    assetsConfig,
    otherAnnualExpenses = []
) {
    const years = 35;
    const cashAssets = [];
    const investmentAssets = [];
    const totalAssets = [];
    const fixedAssetHistory = [];

    // Initial state (Convert Man-yen to Yen)
    let currentCash = (assetsConfig.initialSavings || 0) * 10000;

    // Initialize Investments
    let currentInvestments = assetsConfig.investments.map(inv => ({
        ...inv,
        currentValue: (inv.initial || 0) * 10000
    }));

    for (let i = 0; i < years; i++) {
        // 1. Income
        const income = incomeSchedule[i] || 0;
        const tax = fixedAssetCosts[i] || 0;

        // 2. Expenses
        const expense = (mortgagePayments[i] || 0) + (educationCosts[i] || 0) + annualLivingCost + tax + (otherAnnualExpenses[i] || 0);

        // 3. Investment Flow (Out from Cash, In to Investments)
        const investmentIn = investmentFlow[i] || 0;

        // 4. Update Investment Values (Growth + Contribution)
        let totalInvValue = 0;
        currentInvestments = currentInvestments.map(inv => {
            const duration = inv.duration || 35;
            let contribution = 0;
            if (i < duration) {
                contribution = (inv.monthly || 0) * 10000 * 12;
            }

            // Note: investmentIn is sum of all contributions, so it matches the sum of individual contributions here.

            const rate = (inv.rate || 0) / 100;
            const updatedValue = (inv.currentValue + contribution) * (1 + rate);

            return { ...inv, currentValue: updatedValue };
        });

        totalInvValue = currentInvestments.reduce((sum, inv) => sum + inv.currentValue, 0);

        // 5. Update Cash
        // Cash = PrevCash + Income - Expenses - Investment Contributions
        currentCash = currentCash + income - expense - investmentIn;

        cashAssets.push(currentCash);
        investmentAssets.push(totalInvValue);
        totalAssets.push(currentCash + totalInvValue);
        fixedAssetHistory.push(tax);
    }

    return { cashAssets, investmentAssets, totalAssets, fixedAssetHistory };
}

/**
 * Calculate Annual Investment Flow (Total contributions per year)
 * @param {object} assetsConfig - { investments: Array }
 * @returns {Array<number>} Array of annual contributions (Yen)
 */
export function calculateInvestmentFlow(assetsConfig) {
    const years = 35;
    const flow = [];
    const investments = assetsConfig.investments || [];

    for (let i = 0; i < years; i++) {
        let annualTotal = 0;
        investments.forEach(inv => {
            const duration = inv.duration || 35;
            if (i < duration) {
                annualTotal += (inv.monthly || 0) * 10000 * 12;
            }
        });
        flow.push(annualTotal);
    }
    return flow;
}

/**
 * Calculate Annual Net Income adjusting for Parental Leave (Ikukyu).
 * @param {number} annualGrossSalary - Full annual gross salary (Yen)
 * @param {number} annualGrossBonus - Full annual gross bonus (Yen)
 * @param {number} monthsOfLeave - Number of months on leave this year (0-12)
 * @param {boolean} applyNewBenefit - Whether to receive benefits (checked=Standard+2025 Boost, unchecked=0)
 * @param {number} previousLeaveMonths - Cumulative months of leave taken in prior years
 * @returns {number} Adjusted Net Income (Yen)
 */
export function calculateAdjustedNetIncome(annualGrossSalary, annualGrossBonus, monthsOfLeave, applyNewBenefit = false, previousLeaveMonths = 0) {
    if (monthsOfLeave <= 0) {
        const total = estimateNetIncome(annualGrossSalary + annualGrossBonus);
        return {
            total: Math.floor(total),
            workedNet: Math.floor(total),
            allowance: 0
        };
    }

    // Pro-rate Working Income
    const workedMonths = Math.max(0, 12 - monthsOfLeave);
    const workedSalaryGross = (annualGrossSalary / 12) * workedMonths;
    const workedBonusGross = (annualGrossBonus / 12) * workedMonths; // Simplified pro-ration
    const workedNet = estimateNetIncome(workedSalaryGross + workedBonusGross);

    // Calculate Leave Allowance (Tax Free)
    // Rule:
    // Checked: Apply Benefit. First 1 month 80% (New Rule), month 2-6 67%, thereafter 50%.
    // Unchecked: 0 Allowance.

    // We iterate each month of leave to apply the correct tier based on cumulative duration.
    const monthlyGross = annualGrossSalary / 12;
    let allowance = 0;

    if (applyNewBenefit) {
        for (let m = 0; m < monthsOfLeave; m++) {
            const currentLeaveMonth = previousLeaveMonths + m; // 0-indexed (0 = 1st month)
            let rate = 0.50; // Default Low Rate (after 6 months)

            if (currentLeaveMonth === 0) {
                // First Month (Max 28 days) -> 80%
                rate = 0.80;
            } else if (currentLeaveMonth < 6) {
                // Next 5 months (Month 1 to 5) -> 67%
                rate = 0.67;
            }

            allowance += monthlyGross * rate;
        }
    }

    // Total Net = Worked Net (Taxed) + Allowance (Tax Free)
    /* 
       Refactor V8: Return object for breakdown
       Old Return: number (total)
       New Return: { total: number, workedNet: number, allowance: number }
    */
    const total = Math.floor(workedNet + allowance);
    return {
        total,
        workedNet: Math.floor(workedNet),
        allowance: Math.floor(allowance)
    };
}

/**
 * Calculate Child Allowance (Jidou Teate)
 * @param {Array<{age: number}>} children
 * @returns {Array<number>} Annual allowance total for 35 years (Yen)
 */
export function calculateChildAllowance(children) {
    const yearlyAllowance = Array(35).fill(0);

    children.forEach(child => {
        let currentAge = child.age;
        for (let i = 0; i < 35; i++) {
            const age = currentAge + i;
            let allowance = 0;

            // 0-2 years: 15,000/mo = 180,000/yr
            // 3-18 years: 10,000/mo = 120,000/yr (Until High School Grad = 18 ends)

            if (age < 3) {
                allowance = 15000 * 12;
            } else if (age <= 18) {
                allowance = 10000 * 12;
            }

            yearlyAllowance[i] += allowance;
        }
    });

    return yearlyAllowance;
}

/**
 * Calculate Net Retirement Allowance (Gross to Net)
 * Based on Japanese Tax Law (Retirement Income Deduction)
 * @param {number} grossAmountMan - Gross Amount in Man-yen
 * @param {number} yearsOfService - Years of service
 * @returns {number} Net Amount in Yen
 */
export function calculateRetirementNet(grossAmountMan, yearsOfService = 38) {
    if (!grossAmountMan || grossAmountMan <= 0) return 0;

    const grossYen = grossAmountMan * 10000;

    // 1. Calculate Deduction
    let deduction = 0;
    if (yearsOfService <= 20) {
        deduction = 400000 * yearsOfService;
    } else {
        deduction = 8000000 + 700000 * (yearsOfService - 20);
    }

    // 2. Taxable Retirement Income = (Gross - Deduction) * 1/2
    const taxableIncome = Math.max(0, (grossYen - deduction) * 0.5);

    if (taxableIncome <= 0) {
        return grossYen; // No tax
    }

    // 3. Estimate Tax (Income Tax + Resident Tax)
    // Simplified Progressive Tax Rates for Income Tax
    // + Fixed 10% Resident Tax
    let incomeTax = 0;

    // Tax Brackets (Approximate)
    if (taxableIncome <= 1950000) incomeTax = taxableIncome * 0.05;
    else if (taxableIncome <= 3300000) incomeTax = taxableIncome * 0.10 - 97500;
    else if (taxableIncome <= 6950000) incomeTax = taxableIncome * 0.20 - 427500;
    else if (taxableIncome <= 9000000) incomeTax = taxableIncome * 0.23 - 636000;
    else if (taxableIncome <= 18000000) incomeTax = taxableIncome * 0.33 - 1536000;
    else incomeTax = taxableIncome * 0.40 - 2796000; // Cap at 40% bracket for simplicity

    // Resident Tax (10%)
    const residentTax = taxableIncome * 0.10;

    // Special Reconstruction Income Tax (2.1% of Income Tax)
    const reconstructionTax = incomeTax * 0.021;

    const totalTax = incomeTax + reconstructionTax + residentTax;

    return Math.floor(grossYen - totalTax);
}

/**
 * Calculate Estimated Monthly Pension (Net)
 * @param {number} annualGrossMan - Projected Annual Gross Income in Man-yen
 * @param {number} currentAge - Current Age
 * @param {number} startAge - Work Start Age (for Kosei Nenkin duration)
 * @param {number} retirementAge - Retirement Age
 * @returns {number} Monthly Net Pension in Man-yen
 */
export function calculatePensionEstimate(annualGrossMan, currentAge, startAge = 22, retirementAge = 65) {
    if (!annualGrossMan || annualGrossMan <= 0) return 0;

    // 1. National Pension (Kokumin Nenkin) - Fixed
    // Full amount ~6.6 Man/mo (2024). Assumes 40 years coverage.
    const kokuminFull = 6.6;

    // 2. Employees' Pension (Kosei Nenkin) - Earnings Related
    // Formula: Avg Monthly Remuneration * 0.005481 * Years of Coverage
    const monthlyRemunerationMan = annualGrossMan / 12;
    const yearsCoverage = Math.max(0, retirementAge - startAge);

    const koseiAmount = monthlyRemunerationMan * 0.005481 * yearsCoverage;

    // Total Gross
    const totalGross = kokuminFull + koseiAmount;

    // 3. Tax/Insurance Deduction estimate (approx 90% net)
    const netEstimate = totalGross * 0.9;

    return Math.floor(netEstimate * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate Fixed Asset Tax Schedule (Land + Building)
 * @param {object} property - Property configuration
 * @param {number} durationYears - Simulation duration (e.g., 35)
 * @returns {Array<number>} Array of annual tax amounts (Yen)
 */
export function calculateFixedAssetTaxSchedule(property, durationYears = 35) {
    const {
        landPrice = 0,
        landArea = 0,
        buildingPrice = 0,
        buildingArea = 0,
        structure = 'wood',
        isNew = true,
        isLongTerm = false,
        configs = {} // Default empty
    } = property;

    // Advanced Config Defaults
    const landRatio = configs.landRatio ?? 0.7;
    const buildingRatio = configs.buildingRatio ?? 0.6; // Market -> Initial Taxable Ratio
    const fixedRate = (configs.fixedRate ?? 1.4) / 100;
    const cityRate = (configs.cityRate ?? 0.3) / 100;

    if (!landPrice && !buildingPrice) return Array(durationYears).fill(0);

    const schedule = [];

    // --- LAND CALCULATION ---
    const landMarketYen = landPrice * 10000;
    const landTaxableBase = landMarketYen * landRatio;
    let annualLandTax = 0;

    if (landArea > 0) {
        // Fixed Asset Tax
        let taxableFixed = 0;
        if (landArea <= 200) {
            taxableFixed = landTaxableBase * (1 / 6);
        } else {
            const smallPart = (200 / landArea) * landTaxableBase * (1 / 6);
            const largePart = ((landArea - 200) / landArea) * landTaxableBase * (1 / 3);
            taxableFixed = smallPart + largePart;
        }
        const landFixedTax = taxableFixed * fixedRate;

        // City Planning Tax
        let taxableCity = 0;
        if (landArea <= 200) {
            taxableCity = landTaxableBase * (1 / 3);
        } else {
            const smallPart = (200 / landArea) * landTaxableBase * (1 / 3);
            const largePart = ((landArea - 200) / landArea) * landTaxableBase * (2 / 3);
            taxableCity = smallPart + largePart;
        }
        const landCityTax = taxableCity * cityRate;

        annualLandTax = landFixedTax + landCityTax;
    }

    // --- BUILDING CALCULATION ---
    const buildingMarketYen = buildingPrice * 10000;
    const initialBuildingTaxable = buildingMarketYen * buildingRatio;

    // New Construction Reduction (Shinchiku Keigen)
    // 1/2 reduction for Fixed Asset Tax for N years
    const isNewExemptionApplicable = isNew && buildingArea >= 50;
    let reductionYears = 0;
    if (isNewExemptionApplicable) {
        if (structure === 'wood' || structure === 'steel') {
            reductionYears = isLongTerm ? 5 : 3;
        } else { // RC
            reductionYears = isLongTerm ? 7 : 5;
        }
    }

    for (let i = 0; i < durationYears; i++) {
        // Depreciation (Legal Useful Life approximation via Age Correction Factor)
        // Simplified Linear Decline to 0.2 Floor
        // Wood: Drop to 0.2 in ~15-20 years (faster)
        // Steel: ~25-30 years
        // RC: ~40-50 years

        let declineDuration = 20; // Wood default
        if (structure === 'steel') declineDuration = 30;
        if (structure === 'rc') declineDuration = 45;

        // "Year 1" (i=0) is New -> Factor 1.0 (relative to Initial Taxable)

        // Linear Model: 1.0 down to 0.2
        const slope = (1.0 - 0.2) / declineDuration;
        const currentFactor = Math.max(0.2, 1.0 - (slope * i));

        const currentTaxable = Math.floor(initialBuildingTaxable * currentFactor);

        // Fixed Asset Tax
        let bFixedTax = currentTaxable * fixedRate;

        // Apply Reduction (First N years)
        if (i < reductionYears) {
            bFixedTax *= 0.5;
        }

        // City Planning Tax
        const bCityTax = currentTaxable * cityRate;

        const totalBuildingTax = bFixedTax + bCityTax;

        schedule.push(Math.floor(annualLandTax + totalBuildingTax));
    }

    return schedule;
}

/**
 * Calculate Annual Survivor Pension (Izoku Nenkin)
 * @param {object} deceasedProfile - { annualSalary: number(Man), startAge: number, deathAge: number }
 * @param {object} survivorProfile - { age: number, isWife: boolean }
 * @param {Array<{age: number}>} children - Children ages at the time of calculation (current year)
 * @returns {number} Annual Pension Amount (Yen)
 */
export function calculateSurvivorPension(deceasedProfile, survivorProfile, children) {
    let totalPension = 0;

    // 1. Survivor Basic Pension (Izoku Kiso Nenkin)
    // Req: Spouse with child < 18 (ends March 31 after 18th bday).
    // Base: 795,000 (FY2023 approx)
    const BASE_KISO = 795000;
    const CHILD_1_2 = 228700;
    const CHILD_3_PLUS = 76200;

    const eligibleChildren = children.filter(c => c.age <= 18); // Simplified "under 18"
    let basicPension = 0;

    if (eligibleChildren.length > 0) {
        basicPension += BASE_KISO;
        eligibleChildren.forEach((_, idx) => {
            if (idx < 2) basicPension += CHILD_1_2;
            else basicPension += CHILD_3_PLUS;
        });
    }

    // 2. Survivor Welfare Pension (Izoku Kosei Nenkin)
    // Req: Deceased was insured.
    // Amount: 3/4 of Old Age Kosei Nenkin.
    // Calculation: Avg Monthly Remuneration * 5.481/1000 * Months.
    // Guaranteed 300 months (25 years) if death < 300 months.

    // Estimate Monthly Remuneration from annual salary
    // (Simplification: assuming current salary represents career avg for estimation)
    const monthlyRemunerationMan = (deceasedProfile.annualSalary || 0) / 12; // Man-yen
    const monthlyRemunerationYen = monthlyRemunerationMan * 10000;

    // Calculate deemed working months (Start age to Death age)
    const actualWorkingYears = Math.max(0, deceasedProfile.deathAge - deceasedProfile.startAge);
    const actualWorkingMonths = actualWorkingYears * 12;
    const calcMonths = Math.max(300, actualWorkingMonths);

    // Full Old Age Calculation (Reward portion)
    const fullOldAgePension = monthlyRemunerationYen * (5.481 / 1000) * calcMonths;
    const survivorWelfarePension = fullOldAgePension * 0.75;

    // 3. Middle-aged Widow Addition (Chukorei Kafu Kasan)
    // Req: Wife, Age 40-65.
    // Condition: No Basic Pension (Children grown or no children).
    // If received Basic Pension previously, starts after it ends.
    // Amount: ~596,000
    const WIDOW_ADDITION = 596000;
    let widowAddition = 0;

    if (survivorProfile.isWife && survivorProfile.age >= 40 && survivorProfile.age < 65) {
        // If getting Basic Pension, Widow Addition is suspended.
        if (basicPension === 0) {
            // Check eligibility:
            // Must have been >40 at death OR had children who grew up.
            // Simplified: If currently 40-65 and no Basic Pension, Apply.
            widowAddition = WIDOW_ADDITION;
        }
    }

    // Total logic
    // Survivor gets: Basic (if kids) + Welfare + Widow (if eligible)
    totalPension = basicPension + survivorWelfarePension + widowAddition;

    return {
        total: Math.floor(totalPension),
        breakdown: {
            basic: Math.floor(basicPension),
            welfare: Math.floor(survivorWelfarePension),
            widow: Math.floor(widowAddition)
        }
    };
}
