import { Switch } from "/ui/Dashboard/Switch";
import { NS } from "/typings/Bitburner";
import { sleep } from "/utils/sleep";
const cheatyWindow = eval("window") as Window & typeof globalThis;
const React = cheatyWindow.React;
const { useState } = React;

const NODE_MAINTAINER_PATH = "/maintainers/HacknetNodeMaintainer.js";
const GANG_PATH = "gang.js";

export const ToggleSection = ({ ns }: { ns: NS }) => {
    const [nodeMaintActive, setNodeMaintActive] = useState(ns.scriptRunning(NODE_MAINTAINER_PATH, "home"));
    const [remoteMaintActive, setRemoteMaintActive] = useState(
        cheatyWindow.localStorage.getItem("remoteMaintenanceActive") === "true"
    );

    const [gangActive, setGangActive] = useState(ns.scriptRunning(GANG_PATH, "home"));

    return (
        <div
            style={{
                width: "100px",
                display: "flex",
                flexDirection: "column",

                margin: "4px 0px",
                padding: "2px",
                textAlign: "center",
            }}
        >
            <h4 style={{ marginBottom: "5px" }}>Switches</h4>
            <Switch
                title="Node Maint."
                onClickHandler={async () => {
                    if (ns.scriptRunning(NODE_MAINTAINER_PATH, "home")) {
                        ns.scriptKill(NODE_MAINTAINER_PATH, "home");
                        setNodeMaintActive(false);
                    } else {
                        const pid = ns.exec(NODE_MAINTAINER_PATH, "home");
                        if (pid) {
                            await sleep(200);
                            if (ns.scriptRunning(NODE_MAINTAINER_PATH, "home")) setNodeMaintActive(true);
                        }
                    }
                }}
                active={nodeMaintActive}
            />
            <Switch
                title="Remote Maint."
                onClickHandler={() => {
                    if (remoteMaintActive) {
                        cheatyWindow.localStorage.setItem("remoteMaintenanceActive", "false");
                        setRemoteMaintActive(false);
                    } else {
                        cheatyWindow.localStorage.setItem("remoteMaintenanceActive", "true");
                        setRemoteMaintActive(true);
                    }
                }}
                active={remoteMaintActive}
            />
            <Switch
                title="Gang"
                onClickHandler={() => {
                    if (ns.scriptRunning(GANG_PATH, "home")) {
                        ns.scriptKill(GANG_PATH, "home");
                        setGangActive(false);
                    } else {
                        ns.exec(GANG_PATH, "home");
                        setGangActive(true);
                    }
                }}
                active={gangActive}
            />
        </div>
    );
};
