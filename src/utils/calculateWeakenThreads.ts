export function calculateWeakenThreads(securityLevel: number, cores = 1): number {
    return Math.ceil((securityLevel * 20) / cores);
}
