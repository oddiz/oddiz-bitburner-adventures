import { Dashboard } from "/ui/Dashboard/Dashboard";
import { NS } from "/typings/Bitburner";
import { sleep } from "/utils/sleep";
const React = window.React;
const ReactDOM = window.ReactDOM;

export async function main(ns: NS) {
    ReactDOM.render(
        <React.StrictMode>
            <Dashboard ns={ns} />
        </React.StrictMode>,
        window.document.getElementById("overview-extra-hook-0")
    );
    while (ns.scriptRunning("/ui/ui.js", "home")) {
        await ns.asleep(10000);
    }
}
