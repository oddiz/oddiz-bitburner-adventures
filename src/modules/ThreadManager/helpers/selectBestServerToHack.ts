import { HackLoopInfo } from "../ThreadManager";
import { DEBUG_MIN_LOOPTIME, DEBUG_MODE, RAM_ALLOCATION_RATIO } from "/utils/constants";

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
                    typeof hackLoopInfo.moneyPerThread === "number" && typeof hackLoopInfo.moneyPerMs === "number"
            )
        ) {
            throw "Not every server has moneyPerThread and moneyPerMs";
        }

        const sortedForDefaultInterval = [...serverHackLoopInfos]
            .sort((a, b) => b.moneyPerMs - a.moneyPerMs)
            .filter((info) => info.requiredRam < totalAvailableRam * RAM_ALLOCATION_RATIO);

        return sortedForDefaultInterval[0];
    } catch (error) {
        console.warn("Error while selecting best server: " + error);

        return null;
    }
}
