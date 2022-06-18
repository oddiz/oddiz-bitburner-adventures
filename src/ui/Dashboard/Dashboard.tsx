import { NS } from "/typings/Bitburner";
import { killAll } from "/utils/killAll";
import { Button } from "/ui/Dashboard/Button";
import { ODDIZ_HACK_TOOLKIT_SCRIPT_NAME } from "/utils/constants";
import { sleep } from "/utils/sleep";

const React = window.React;

export interface IDashboardProps {
    ns: NS;
}
export const Dashboard = ({ ns }: IDashboardProps) => {
    const killAllClicked = async () => {
        killAll(ns).catch((err) => console.warn("Error trying to kill all with button:", err));
        ns.scriptKill(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home");
    };

    const runClicked = async () => {
        if (ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home")) {
            ns.scriptKill(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home");

            await ns.asleep(100);
        }
        ns.run(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME);
    };
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flexGrow: 1,
            }}
        >
            <Button bg="red" title="Kill All!" onButtonClick={killAllClicked} />
            <Button bg="green" title="Run!" onButtonClick={runClicked} />
        </div>
    );
};
