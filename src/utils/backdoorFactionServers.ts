/* eslint-disable @typescript-eslint/ban-ts-comment */
import { findRouteTo } from "/utils/findRouteTo";
import { sleep } from "/utils/sleep";
import { NS, Server } from "../typings/NetscriptDefinitions";

const factionServers = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "The-Cave", "w0r1d_d43m0n"];

export async function main(ns: NS) {
    ns.disableLog("ALL");
    await backdoorFactionServers(ns);
}
export async function backdoorFactionServers(ns: NS) {
    const facSvInfos = factionServers.map((hostname) => ns.getServer(hostname));

    for (const target of facSvInfos) {
        const targetHostname = target.hostname;
        if (target.requiredHackingSkill > ns.getHackingLevel()) {
            console.warn(
                `Can't backdoor server ${targetHostname}, needed hacking skill: ${target.requiredHackingSkill}`
            );

            continue;
        }

        //connect to server
        await sendTerminalCommand(ns, "home");
        const routeToServer = findRouteTo(ns, targetHostname);

        if (!routeToServer) console.warn("Couldn't find route to server");

        for (const server of routeToServer) {
            await sendTerminalCommand(ns, server === "home" ? "home" : `connect ${server}`);
        }

        const backdoorTime = getBackdoorTime(ns, target);

        await sendTerminalCommand(ns, "backdoor");
        await sleep(backdoorTime);
    }
}

async function sendTerminalCommand(ns: NS, query: string) {
    const cheatyWindow = eval("window") as Window;
    const terminalInput = cheatyWindow.document.getElementById("terminal-input") as HTMLInputElement;

    let enterPressed = false;
    if (!terminalInput) {
        console.warn("Please navigate to terminal page!");
        return;
    }

    const onKeyUpFunc = (e: globalThis.KeyboardEvent) => {
        if (e.key === "Enter") {
            enterPressed = true;
        }
    };

    triggerInputChange(terminalInput, query);

    cheatyWindow.document.addEventListener("keyup", onKeyUpFunc);

    while (!enterPressed && ns.scriptRunning("/utils/backdoorFactionServers.js", "home")) {
        await sleep(100);
    }

    cheatyWindow.document.removeEventListener("keyup", onKeyUpFunc);

    return;
}

function getBackdoorTime(ns: NS, server: Server) {
    return ns.getHackTime(server.hostname) / 4; //got this info from bitburner source code
}

const inputTypes = [window.HTMLInputElement, window.HTMLSelectElement, window.HTMLTextAreaElement];

export const triggerInputChange = (node, value = "") => {
    if (!node) throw Error("Error in triggering or changing input");
    // only process the change on elements we know have a value setter in their constructor

    // @ts-ignore
    if (inputTypes.indexOf(node.__proto__.constructor) > -1) {
        // @ts-ignore
        const setValue = Object.getOwnPropertyDescriptor(node.__proto__, "value").set;
        const event = new Event("input", { bubbles: true });

        // @ts-ignore
        setValue.call(node, value);
        node.dispatchEvent(event);
    }
};
