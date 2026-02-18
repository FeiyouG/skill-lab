import { Command } from "@cliffy/command";
import { configure, getLogger, getStreamSink, getTextFormatter } from "@logtape/logtape";
import type { AnalyzerLogger, AnalyzerLogLevel, AnalyzerResult } from "@FeiyouG/skill-lab-analyzer";
import { formatAnalyzeResult } from "./analyze-format.ts";

type AnalyzeOptions = {
    gitRef?: string;
    subDir?: string;
    githubToken?: string;
    analyzer?: string;
    json?: boolean;
    verbose?: boolean;
    warn?: boolean;
    silence?: boolean;
};

const EXIT_CODE: Record<AnalyzerResult["riskLevel"], number> = {
    safe: 0,
    caution: 1,
    attention: 1,
    risky: 1,
    avoid: 2,
};

export const analyzeCommand = new Command()
    .description("Analyze a skill from local filesystem or GitHub")
    .arguments("[path:string]")
    .option("--gitRef <ref:string>", "Git reference for GitHub or local git repositories")
    .option(
        "--subDir <path:string>",
        "Optional path from the source root to the skill root directory that contains SKILL.md",
    )
    .option(
        "--githubToken <token:string>",
        "GitHub token for GitHub sources (overrides GITHUB_TOKEN; unauthenticated requests are used when omitted)",
    )
    .option("--verbose", "Enable debug logging")
    .option("--warn", "Only warnings and errors")
    .option("--silence", "Disable all logs")
    .option("--json", "Output as JSON")
    .action(async (options: AnalyzeOptions, path?: string) => {
        try {
            if (!path) {
                throw new Error(
                    "Path required. Provide a local directory path or a GitHub repository URL.",
                );
            }

            const { runAnalysis } = await import("@FeiyouG/skill-lab-analyzer");
            const logLevel = resolveLogLevel(options);

            await configure({
                reset: true,
                sinks: {
                    stderr: getStreamSink(Deno.stderr.writable, {
                        formatter: getTextFormatter({
                            timestamp: "disabled",
                            format: (
                                { level, message }: { level: string; message: string },
                            ) => `${level}: ${message}`,
                        }),
                    }),
                },
                loggers: [
                    {
                        category: ["logtape", "meta"],
                        sinks: logLevel === "silence" ? [] : ["stderr"],
                        lowestLevel: "error",
                    },
                    {
                        category: ["slab"],
                        sinks: logLevel === "silence" ? [] : ["stderr"],
                        lowestLevel: toLogtapeLevel(logLevel),
                    },
                ],
            });

            const slabLogger = getLogger(["slab", "analyzer"]);
            const analyzerLogger = createAnalyzerLogger(slabLogger);

            const result = await runAnalysis({
                options: {
                    source: path,
                    subDir: options.subDir,
                    gitRef: options.gitRef,
                    githubToken: options.githubToken,
                },
                logger: analyzerLogger,
                logLevel,
            });

            if (options.json) {
                console.log(JSON.stringify(result, null, 2));
                Deno.exit(EXIT_CODE[result.riskLevel]);
            }

            console.log(formatAnalyzeResult(result));
            Deno.exit(EXIT_CODE[result.riskLevel]);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Analyze failed: ${message}`);
            Deno.exit(1);
        }
    });

function resolveLogLevel(options: AnalyzeOptions): AnalyzerLogLevel {
    if (options.silence) return "silence";
    if (options.warn || options.json) return "warn";
    if (options.verbose) return "debug";
    return "info";
}

function toLogtapeLevel(level: AnalyzerLogLevel): "debug" | "info" | "warning" | "error" {
    switch (level) {
        case "debug":
            return "debug";
        case "info":
            return "info";
        case "warn":
            return "warning";
        case "silence":
            return "error";
        default:
            return "info";
    }
}

function createAnalyzerLogger(logger: ReturnType<typeof getLogger>): AnalyzerLogger {
    const format = (template: string, props?: Record<string, unknown>) => {
        if (!props || Object.keys(props).length === 0) return template;
        return `${template} ${JSON.stringify(props)}`;
    };

    return {
        debug: (template: string, props?: Record<string, unknown>) =>
            logger.debug(format(template, props)),
        info: (template: string, props?: Record<string, unknown>) =>
            logger.info(format(template, props)),
        warn: (template: string, props?: Record<string, unknown>) =>
            logger.warn(format(template, props)),
        error: (template: string, props?: Record<string, unknown>) =>
            logger.error(format(template, props)),
    };
}
