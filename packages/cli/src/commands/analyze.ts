import { Command } from "@cliffy/command";

type AnalyzeOptions = {
    gitRef?: string;
    subDir?: string;
    githubToken?: string;
    analyzer?: string;
    json?: boolean;
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
    .option("--json", "Output as JSON")
    .action(async (options: AnalyzeOptions, path?: string) => {
        try {
            if (!path) {
                throw new Error(
                    "Path required. Provide a local directory path or a GitHub repository URL.",
                );
            }

            const { runAnalysis } = await import("@FeiyouG/skill-lab-analyzer");
            const result = await runAnalysis({
                options: {
                    source: path,
                    subDir: options.subDir,
                    gitRef: options.gitRef,
                    githubToken: options.githubToken,
                },
            });

            if (options.json) {
                console.log(JSON.stringify(result, null, 2));
                return;
            }

            console.log(`\n${"=".repeat(60)}`);
            console.log("  Analysis Results (v2)");
            console.log(`${"=".repeat(60)}\n`);
            console.log(`  Permissions: ${result.permissions.length}`);
            console.log(`  Risks: ${result.risks.length}`);
            console.log(`  Score: ${result.score}`);
            console.log(`  Risk Level: ${result.riskLevel}`);
            console.log(`\n  Summary: ${result.summary}`);
            if (result.warnings.length > 0) {
                console.log(`\n  Warnings: ${result.warnings.length}`);
            }
            console.log("");
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Analyze failed: ${message}`);
            Deno.exit(1);
        }
    });
