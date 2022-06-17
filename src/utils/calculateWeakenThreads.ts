export function calculateWeakenThreads(securityLevel: number): number {
    return Math.ceil(securityLevel * 20);
}
