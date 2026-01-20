
// Mocking the calculation logic from App.jsx and simulation.js

function estimateNetIncome(gross) {
    // Simplified Tax Logic
    if (gross <= 0) return 0;
    let deduction = 0;
    if (gross <= 1030000) deduction = gross;
    else if (gross <= 1625000) deduction = 550000;
    else if (gross <= 1800000) deduction = gross * 0.4 - 100000;
    else if (gross <= 3600000) deduction = gross * 0.3 + 80000;
    else if (gross <= 6600000) deduction = gross * 0.2 + 440000;
    else if (gross <= 8500000) deduction = gross * 0.1 + 1100000;
    else deduction = 1950000;

    const taxable = Math.max(0, gross - deduction - 480000);
    // Simplified tax rate
    let tax = 0;
    if (taxable <= 1950000) tax = taxable * 0.05;
    else if (taxable <= 3300000) tax = taxable * 0.1 - 97500;
    else tax = taxable * 0.2 - 427500;

    const socialInsurance = gross * 0.15;
    const net = gross - tax - socialInsurance;
    return Math.max(0, net);
}

const income = {
    main: { age: 30, retirementAge: 65, hasSideBusiness: false },
    partner: {
        age: 30,
        retirementAge: 65,
        hasSideBusiness: true,
        sideBusiness: {
            annual: 100, // 100 Man-yen
            startYear: 1,
            duration: 5
        },
        // Partner basic
        salary: 0,
        bonus: 0,
        hasJitan: false,
        hasLeave: false
    }
};

const isPairLoan = true;

// Logic from App.jsx
function calculateYear1Income() {
    let yearIncome = 0;
    const currentYear = 1;

    // Helper: Calculate Side Business Net Income
    const getSideBusinessNet = (personIncome) => {
        const { hasSideBusiness, sideBusiness } = personIncome;
        if (hasSideBusiness && sideBusiness && sideBusiness.duration > 0 && currentYear >= sideBusiness.startYear && currentYear < sideBusiness.startYear + sideBusiness.duration) {
            // Annual Gross in Yen
            const annualSideGross = sideBusiness.annual * 10000;
            console.log(`Calculating Side Business: Gross ${annualSideGross}`);
            const net = estimateNetIncome(annualSideGross);
            console.log(`Calculating Side Business: Net ${net}`);
            return net;
        }
        return 0;
    };

    if (isPairLoan) {
        // Partner Logic
        yearIncome += getSideBusinessNet(income.partner);
    }

    return yearIncome;
}

const result = calculateYear1Income();
console.log(`Year 1 Partner Income (Side Business Only): ${result}`);
