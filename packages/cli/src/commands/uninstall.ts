import { Command } from "@cliffy/command";
import { getInstalledSkills, removeInstallation } from "../config/config.ts";

export const uninstallCommand = new Command()
    .description("Uninstall a skill")
    .arguments("<skill:string>")
    .option("-g, --global", "Uninstall from global location")
    .option("-y, --yes", "Skip confirmation")
    .example("Uninstall a skill", "slab uninstall git-release")
    .action(async (options, skill: string) => {
        try {
            const installed = await getInstalledSkills({ global: options.global });
            const found = installed.find((s) => s.name === skill);

            if (!found) {
                console.log(`Skill '${skill}' is not installed.`);
                return;
            }

            if (!options.yes) {
                const buf = new Uint8Array(1);
                await Deno.stdout.write(
                    new TextEncoder().encode(`Uninstall ${skill} from ${found.path}? [y/N] `),
                );
                const n = await Deno.stdin.read(buf);
                if (n === null) return;
                const answer = new TextDecoder().decode(buf).toLowerCase();
                if (answer !== "y") {
                    console.log("Uninstall cancelled.");
                    return;
                }
            }

            console.log(`\nUninstalling ${skill}...`);

            // Remove the skill directory
            await Deno.remove(found.path, { recursive: true });

            // Remove from tracking
            await removeInstallation(skill);

            console.log(`\x1b[32m  Uninstalled ${skill}\x1b[0m`);
        } catch (error) {
            console.error(
                "Error uninstalling skill:",
                error instanceof Error ? error.message : error,
            );
            Deno.exit(1);
        }
    });
