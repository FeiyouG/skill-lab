import { Command } from "@cliffy/command";
import { CloudStorageSkillReader, GitHubSkillReader, LocalFsSkillReader } from "@FeiyouG/skill-lab";
import { join } from "jsr:@std/path@^1.0.0";

type AnalyzeOptions = {
    github?: string;
    gitRef?: string;
    dir?: string;
    githubToken?: string;
    cloud?: string;
    analyzer?: string;
    json?: boolean;
};

export const analyzeCommand = new Command()
    .description("Analyze a skill from local, GitHub, or cloud storage")
    .arguments("[path:string]")
    .option("--github <url:string>", "GitHub repository URL")
    .option("--gitRef <sha:string>", "Commit SHA, branch, or tag for GitHub analysis")
    .option("--dir <path:string>", "Subdirectory within the skill")
    .option("--github-token <token:string>", "GitHub token (overrides GITHUB_TOKEN)")
    .option("--cloud <baseUrl:string>", "Cloud storage base URL")
    .option("--json", "Output as JSON")
    .action(async (options: AnalyzeOptions, path?: string) => {
        try {
            const reader = await resolveReader(options, path);
            const validation = await reader.exists();
            if (!validation) {
                console.warn("Warning: SKILL.md missing or invalid frontmatter");
            }

            const { runAnalysis } = await import("@FeiyouG/skill-lab-analyzer");
            const result = await runAnalysis({
                context: { skillReader: reader },
                skillId: "local",
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

async function resolveReader(options: AnalyzeOptions, path?: string) {
    if (options.github) {
        if (!options.gitRef) {
            throw new Error("Commit SHA required for GitHub analysis. Use --commit.");
        }
        return new GitHubSkillReader({
            repoUrl: options.github,
            gitRef: options.gitRef,
            dir: options.dir,
            token: options.githubToken ?? Deno.env.get("GITHUB_TOKEN") ?? undefined,
        });
    }

    if (options.cloud) {
        return new CloudStorageSkillReader({ baseUrl: options.cloud });
    }

    if (!path) {
        throw new Error("Path required. Provide a local path or use --github/--cloud.");
    }
    if (path.startsWith("https://") || path.startsWith("http://")) {
        throw new Error("URL provided. Use --github or --cloud with the URL instead.");
    }
    const rootPath = options.dir ? join(path, options.dir) : path;
    try {
        const stat = await Deno.stat(rootPath);
        if (!stat.isDirectory) {
            throw new Error("Path must be a directory");
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Local path not found: ${message}`);
    }

    return new LocalFsSkillReader({ root: rootPath });
}
