import { HomeServerPortData } from "types";
import { NS } from "/typings/Bitburner";
import { parse, stringify, Stringified } from "/utils/json";
import { sleep } from "/utils/sleep";

export class PortManager {
    ns: NS;
    processingPorts: boolean;
    constructor(ns: NS) {
        this.ns = ns;
        this.processingPorts = false;
    }

    getPortData(port: number) {
        const dataString = this.ns.readPort(port) as Stringified<HomeServerPortData>;
        return parse(dataString);
    }

    async writePort(port: number, data: HomeServerPortData) {
        try {
            do {
                await sleep(20);
            } while (this.processingPorts);

            this.processingPorts = true;

            const stringifiedData = stringify(data);

            await this.ns.writePort(port, stringifiedData);

            this.processingPorts = false;
            return true;
        } catch (error) {
            this.processingPorts = false;
            return false;
        }
    }
}
