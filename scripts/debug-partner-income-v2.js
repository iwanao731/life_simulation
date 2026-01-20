
// Mock of simulation.js functions
function estimateNetIncome(gross) {
    if (gross <= 0) return 0;
    // Simplified approximation (80%)
    return gross * 0.8;
}

function calculateAdjustedNetIncome(salary, bonus, leaveMonths, applyNewBenefit, prevLeave) {
    // Simplified: just return net of salary+bonus
    return estimateNetIncome(salary + bonus);
}

// Mock of App.jsx logic
function runSimulation() {
    // 1. Setup State exactly as initialized in App.jsx
    const isPairLoan = true; // User checks this
    const income = {
        main: {
            salary: 45, bonus: 120, age: 30, retirementAge: 65,
            leaveStartYear: 1, leaveDurationMonths: 0, applyNewBenefit: false,
            jitan: { startYear: 1, duration: 0, ratio: 100 },
            sideBusiness: { annual: 0, startYear: 1, duration: 0 }
        },
        partner: {
            salary: 30, bonus: 80, age: 30, retirementAge: 65,
            leaveStartYear: 1, leaveDurationMonths: 0, applyNewBenefit: false,
            jitan: { startYear: 1, duration: 0, ratio: 100 },
            // User enables side business: duration defaults to 10
            hasSideBusiness: true,
            sideBusiness: { annual: 100, startYear: 1, duration: 10 }
        }
    };

    // 2. Logic from App.jsx incomeSchedule calculation
    const schedule = Array.from({ length: 35 }, (_, i) => {
        let yearIncome = 0;
        const currentYear = i + 1;

        // Inputs
        const grossMainSalary = income.main.salary * 10000 * 12;
        const grossMainBonus = income.main.bonus * 10000;

        const grossPartnerSalary = income.partner.salary * 10000 * 12;
        const grossPartnerBonus = income.partner.bonus * 10000;

        // Helpers
        const getAdjustedGross = (personIncome, baseSalary, baseBonus) => {
            return { adjSalary: baseSalary, adjBonus: baseBonus };
        };

        const getSideBusinessNet = (personIncome) => {
            const { hasSideBusiness, sideBusiness } = personIncome;
            if (hasSideBusiness && sideBusiness && sideBusiness.duration > 0 && currentYear >= sideBusiness.startYear && currentYear < sideBusiness.startYear + sideBusiness.duration) {
                const annualSideGross = sideBusiness.annual * 10000;
                console.log(`[Year ${currentYear}] Partner SideBusiness Active: ${annualSideGross} Yen`);
                return estimateNetIncome(annualSideGross);
            }
            return 0;
        };

        const getJitanBenefit = () => 0;
        const getLeaveMonths = () => 0;
        const calculateAdjustedNetIncome = (s, b) => estimateNetIncome(s + b);

        // Main
        if (true) {
            yearIncome += estimateNetIncome(grossMainSalary + grossMainBonus);
            yearIncome += getSideBusinessNet(income.main);
        }

        // Partner
        if (isPairLoan) {
            const partnerCurrentAge = income.partner.age + i;
            if (partnerCurrentAge < income.partner.retirementAge) {
                console.log(`[Year ${currentYear}] Partner Active (Age ${partnerCurrentAge})`);
                yearIncome += estimateNetIncome(grossPartnerSalary + grossPartnerBonus);
                const sb = getSideBusinessNet(income.partner);
                console.log(`[Year ${currentYear}] Partner SB Added: ${sb}`);
                yearIncome += sb;
            }
        }

        return yearIncome;
    });

    return schedule;
}

const result = runSimulation();
console.log("Year 1 Total Income:", result[0]);
