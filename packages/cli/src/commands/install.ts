import { Command } from "@cliffy/command";
import { apiClient } from "../api/client.ts";
import { trackInstallation as trackInstall } from "../config/config.ts";

export const installCommand = new Command()
    .description("Install a skill from the registry")
    .arguments("<skill:string>")
    .option("-v, --version <version:string>", "Install specific version")
    .option("-g, --global", "Install globally (~/.config/opencode/skills/)")
    .option("-y, --yes", "Skip confirmation for pending skills")
    .example("Install a skill", "slab install git-release")
    .example("Install specific version", "slab install git-release --version 1.0.0")
    .example("Install globally", "slab install git-release --global")
    .action(async (options, skill: string) => {
        try {
            const skillData = await apiClient.getSkill(skill);
            const analysis = (await apiClient.getSkillAnalysis(skill)) as {
                status?: string;
                permissions?: { list?: string[] };
                riskSignals?: { list?: { severity?: string }[] };
            } | null;

            const analysisStatus = analysis?.status || "pending";

            // Warning for pending skills
            if (analysisStatus !== "completed" && !options.yes) {
                console.log("\n\x1b[33m" + "!".repeat(60) + "\x1b[0m");
                console.log("\x1b[33m  WARNING: This skill has not completed analysis.\x1b[0m");
                console.log("\x1b[33m" + "!".repeat(60) + "\x1b[0m\n");

                if (analysis) {
                    console.log("  Analysis summary:");
                    const permissions = analysis.permissions?.list ?? [];
                    console.log(
                        `    Permissions: ${permissions.length ? permissions.join(", ") : "none"}`,
                    );

                    const warnings = (analysis.riskSignals?.list ?? []).filter(
                        (s: { severity?: string }) =>
                            s.severity === "warning" || s.severity === "critical",
                    );
                    if (warnings.length > 0) {
                        console.log(`    Risk signals: ${warnings.length} warning(s)`);
                    }
                }

                console.log("");
                const confirmed = await confirm("Do you want to proceed?");
                if (!confirmed) {
                    console.log("Installation cancelled.");
                    return;
                }
            }

            // Determine install directory
            const installDir = options.global
                ? `${Deno.env.get("HOME")}/.config/opencode/skills/${skillData.name}`
                : `.opencode/skills/${skillData.name}`;

            console.log(`\nInstalling ${skillData.name} to ${installDir}...`);

            // Fetch skill content
            const version = options.version || skillData.latestVersion?.version || "latest";
            const content = await apiClient.downloadSkill(skill, version);

            // Create directory and write SKILL.md
            await Deno.mkdir(installDir, { recursive: true });
            await Deno.writeTextFile(`${installDir}/SKILL.md`, content);

            // Track installation in local config
            await trackInstall({
                name: skillData.name,
                version,
                path: installDir,
                global: !!options.global,
                installedAt: new Date().toISOString(),
            });

            console.log(`\x1b[32m  Installed ${skillData.name}@${version}\x1b[0m`);
            console.log(`\nThe skill is now available in OpenCode.`);
        } catch (error) {
            console.error(
                "Error installing skill:",
                error instanceof Error ? error.message : error,
            );
            Deno.exit(1);
        }
    });

async function confirm(message: string): Promise<boolean> {
    const buf = new Uint8Array(1);
    await Deno.stdout.write(new TextEncoder().encode(`${message} [y/N] `));
    const n = await Deno.stdin.read(buf);
    if (n === null) return false;
    const answer = new TextDecoder().decode(buf).toLowerCase();
    return answer === "y";
}
