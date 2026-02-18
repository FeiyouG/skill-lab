import type { AnalyzerLogger } from "./types.ts";

export const NO_OP_LOGGER: AnalyzerLogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
};
