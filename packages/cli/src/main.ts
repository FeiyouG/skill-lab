import { Command } from "@cliffy/command";
import { searchCommand } from "./commands/search.ts";
import { infoCommand } from "./commands/info.ts";
import { installCommand } from "./commands/install.ts";
import { listCommand } from "./commands/list.ts";
import { updateCommand } from "./commands/update.ts";
import { uninstallCommand } from "./commands/uninstall.ts";
import { configCommand } from "./commands/config.ts";
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
    .example("Search for skills", `${CLI_NAME} search code-review`)
    .example("Get skill info", `${CLI_NAME} info git-release`)
    .example("Install a skill", `${CLI_NAME} install git-release`)
    .command("search", searchCommand)
    .command("info", infoCommand)
    .command("install", installCommand)
    .command("list", listCommand)
    .command("update", updateCommand)
    .command("uninstall", uninstallCommand)
    .command("config", configCommand)
    .command("analyze", analyzeCommand);

// Run CLI - show help by default if no args
if (Deno.args.length === 0) {
    main.showHelp();
} else {
    await main.parse(Deno.args);
}
