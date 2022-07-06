import { ThreadManager } from "/modules/ThreadManager/ThreadManager";
import { NS } from "typings/Bitburner";
import { ServerManager } from "/modules/ServerManager/ServerManager";
import { sleep } from "/utils/sleep";
import { ODDIZ_HACK_TOOLKIT_SCRIPT_NAME } from "/utils/constants";
import { MyLocalStorage, OddizToolkit } from "types";
import { stringify } from "/utils/json";

export async function main(ns: NS) {
    try {
        ns.tail();
        console.log("Starting Oddiz Bitburner Toolkit");

        console.log("Initializing local storage");
        const localStorage = eval("window").localStorage as MyLocalStorage;
        const oddizToolkitData: OddizToolkit = {
            trioData: null,
            trioLagInfo: {},
        };

        localStorage.setItem("oddizToolkit", stringify(oddizToolkitData));

        console.log("Running Server Manager");
        const serverManager = new ServerManager(ns);
        await serverManager.init();
        console.log("Running Thread Manager");
        const threadManager = new ThreadManager(ns, serverManager);
        await threadManager.init();

        while (ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home")) await sleep(100000000);
    } catch (error) {
        if (ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home")) {
            console.error("Error in main\n" + JSON.stringify(error, null, 2));
        }
    }
}
