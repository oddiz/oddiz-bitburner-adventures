import { Dashboard } from "/ui/Dashboard/Dashboard";
import { NS } from "../typings/NetscriptDefinitions";
const cheatyWindow = eval("window") as Window & typeof globalThis;
const cheatyDocument = eval("document") as Document & typeof globalThis;
const React = cheatyWindow.React;
const ReactDOM = cheatyWindow.ReactDOM;

export async function main(ns: NS) {
    ns.disableLog("asleep");

    ReactDOM.render(
        <React.StrictMode>
            <Dashboard ns={ns} />
        </React.StrictMode>,
        cheatyDocument.getElementById("overview-extra-hook-0")
    );
    while (ns.scriptRunning("/ui/ui.js", "home")) {
        await ns.asleep(1000);
    }
}
