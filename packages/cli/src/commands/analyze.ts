import { Command } from "@cliffy/command";
import { configure, getLogger, getStreamSink, getTextFormatter } from "@logtape/logtape";
import { runAnalysis } from "@FeiyouG/skill-lab-analyzer";
import type { AnalyzerConfig, AnalyzerLogger } from "@FeiyouG/skill-lab-analyzer";
import { CLI_VERSION } from "../main.ts";
import { loadAnalyzerConfig } from "../config/config.ts";

type AnalyzeOptions = {
    gitRef?: string;
    subDir?: string;
    githubToken?: string;
    analyzer?: string;
    json?: boolean;
    sarif?: boolean;
    verbose?: boolean;
    warn?: boolean;
    silence?: boolean;
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
    .option("--sarif", "Output as SARIF 2.1.0 for GitHub Code Scanning upload")
    .action(async (options: AnalyzeOptions, path?: string) => {
        try {
            if (!path) {
                throw new Error(
                    "Path required. Provide a local directory path or a GitHub repository URL.",
                );
            }

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
                        sinks: options.silence ? [] : ["stderr"],
                        lowestLevel: "error",
                    },
                    {
                        category: ["slab"],
                        sinks: options.silence ? [] : ["stderr"],
                        lowestLevel: "debug",
                    },
                ],
            });

            const slabLogger = getLogger(["slab", "analyzer"]);
            const analyzerLogger = createAnalyzerLogger(slabLogger, options);
            const showProgressBar = resolveShowProgressBar(options);
            const config = await loadAnalyzerConfig();

            const result = await runAnalysis({
                options: {
                    source: path,
                    subDir: options.subDir,
                    gitRef: options.gitRef,
                    githubToken: options.githubToken,
                },
                config: config as Partial<AnalyzerConfig>,
                logger: analyzerLogger,
                showProgressBar,
            } as Parameters<typeof runAnalysis>[0]) as unknown as {
                toSarif: (version: string) => Promise<string>;
                toJson: () => string;
                toString: () => string;
            };

            if (options.sarif) {
                console.log(await result.toSarif(CLI_VERSION));
            } else if (options.json) {
                console.log(result.toJson());
            } else {
                console.log(result.toString());
            }

            Deno.exit(0);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Analyze failed: ${message}`);
            Deno.exit(1);
        }
    });

function resolveShowProgressBar(options: AnalyzeOptions): boolean {
    return !(options.silence || options.json || options.sarif) && Deno.stderr.isTerminal();
}

function createAnalyzerLogger(
    logger: ReturnType<typeof getLogger>,
    options: AnalyzeOptions,
): AnalyzerLogger {
    const noop = () => {};
    const fmt = (template: string, props?: Record<string, unknown>) => {
        if (!props || Object.keys(props).length === 0) return template;
        return `${template} ${JSON.stringify(props)}`;
    };

    const silence = !!options.silence;
    const warnOnly = !!(options.warn || options.json || options.sarif);
    const verbose = !!options.verbose;

    return {
        debug: silence || warnOnly || !verbose ? noop : (t, p) => logger.debug(fmt(t, p)),
        info: silence || warnOnly ? noop : (t, p) => logger.info(fmt(t, p)),
        warn: silence ? noop : (t, p) => logger.warn(fmt(t, p)),
        error: silence ? noop : (t, p) => logger.error(fmt(t, p)),
    };
}
