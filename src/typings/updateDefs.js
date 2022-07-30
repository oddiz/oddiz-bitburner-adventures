import { get } from "https";

import { createWriteStream } from "fs";
import { readFile, writeFile } from "fs/promises";

const url = "https://raw.githubusercontent.com/danielyxie/bitburner/master/src/ScriptEditor/NetscriptDefinitions.d.ts";
const path = "src/typings/NetscriptDefinitions.d.ts";

get(url, (res) => {
    const file = createWriteStream(path);

    res.pipe(file);

    file.on("finish", async () => {
        file.close;
        const content = await readFile(path);
        const fixedContent = convertToCRLF(content.toString("utf-8"));
        await writeFile(path, fixedContent);
        console.log("Netscript Type Definitions Updated");
    });
}).on("error", (err) => {
    console.log("Error: ", err.message);
});
function convertToCRLF(str) {
    return str.replace(/\n/g, "\r\n");
}
