import { NS } from "/typings/Bitburner";

export function getPayloadSizes(ns: NS) {
    const result = {
        hack: ns.getScriptRam("/payloads/hack.js"),
        weaken: ns.getScriptRam("/payloads/weaken.js"),
        grow: ns.getScriptRam("/payloads/grow.js"),
    };

    return result;
}
