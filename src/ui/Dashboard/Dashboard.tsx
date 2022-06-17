import { NS } from "/typings/Bitburner";
import { killAll } from "/utils/killAll";
import { Button } from "/ui/Dashboard/Button";
import { ODDIZ_HACK_TOOLKIT_SCRIPT_NAME } from "/utils/constants";

const React = window.React;

export interface IDashboardProps {
    ns: NS;
}
export const Dashboard = ({ ns }: IDashboardProps) => {
    const killAllClicked = async () => {
        killAll(ns).catch((err) => console.warn("Error trying to kill all with button:", err));
        ns.scriptKill(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home");
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
        </div>
    );
};
