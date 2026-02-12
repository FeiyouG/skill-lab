import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";
import { getInstalledSkills } from "../config/config.ts";

export const listCommand = new Command()
    .description("List installed skills")
    .option("-g, --global", "List globally installed skills only")
    .option("-l, --local", "List locally installed skills only")
    .option("--json", "Output as JSON")
    .example("List all installed", "slab list")
    .example("List global only", "slab list --global")
    .action(async (options) => {
        try {
            const skills = await getInstalledSkills({
                global: options.global,
                local: options.local,
            });

            if (options.json) {
                console.log(JSON.stringify(skills, null, 2));
                return;
            }

            if (skills.length === 0) {
                console.log("No skills installed.");
                console.log("\nUse 'slab search <query>' to find skills.");
                return;
            }

            const table = new Table()
                .header(["Name", "Version", "Location", "Path"])
                .body(
                    skills.map((skill) => [
                        skill.name,
                        skill.version,
                        skill.global ? "global" : "local",
                        skill.path,
                    ]),
                )
                .border(true);

            console.log(`\n${skills.length} skill(s) installed:\n`);
            table.render();
        } catch (error) {
            console.error("Error listing skills:", error instanceof Error ? error.message : error);
            Deno.exit(1);
        }
    });
