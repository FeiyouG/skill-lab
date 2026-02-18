import type { AnalyzerLogger, AnalyzerLogLevel } from "./types.ts";

export const NO_OP_LOGGER: AnalyzerLogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
};

export function showProgress(input: { logLevel?: AnalyzerLogLevel }): boolean {
    return input.logLevel != "silence"
}
