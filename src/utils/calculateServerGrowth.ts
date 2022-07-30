import { Player, Server } from "../typings/NetscriptDefinitions";

export function calculateServerGrowth(server: Server, threads: number, p: Player, cores = 1): number {
    const numServerGrowthCycles = Math.max(Math.floor(threads), 0);

    //Get adjusted growth rate, which accounts for server security
    const growthRate = 1.03; // CONSTANTS.ServerBaseGrowthRate;
    let adjGrowthRate = 1 + (growthRate - 1) / server.hackDifficulty;
    if (adjGrowthRate > 1.03) {
        adjGrowthRate = 1.03;
    }

    //Calculate adjusted server growth rate based on parameters
    const serverGrowthPercentage = server.serverGrowth / 100;
    const numServerGrowthCyclesAdjusted = numServerGrowthCycles * serverGrowthPercentage * 1; //BitNodeMultipliers.ServerGrowthRate might be different;

    //Apply serverGrowth for the calculated number of growth cycles
    const coreBonus = 1 + (cores - 1) / 16;
    return Math.pow(adjGrowthRate, numServerGrowthCyclesAdjusted * p.hacking_grow_mult * coreBonus);
}
