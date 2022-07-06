// calculates time needed for compound interest
export function calculateGrowCycles(startPercent, growthRate) {
    return log(growthRate, 100 / startPercent);
}

function log(base, number) {
    return Math.log(number) / Math.log(base);
}
