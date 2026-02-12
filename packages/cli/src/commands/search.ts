import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";
import { apiClient } from "../api/client.ts";

export const searchCommand = new Command()
    .description("Search for skills in the registry")
    .arguments("<query:string>")
    .option("-l, --limit <limit:number>", "Number of results to show", { default: 20 })
    .option("-p, --page <page:number>", "Page number", { default: 1 })
    .example("Search for code skills", "slab search code")
    .example("Search with limit", "slab search git --limit 10")
    .action(async (options, query: string) => {
        try {
            const result = await apiClient.searchSkills(query, options.page, options.limit);

            if (result.skills.length === 0) {
                console.log(`No skills found for "${query}"`);
                return;
            }

            const table = new Table()
                .header(["Name", "Description", "Status", "Version"])
                .body(
                    result.skills.map((skill) => [
                        skill.name,
                        truncate(skill.description, 50),
                        formatStatus(skill.status),
                        skill.latestVersion?.version || "-",
                    ]),
                )
                .border(true);

            console.log(`\nFound ${result.pagination.total} skill(s) for "${query}":\n`);
            table.render();

            if (result.pagination.totalPages > 1) {
                console.log(`\nPage ${result.pagination.page} of ${result.pagination.totalPages}`);
            }
        } catch (error) {
            console.error(
                "Error searching skills:",
                error instanceof Error ? error.message : error,
            );
            Deno.exit(1);
        }
    });

function truncate(str: string, length: number): string {
    return str.length > length ? str.slice(0, length - 3) + "..." : str;
}

function formatStatus(status: string): string {
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
