import { Command } from "@cliffy/command";
import { CONFIG_PATH, getConfig, resetConfig, setConfig } from "../config/config.ts";

export const configCommand = new Command()
    .description("Manage slab configuration")
    .example("Show config", "slab config")
    .example("Set API URL", "slab config set api_url https://api.goskilla.com")
    .example("Reset config", "slab config reset")
    .action(async () => {
        const config = await getConfig();
        console.log(`\nConfiguration (${CONFIG_PATH}):\n`);
        console.log(JSON.stringify(config, null, 2));
    })
    .command(
        "get",
        new Command()
            .description("Get a config value")
            .arguments("<key:string>")
            .action(async (_options, key: string) => {
                const config = await getConfig();
                const value = config[key];
                if (value === undefined) {
                    console.log(`Config key '${key}' is not set.`);
                } else {
                    console.log(value);
                }
            }),
    )
    .command(
        "set",
        new Command()
            .description("Set a config value")
            .arguments("<key:string> <value:string>")
            .action(async (_options, key: string, value: string) => {
                await setConfig(key, value);
                console.log(`Set ${key} = ${value}`);
            }),
    )
    .command(
        "reset",
        new Command()
            .description("Reset configuration to defaults")
            .option("-y, --yes", "Skip confirmation")
            .action(async (options) => {
                if (!options.yes) {
                    const buf = new Uint8Array(1);
                    await Deno.stdout.write(
                        new TextEncoder().encode("Reset config to defaults? [y/N] "),
                    );
                    const n = await Deno.stdin.read(buf);
                    if (n === null) return;
                    const answer = new TextDecoder().decode(buf).toLowerCase();
                    if (answer !== "y") {
                        console.log("Reset cancelled.");
                        return;
                    }
                }
                await resetConfig();
                console.log("Configuration reset to defaults.");
            }),
    );
