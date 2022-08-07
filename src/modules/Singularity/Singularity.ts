import { NS } from "/typings/NetscriptDefinitions";
import { sleep } from "/utils/sleep";

const SINGULARITY_INTERVAL = 5000;
export class SingularityManager {
    private ns: NS;
    constructor(ns: NS) {
        this.ns = ns;
    }

    run = async () => {
        this.playerLoop();
    };

    playerLoop = async () => {
        while (this.ns.scriptRunning(this.ns.getScriptName(), "home")) {
            handleDarkweb(this.ns);

            await sleep(SINGULARITY_INTERVAL);
        }
    };
}

function handleDarkweb(ns: NS) {
    const money = ns.getPlayer().money;
    const sngl = ns.singularity;
    const dwPrograms = sngl.getDarkwebPrograms();

    if (money > 10 * 7) {
        sngl.purchaseTor();

        for (const program of dwPrograms) {
            sngl.purchaseProgram(program);
        }
    }
}
