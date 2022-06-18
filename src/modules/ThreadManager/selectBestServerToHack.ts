import { calculateDefaultIntervalPerformance } from "/modules/ThreadManager/calculateDefaultIntervalPerformance";
import { HackLoopInfo } from "./ThreadManager";
import { COMMAND_EXEC_MIN_INTERVAL, TASK_EXEC_INTERVAL } from "/utils/constants";

export function selectBestServerToHack(serverHackLoopInfos: HackLoopInfo[], debugMode = false) {
    try {
        if (debugMode) {
            console.log("Debug mode active, selecting server with lowest loop time and highest hack percent");

            const sortedInfos = serverHackLoopInfos
                .sort((a, b) => b.hackPercentage - a.hackPercentage)
                .sort((a, b) => a.loopTime - b.loopTime)
                .filter((info) => info.loopTime > TASK_EXEC_INTERVAL * 3 + COMMAND_EXEC_MIN_INTERVAL);

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

        const filteredForInterval = serverHackLoopInfos.filter(
            (hackLoopInfo) => hackLoopInfo.repeatIntervalSec * 1000 > COMMAND_EXEC_MIN_INTERVAL
        );

        if (filteredForInterval.length === 0) {
            //find for default interval
            console.log("Couldn't find suitable target with given filters. Going for default interval.");

            const sortedForDefaultInterval = [...serverHackLoopInfos].sort(
                (a, b) => calculateDefaultIntervalPerformance(b) - calculateDefaultIntervalPerformance(a)
            );

            return sortedForDefaultInterval[0];
        }
        serverHackLoopInfos
            .sort((a, b) => b.moneyPerCpuSec - a.moneyPerCpuSec)
            .sort((a, b) => b.moneyPerThread - a.moneyPerThread);

        return [...serverHackLoopInfos].filter(
            (output) => output.repeatIntervalSec > COMMAND_EXEC_MIN_INTERVAL / 1000
        )[0];
    } catch (error) {
        console.warn("Error while selecting best server: " + error);

        return null;
    }
}
