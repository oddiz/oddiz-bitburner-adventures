import { findRouteTo } from "/utils/findRouteTo";
import { sleep } from "/utils/sleep";
import { NS, Server } from "/typings/Bitburner";

const factionServers = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z"];
export async function backdoorFactionServers(ns: NS) {
    const facSvInfos = factionServers.map((hostname) => ns.getServer(hostname));

    for (const target of facSvInfos) {
        const targetHostname = target.hostname;
        if (target.requiredHackingSkill < ns.getPlayer().hacking) {
            console.warn(
                `Can't backdoor server ${targetHostname}, needed hacking skill: ${target.requiredHackingSkill}`
            );

            continue;
        }

        //connect to server
        await sendTerminalCommand("home");
        const routeToServer = findRouteTo(ns, targetHostname);

        if (!routeToServer) console.warn("Couldn't find route to server");

        for (const server of routeToServer) {
            await sendTerminalCommand(`connect ${server}`);
        }

        const backdoorTime = getBackdoorTime(ns, target);

        await sendTerminalCommand("backdoor");
        await sleep(backdoorTime);
    }
}

async function sendTerminalCommand(query: string) {
    const cheatyWindow = eval("window") as Window;
    const terminalInput = cheatyWindow.document.getElementById("terminal-input") as HTMLInputElement;

    if (!terminalInput) {
        console.warn("Please navigate to terminal page!");
        return;
    }

    terminalInput.value = query;
    cheatyWindow.dispatchEvent(
        new KeyboardEvent("keydown", {
            key: "Enter",
        })
    );

    await sleep(100);
    return;
}

function getBackdoorTime(ns: NS, server: Server) {
    return ns.getHackTime(server.hostname) / 4; //got this info from bitburner source code
}
