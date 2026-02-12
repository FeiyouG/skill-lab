import { Command } from "@cliffy/command";
import { apiClient } from "../api/client.ts";

export const infoCommand = new Command()
    .description("Show detailed information about a skill")
    .arguments("<skill:string>")
    .option("--json", "Output as JSON")
    .example("Show skill info", "slab info git-release")
    .example("Show as JSON", "slab info git-release --json")
    .action(async (options, skill: string) => {
        try {
            const skillData = await apiClient.getSkill(skill);
            const analysis = (await apiClient.getSkillAnalysis(skill)) as {
                status?: string;
                permissions?: { list?: string[] };
                riskSignals?: {
                    list?: {
                        severity?: string;
                        type?: string;
                        message?: string;
                        reference?: string;
                    }[];
                };
                summary?: string;
            } | null;

            if (options.json) {
                console.log(JSON.stringify({ skill: skillData, analysis }, null, 2));
                return;
            }

            console.log(`\n${"=".repeat(60)}`);
            console.log(`  ${skillData.displayName || skillData.name}`);
            console.log(`${"=".repeat(60)}\n`);

            console.log(`  Name:        ${skillData.name}`);
            console.log(`  Description: ${skillData.description}`);
            console.log(`  Author:      ${skillData.author?.githubUsername || skillData.authorId}`);
            console.log(`  Repo Type:   ${skillData.repoType}`);
            console.log(`  Status:      ${formatSkillStatus(skillData.status)}`);
            console.log(`  Version:     ${skillData.latestVersion?.version || "N/A"}`);
            if (skillData.latestVersion) {
                console.log(`  Repo URL:    ${skillData.latestVersion.repoUrl}`);
                console.log(`  Commit:      ${skillData.latestVersion.commitHash.slice(0, 7)}`);
            }
            if (skillData.license) {
                console.log(`  License:     ${skillData.license}`);
            }
            if (skillData.keywords && skillData.keywords.length > 0) {
                console.log(`  Keywords:    ${skillData.keywords.join(", ")}`);
            }

            if (analysis) {
                console.log(`\n${"─".repeat(60)}`);
                console.log("  Analysis Results");
                console.log(`${"─".repeat(60)}\n`);

                const statusLabel = analysis.status
                    ? formatAnalysisStatus(analysis.status)
                    : "pending";
                console.log(`  Status:      ${statusLabel}`);

                console.log("  Permissions:");
                const permissions = analysis.permissions?.list ?? [];
                if (permissions.length === 0) {
                    console.log("    none");
                } else {
                    for (const perm of permissions) {
                        console.log(`    ${perm}`);
                    }
                }

                const riskSignals = analysis.riskSignals?.list ?? [];
                if (riskSignals.length > 0) {
                    console.log("\n  Risk Signals:");
                    for (const signal of riskSignals) {
                        const icon = signal.severity === "critical"
                            ? "!"
                            : signal.severity === "warning"
                            ? "?"
                            : "i";
                        const message = signal.message || signal.type;
                        console.log(`    [${icon}] ${message}`);
                        if (signal.reference) {
                            console.log(`        at ${signal.reference}`);
                        }
                    }
                }

                if (analysis.summary) {
                    console.log(`\n  Summary: ${analysis.summary}`);
                }
            }

            console.log("");
        } catch (error) {
            console.error("Error fetching skill:", error instanceof Error ? error.message : error);
            Deno.exit(1);
        }
    });

function formatSkillStatus(status: string): string {
    switch (status) {
        case "active":
            return "\x1b[32m" + status + "\x1b[0m"; // green
        case "deprecated":
            return "\x1b[33m" + status + "\x1b[0m"; // yellow
        case "removed":
            return "\x1b[31m" + status + "\x1b[0m"; // red
        default:
            return status;
    }
}

function formatAnalysisStatus(status: string): string {
    switch (status) {
        case "completed":
            return "\x1b[32m" + status + "\x1b[0m"; // green
        case "pending":
            return "\x1b[33m" + status + "\x1b[0m"; // yellow
        case "analyzing":
            return "\x1b[36m" + status + "\x1b[0m"; // cyan
        case "failed":
            return "\x1b[31m" + status + "\x1b[0m"; // red
        default:
            return status;
    }
}
