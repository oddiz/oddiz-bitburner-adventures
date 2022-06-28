import { HackLoopInfo } from "/modules/ThreadManager/ThreadManager";
import { COMMAND_EXEC_MIN_INTERVAL, RAM_ALLOCATION_RATIO } from "/utils/constants";

export function calculateDefaultIntervalPerformance(target: HackLoopInfo, totalAvailableRam: number): number {
    const repeatCapacity = Math.floor((totalAvailableRam * RAM_ALLOCATION_RATIO) / target.requiredRam);

    const repeatInterval = target.loopTime / repeatCapacity;
    const performanceLoss = repeatInterval / COMMAND_EXEC_MIN_INTERVAL;
    return target.moneyPerThread * performanceLoss;
}
