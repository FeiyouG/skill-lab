import { Command } from "@cliffy/command";
import { getInstalledSkills } from "../config/config.ts";
import { apiClient } from "../api/client.ts";

export const updateCommand = new Command()
    .description("Update installed skills to latest versions")
    .arguments("[skill:string]")
    .option("-g, --global", "Update globally installed skills only")
    .option("-y, --yes", "Skip confirmation")
    .example("Update all skills", "slab update")
    .example("Update specific skill", "slab update git-release")
    .action(async (options, skill?: string) => {
        try {
            const installed = await getInstalledSkills({ global: options.global });
            const toUpdate = skill ? installed.filter((s) => s.name === skill) : installed;

            if (toUpdate.length === 0) {
                console.log(skill ? `Skill '${skill}' is not installed.` : "No skills installed.");
                return;
            }

            console.log("\nChecking for updates...\n");

            const updates: Array<{ name: string; current: string; latest: string; path: string }> =
                [];

            for (const s of toUpdate) {
                const remote = await apiClient.getSkill(s.name);
                const latestVersion = remote.latestVersion?.version;
                if (latestVersion && latestVersion !== s.version) {
                    updates.push({
                        name: s.name,
                        current: s.version,
                        latest: latestVersion,
                        path: s.path,
                    });
                }
            }

            if (updates.length === 0) {
                console.log("All skills are up to date.");
                return;
            }

            console.log(`Found ${updates.length} update(s):\n`);
            for (const u of updates) {
                console.log(`  ${u.name}: ${u.current} -> ${u.latest}`);
            }

            if (!options.yes) {
                const buf = new Uint8Array(1);
                await Deno.stdout.write(new TextEncoder().encode("\nProceed with updates? [y/N] "));
                const n = await Deno.stdin.read(buf);
                if (n === null) return;
                const answer = new TextDecoder().decode(buf).toLowerCase();
                if (answer !== "y") {
                    console.log("Update cancelled.");
                    return;
                }
            }

            console.log("\nUpdating...\n");

            for (const u of updates) {
                console.log(`  Updating ${u.name}...`);
                const content = await apiClient.downloadSkill(u.name, u.latest);
                await Deno.writeTextFile(`${u.path}/SKILL.md`, content);
                console.log(`  \x1b[32mUpdated ${u.name} to ${u.latest}\x1b[0m`);
            }

            console.log("\nAll updates complete.");
        } catch (error) {
            console.error("Error updating skills:", error instanceof Error ? error.message : error);
            Deno.exit(1);
        }
    });
