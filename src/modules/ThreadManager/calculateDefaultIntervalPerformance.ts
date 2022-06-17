import { HackLoopInfo } from "./ThreadManager";
import { DEFAULT_COMMAND_EXEC_INTERVAL } from "/utils/constants";

export function calculateDefaultIntervalPerformance(target: HackLoopInfo) {
    const performanceLoss = (target.repeatIntervalSec * 1000) / DEFAULT_COMMAND_EXEC_INTERVAL;
    return target.moneyPerThread * performanceLoss;
}
