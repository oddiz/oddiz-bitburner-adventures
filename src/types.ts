import { HackLoopInfo } from "./modules/ThreadManager/ThreadManager";
import { Stringified } from "./utils/json";

export interface HomeServerPorts {
    [key: number]: Stringified<HomeServerPortData>;
    420: Stringified<HackTrioInfoPortData>;
}

export type HomeServerPortData = HackTrioInfoPortData;

export interface HackTrioInfoPortData {
    hackLoopInfo: HackLoopInfo;
    incomePerSecond: number;
}
