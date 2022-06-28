import { calculateDefaultIntervalPerformance } from "/modules/ThreadManager/helpers/calculateDefaultIntervalPerformance";
import { HackLoopInfo } from "../ThreadManager";
import { COMMAND_EXEC_MIN_INTERVAL, DEBUG_MIN_LOOPTIME, DEBUG_MODE, RAM_ALLOCATION_RATIO } from "/utils/constants";

export function selectBestServerToHack(
    serverHackLoopInfos: HackLoopInfo[],
    totalAvailableRam: number
): HackLoopInfo | null {
    try {
        if (DEBUG_MODE) {
            console.log("Debug mode active, selecting server with lowest loop time and highest hack percent");

            const sortedInfos = serverHackLoopInfos
                .sort((a, b) => b.hackPercentage - a.hackPercentage)
                .sort((a, b) => a.loopTime - b.loopTime)
                .filter((info) => info.loopTime > DEBUG_MIN_LOOPTIME); // more then 30 sec loop time

            return sortedInfos[0];
        }
    } catch (error) {
        console.warn("Failed to select best server in debug mode." + error);
        return null;
    }

    try {
        if (
            !serverHackLoopInfos.every(
                (hackLoopInfo) =>
                    typeof hackLoopInfo.moneyPerThread === "number" && typeof hackLoopInfo.moneyPerCpuSec === "number"
            )
        ) {
            throw "Not every server has moneyPerThread and moneyPerCpuSec";
        }

        const intervaledHLInfos = serverHackLoopInfos.map((HLInfo) => {
            const repeatCapacity = Math.floor((totalAvailableRam * RAM_ALLOCATION_RATIO) / HLInfo.requiredRam);

            const repeatInterval = HLInfo.loopTime / repeatCapacity;

            return {
                ...HLInfo,
                repeatInterval: repeatInterval,
            };
        });

        const filteredForInterval = intervaledHLInfos.filter(
            (hackLoopInfo) => hackLoopInfo.repeatInterval > COMMAND_EXEC_MIN_INTERVAL
        );

        if (filteredForInterval.length === 0) {
            //find for default interval
            console.log("Couldn't find suitable target with given filters. Going for default interval.");

            const sortedForDefaultInterval = [...serverHackLoopInfos].sort(
                (a, b) =>
                    calculateDefaultIntervalPerformance(b, totalAvailableRam) -
                    calculateDefaultIntervalPerformance(a, totalAvailableRam)
            );

            return sortedForDefaultInterval[0];
        }
        serverHackLoopInfos
            .sort((a, b) => b.moneyPerCpuSec - a.moneyPerCpuSec)
            .sort((a, b) => b.moneyPerThread - a.moneyPerThread);

        return [...intervaledHLInfos].filter((output) => output.repeatInterval > COMMAND_EXEC_MIN_INTERVAL)[0];
    } catch (error) {
        console.warn("Error while selecting best server: " + error);

        return null;
    }
}
