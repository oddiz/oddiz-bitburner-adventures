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

export interface MyLocalStorage extends Storage {
    oddizToolkit?: Stringified<OddizToolkit>;
}

export interface OddizToolkit {
    trioData: HackLoopInfo | null; //meaning empty object
    trioLagInfo: TrioLagInfo;
}
export interface TrioLagInfo {
    [id: string]: {
        weaken?: number;
        grow?: number;
        hack?: number;
    };
}

export interface ServerHackData {
    cores: number;
    hostname: string;
    hackTime: number;
    growTime: number;
    weakenTime: number;
    money: number;
    maxMoney: number;
    moneyDiff: number;
    minSec: number;
    curSec: number;
    secDiff: number;
    growthThreadsToMax: number;
    weakenThreadsToMin: number;
    weakenThreadsToMinAfterGrowth: number;
    growthSecIncrease: number;
    moneyPerThread: number;
    moneyPerSecPerThread: number;
}
