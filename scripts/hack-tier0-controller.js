import {
    rootedServers
} from "./rooted_servers";

const targets = rootedServers;

/** @param {import("..").NS} ns */
export async function main(ns) {

    //hack all targets first
    ns.print("Hacking all targets...");
    for (const tar of targets) {


        ns.scriptKill("hack-tier0.js", tar);

    }

    await ns.sleep(1000);

    for (const target of targets) {

        ns.print("Processing ", target, " ...");

        const customTargets = randomizeArray(targets);
        await ns.scp("hack-tier0.js", target);
        for (const hackTarget of customTargets) {
            ns.print("Starting tier 0 hacking script for ", hackTarget, "on server: ", target);
            const pid = ns.exec("hack-tier0.js", target, 1, hackTarget);

            if (pid) {
                ns.print("Started script with pid: ", pid);

            } else {
                ns.print("Failed to start script");
            }
        }
    }

}

//randomize array
const randomizeArray = (array) => {
    const arrayCopy = array.slice();
    for (let i = arrayCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
    }
    return arrayCopy;
}