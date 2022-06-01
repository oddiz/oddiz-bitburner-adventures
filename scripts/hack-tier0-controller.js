const targets = ["hong-fang-tea", "harakiri-sushi", "joesguns", "n00dles", "foodnstuff", "sigma-cosmetics"];

/** @param {import("..").NS} ns */
export async function main(ns) {
    const scriptRAM = ns.getScriptRam("hack-tier0.js");
    ns.print("script ram: " + scriptRAM);

    //hack all targets first
    ns.print("Hacking all targets...");
    for (const tar of targets) {
        const root = ns.hasRootAccess(tar);
        if (!root) {
            ns.print("Rooting " + tar + "...");
            ns.nuke(tar);
        }

    }

    for (const target of targets) {

        ns.print("Processing ", target, " ...");
        const targetRam = ns.getServerMaxRam(target);
        ns.print("killing all processes.");
        const scriptCap = Math.floor(targetRam / scriptRAM);
        ns.print("script cap: " + scriptCap);

        const customTargets = getRandomFromArray(targets, scriptCap);
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



const getRandomFromArray = (array, count) => {
    const arrayCopy = array.slice();
    const iter = Math.min(count, array.length);
    const result = [];
    for (let i = 0; i < iter; i++) {
        const index = Math.floor(Math.random() * array.length);
        result.push(array[index]);
        arrayCopy.splice(index, 1);
    }
    return result;
}