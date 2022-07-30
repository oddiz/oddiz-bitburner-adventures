import { NS } from "../../typings/NetscriptDefinitions";
import { getAllServers } from "/utils/getters";
import { sleep } from "/utils/sleep";

const cheatyWindow = eval("window") as Window & typeof globalThis;
const cheatyDocument = eval("document") as Document & typeof globalThis;

const React = cheatyWindow.React;
const { useState, useMemo } = React;

const queryInString = (query: string, string: string) => {
    return string.toLowerCase().includes(query.toLowerCase());
};

export const MonitorInput = ({ ns }: { ns: NS }) => {
    const allServers = useMemo(() => getAllServers(ns), []);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const onChangeHandler: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const query = e.target.value;
        const matchedServers: string[] = [];
        for (const server of allServers) {
            if (queryInString(query, server)) {
                matchedServers.push(server);
            }
        }

        setSuggestions(e.target.value === "" ? [] : matchedServers);
    };

    const onKeyDownHandler = async (e) => {
        if (e.key === "Enter") {
            if (suggestions.length === 1) {
                ns.run("/utils/monitor.js", 1, suggestions[0]);
                setSuggestions([]);
                e.target.value = "";
            }
        }
    };
    const onFocusHandler = () => {
        const terminalInput = cheatyDocument.getElementById("terminal-input") as HTMLInputElement;
        terminalInput.disabled = true;
    };

    const onFocusOut = () => {
        const terminalInput = cheatyDocument.getElementById("terminal-input") as HTMLInputElement;
        terminalInput.disabled = false;
    };
    const suggestionsSection = suggestions.map((server) => {
        return <div key={server}>{server}</div>;
    });
    return (
        <div
            style={{
                fontFamily: "Consolas",
                fontSize: "12px",
            }}
        >
            <input
                style={{
                    width: "100px",
                    height: "20px",
                    border: "1px solid yellow",
                    padding: "2px",
                    backgroundColor: "black",
                    color: "yellow",
                    margin: "2px",
                }}
                placeholder="Monitor"
                onChange={onChangeHandler}
                onKeyDown={onKeyDownHandler}
                onFocusCapture={onFocusHandler}
                onBlur={onFocusOut}
            />
            <div
                style={{
                    position: "relative",
                    width: "60px",
                    bottom: "0px",
                    background: "#00000092",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    zIndex: "9999",
                }}
            >
                {suggestions.length > 0 ? suggestionsSection : null}
            </div>
        </div>
    );
};
