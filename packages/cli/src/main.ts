import { Command } from "@cliffy/command";
import { analyzeCommand } from "./commands/analyze.ts";

// CLI name - easy to change if needed
export const CLI_NAME = "slab";
export const CLI_VERSION = "0.1.0";

const main = new Command()
    .name(CLI_NAME)
    .version(CLI_VERSION)
    .description("skill-lab - Skill registry CLI for AI agents")
    .meta("Author", "FeiyouG")
    .meta("Source", "https://github.com/FeiyouG/skill-lab")
    .command("analyze", analyzeCommand);

// Run CLI - show help by default if no args
if (Deno.args.length === 0) {
    main.showHelp();
} else {
    await main.parse(Deno.args);
}
