//TODO merge all paylaods into one file, this way we can track individual script lag

import { HackLoopInfo } from "/modules/ThreadManager/ThreadManager";
import { NS } from "/typings/Bitburner";
import { COMMAND_EXEC_MIN_INTERVAL, TASK_EXEC_INTERVAL } from "/utils/constants";

export async function main(ns: NS) {
    const hackLoopId = ns.args[0] as number;
    const totalThreads = ns.args[1] as number;

    const hackLoopData = JSON.parse(ns.read("hackLoopInfo.txt")) as HackLoopInfo;
    if (hackLoopData.id != hackLoopId) {
        console.warn("Hack loop id mismatch, exiting.");

        return;
    }
    const hackLoopTotalThreads = Object.values(hackLoopData.opThreads).reduce((acc, cur) => acc + cur, 0);

    const loopCapacity = Math.floor(totalThreads / hackLoopTotalThreads);
    const loopInterval = Math.max(hackLoopData.loopTime / loopCapacity, COMMAND_EXEC_MIN_INTERVAL);

    if (totalThreads % hackLoopTotalThreads > 0)
        console.log("payload has extra threads! Amount: " + (totalThreads % hackLoopTotalThreads));

    console.log(loopInterval);
    await executeTrio();
    async function executeTrio() {
        try {
            const target = hackLoopData.hostname;
            const { grow, hack, weaken } = hackLoopData.opTimes;
            const loopTime = Math.max(grow, hack, weaken);

            //since weaken is longest run it first, but it should end last
            const weakenExecTime = Date.now();

            await waitUntilMinSec();

            ns.weaken(target, { threads: hackLoopData.opThreads.weaken }).then((res) => console.log(res));
            const weakenEndTime = Date.now();
            const weakenLag = weakenEndTime - weakenExecTime;

            console.log("Weaken executed. Lag: " + weakenLag);

            const waitUntilGrow = loopTime - grow - TASK_EXEC_INTERVAL;
            if (waitUntilGrow <= 0) {
                //too late to execute grow, skip it

                console.warn("Too late to execute grow. Skipping it.");
                return;
            }

            console.log("Waiting for " + waitUntilGrow / 1000 + "sec for grow.");
            await ns.asleep(waitUntilGrow);

            //grow is middle, it should end before weaken after hack
            const growExecTime = Date.now();

            await waitUntilMinSec();

            ns.grow(target, { threads: hackLoopData.opThreads.grow }).then((res) => console.log(res));
            const growEndTime = Date.now();
            const growLag = growEndTime - growExecTime;
            console.log("Grow executed. Lag: " + growLag);

            const waitUntilHack = grow - hack - growLag - TASK_EXEC_INTERVAL;

            if (waitUntilHack <= 0) {
                //too late to execute hack, skip it

                console.warn("Too late to execute hack. Skipping it.");
                return;
            }
            console.log("Waiting for " + waitUntilHack / 1000 + "sec to grow.");
            await ns.asleep(waitUntilHack);

            // h4ck is shortest, needs to end first
            const hackExecTime = Date.now();

            await waitUntilMinSec();

            ns.hack(target, { threads: hackLoopData.opThreads.hack }).then((res) => console.log(res));
            const hackEndTime = Date.now();
            const hackLag = hackEndTime - hackExecTime;
            console.log("Hack executed. Lag: " + hackLag);

            console.log("Weaken will end at " + formatTime(weakenExecTime + weaken));
            console.log("Grow will end at " + formatTime(growExecTime + grow));
            console.log("Interval amount: " + (weakenExecTime + weaken - (growExecTime + grow)));
            console.log("Hack will end at " + formatTime(hackExecTime + hack));
            console.log("Interval amount: " + (growExecTime + grow - (hackExecTime + hack)));

            // eslint-disable-next-line no-constant-condition
            if (false) {
                ns.hack(target, { threads: hackLoopData.opThreads.hack }).then((res) => console.log(res));
                ns.grow(target, { threads: hackLoopData.opThreads.hack }).then((res) => console.log(res));
                ns.weaken(target, { threads: hackLoopData.opThreads.hack }).then((res) => console.log(res));
                ns.getServerMinSecurityLevel(target);
                ns.getServerSecurityLevel(target);
            }
        } catch (error) {
            //fail silenytly
        }
    }
    async function waitUntilMinSec(): Promise<boolean> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const target = hackLoopData.hostname;
        const serverIsMinSec = eval("ns.getServerMinSecurityLevel(target) === ns.getServerSecurityLevel(target);");
        while (!serverIsMinSec) await ns.asleep(30);

        return true;
    }
}

function formatTime(time: number): string {
    const hours = Math.floor(time / 3600000);
    const minutes = Math.floor((time % 3600000) / 60000);
    const seconds = Math.floor(((time % 3600000) % 60000) / 1000);
    const miliseconds = Math.floor(((time % 3600000) % 60000) % 1000);

    return `${hours}:${minutes}:${seconds}.${miliseconds}`;
}
