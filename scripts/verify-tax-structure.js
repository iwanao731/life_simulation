import { calculateFixedAssetTaxSchedule } from '../src/lib/simulation.js';

// Mock Config
const propertyBase = {
    price: 5000,
    deposit: 0,
    downPayment: 0,
    landPrice: 2000,
    landArea: 100,
    buildingPrice: 2500, // Taxes based on this
    buildingArea: 100,
    isNew: true,
    isLongTerm: false,
    configs: {
        landRatio: 0.7,
        buildingRatio: 0.6,
        fixedRate: 1.4,
        cityRate: 0.3
    }
};

// Test Wood
const woodSchedule = calculateFixedAssetTaxSchedule({ ...propertyBase, structure: 'wood' }, 35);

// Test RC
const rcSchedule = calculateFixedAssetTaxSchedule({ ...propertyBase, structure: 'rc' }, 35);

console.log("Details:");
console.log("Wood Year 1:", woodSchedule[0]);
console.log("RC Year 1:", rcSchedule[0]);

console.log("\nComparisons:");
console.log("Year 1 Equal?", woodSchedule[0] === rcSchedule[0] ? "YES" : "NO");

// Year 4: Wood reduction ends in year 3. RC reduction continues.
console.log(`Year 4 Wood: ${woodSchedule[3]}, RC: ${rcSchedule[3]}`);
console.log("RC Cheaper in Year 4 due to longer reduction?", rcSchedule[3] < woodSchedule[3] ? "YES" : "NO");

// Year 10: Both reductions over.
console.log(`Year 10 Wood: ${woodSchedule[9]}, RC: ${rcSchedule[9]}`);
console.log("RC Higher in Year 10 due to slower depreciation?", rcSchedule[9] > woodSchedule[9] ? "YES" : "NO");

// Total 35 Years
const totalWood = woodSchedule.reduce((a, b) => a + b, 0);
const totalRC = rcSchedule.reduce((a, b) => a + b, 0);
console.log(`Total 35 Years - Wood: ${totalWood}, RC: ${totalRC}`);
