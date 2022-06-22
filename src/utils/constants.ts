export const TASK_EXEC_INTERVAL = 200; // times between hack-grow-weaken trio
export const TASK_EXEC_START_BUFFER = 300; // this will be added to planned  execute time to compansate for server execute lagç
export const COMMAND_EXEC_MIN_INTERVAL = 10000; // minimum time between commands
export const MAX_COMMAND_EXEC_LAG = 200; // if command is executed later than this, it will be skipped

export const ODDIZ_HACK_TOOLKIT_SCRIPT_NAME = "main.js";

export const ODDIZ_UI_ENCHANCEMENTS_PATH = "/ui/ui.js";

export const RAM_ALLOCATION_RATIO = 0.8; // ratio of what percentage of available RAM to use for hacking loop

export const MONITORJS_REFRESH_INTERVAL = 1000 / 30; // 30 hz- how often to refresh the monitor

export const DEBUG_MODE = false; // if true, will select fastest server to hack
export const DEBUG_MIN_LOOPTIME = 30 * 1000; // server with loop time higer than this will be selected in debug mode

export const SERVER_MAINTAINER_TICK_INTERVAL = 5000; // how often to check for server maintainance
