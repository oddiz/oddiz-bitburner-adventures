import { NS } from "/typings/Bitburner";

export function calculateWeakenThreads(ns: NS, securityLevel: number, cores = 1): number {
    const secDecreasePerThread = ns.weakenAnalyze(1, cores);
    return Math.ceil(securityLevel / secDecreasePerThread);
}
