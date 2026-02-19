import { Command } from "@cliffy/command";
import { getConfig, getConfigValue } from "../config/config.ts";

export const configCommand = new Command()
    .description("Manage slab configuration")
    .example("Show config", "slab config show")
    .example("Get allowlist", "slab config get allowlist")
    .example("Get python allowlist", "slab config get allowlist.languages.python")
    .action(async () => {
        await printConfigValue();
    })
    .command(
        "show",
        new Command()
            .description("Print config")
            .action(async () => {
                await printConfigValue();
            }),
    )
    .command(
        "get",
        new Command()
            .description("Get a config value")
            .arguments("[key:string]")
            .action(async (_options, key?: string) => {
                await printConfigValue(key);
            }),
    );

async function printConfigValue(key?: string): Promise<void> {
    const config = await getConfig();
    const value = getConfigValue(config, key);
    if (value === undefined) {
        console.log(`Config key '${key}' is not set.`);
        Deno.exit(1);
    }
    if (typeof value === "object") {
        console.log(JSON.stringify(value, null, 2));
        return;
    }
    console.log(value);
}
