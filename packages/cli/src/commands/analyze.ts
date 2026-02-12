import { Command } from "@cliffy/command";
import { runAnalysis } from "@FeiyouG/skill-lab-analyzer";
import { GitHubSkillReader, LocalFsSkillReader, SupabaseSkillReader } from "@FeiyouG/skill-lab";
import { analyzerV1 } from "@FeiyouG/skill-lab-shared";
import { join } from "jsr:@std/path@^1.0.0";

type AnalyzeOptions = {
    github?: string;
    gitRef?: string;
    dir?: string;
    githubToken?: string;
    supabase?: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    analyzer?: string;
    json?: boolean;
};

export const analyzeCommand = new Command()
    .description("Analyze a skill from local, GitHub, or Supabase")
    .arguments("[path:string]")
    .option("--github <url:string>", "GitHub repository URL")
    .option("--gitRef <sha:string>", "Commit SHA, branch, or tag for GitHub analysis")
    .option("--dir <path:string>", "Subdirectory within the skill")
    .option("--github-token <token:string>", "GitHub token (overrides GITHUB_TOKEN)")
    .option("--supabase <bucketPrefix:string>", "Supabase bucket/prefix (bucket or bucket/prefix)")
    .option("--supabase-url <url:string>", "Supabase URL (overrides SUPABASE_URL)")
    .option("--supabase-key <key:string>", "Supabase key (overrides SUPABASE_KEY)")
    .option("--analyzer <version:string>", "Analyzer version: v2 (default) or v1")
    .option("--json", "Output as JSON")
    .action(async (options: AnalyzeOptions, path?: string) => {
        try {
            const reader = await resolveReader(options, path);
            const validation = await reader.exists();
            if (!validation) {
                console.warn("Warning: SKILL.md missing or invalid frontmatter");
            }

            if (options.analyzer?.toLowerCase() === "v1") {
                const result = await runAnalyzerV1(reader, options);
                if (options.json) {
                    console.log(JSON.stringify(result, null, 2));
                    return;
                }
                printV1Summary(result);
                return;
            }

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

async function runAnalyzerV1(
    reader: Awaited<ReturnType<typeof resolveReader>>,
    options: AnalyzeOptions,
) {
    let state = analyzerV1.createInitialState({
        skillId: "local",
        skillVersionId: "local",
        repoUrl: options.github ?? "",
        commitHash: options.gitRef ?? "",
        dir: options.dir ?? null,
    });

    for (let step = 0; step <= analyzerV1.FINAL_STEP; step += 1) {
        const context = { skillReader: reader } as unknown as Parameters<
            typeof analyzerV1.runStep
        >[2];
        state = await analyzerV1.runStep(step, state, context);
    }

    return state;
}

function printV1Summary(state: Awaited<ReturnType<typeof runAnalyzerV1>>) {
    console.log(`\n${"=".repeat(60)}`);
    console.log("  Analysis Results (v1)");
    console.log(`${"=".repeat(60)}\n`);
    console.log(`  Permissions: ${(state.permissions?.list ?? []).join(", ") || "none"}`);
    console.log(`  Risks: ${(state.risks?.list ?? []).length}`);
    if (state.summary) {
        console.log(`\n  Summary: ${state.summary}`);
    }
    if (state.riskLevel) {
        console.log(`  Risk Level: ${state.riskLevel}`);
    }
    console.log("");
}

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

    if (options.supabase) {
        const supabaseUrl = options.supabaseUrl ?? Deno.env.get("SUPABASE_URL");
        const supabaseKey = options.supabaseKey ?? Deno.env.get("SUPABASE_KEY");
        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Supabase URL and key required. Use --supabase-url/--supabase-key.");
        }
        const { bucket, prefix } = parseBucketPrefix(options.supabase);
        return new SupabaseSkillReader({
            supabaseUrl,
            supabaseKey,
            bucket,
            prefix,
        });
    }

    if (!path) {
        throw new Error("Path required. Provide a local path or use --github/--supabase.");
    }
    if (path.startsWith("https://")) {
        throw new Error("URL provided. Use --github or --supabase with the URL instead.");
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

function parseBucketPrefix(input: string): { bucket: string; prefix: string } {
    const trimmed = input.replace(/^\/+|\/+$/g, "");
    if (!trimmed) {
        throw new Error("Supabase bucket/prefix required");
    }
    const [bucket, ...rest] = trimmed.split("/");
    return { bucket, prefix: rest.join("/") };
}
