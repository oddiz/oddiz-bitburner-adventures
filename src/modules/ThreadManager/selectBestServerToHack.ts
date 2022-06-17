import { calculateDefaultIntervalPerformance } from "/modules/ThreadManager/calculateDefaultIntervalPerformance";
import { HackLoopInfo } from "./ThreadManager";
import { DEFAULT_COMMAND_EXEC_INTERVAL } from "/utils/constants";

export function selectBestServerToHack(serverHackLoopInfos: HackLoopInfo[]) {
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
            (hackLoopInfo) => hackLoopInfo.repeatIntervalSec > DEFAULT_COMMAND_EXEC_INTERVAL
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
            (output) => output.repeatIntervalSec > DEFAULT_COMMAND_EXEC_INTERVAL / 1000
        )[0];
    } catch (error) {
        console.warn("Error while selecting best server: " + error);

        return null;
    }
}
