import { HackLoopInfo } from "./ThreadManager";
import { COMMAND_EXEC_MIN_INTERVAL } from "/utils/constants";

export function calculateDefaultIntervalPerformance(target: HackLoopInfo) {
    const performanceLoss = (target.repeatIntervalSec * 1000) / COMMAND_EXEC_MIN_INTERVAL;
    return target.moneyPerThread * performanceLoss;
}
