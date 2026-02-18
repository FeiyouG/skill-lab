/**
 * Config Tests
 */

import { assertEquals, assertExists } from "jsr:@std/assert@^1.0.0";
import { CONFIG_DIR, CONFIG_PATH, getConfigValue, INSTALLED_PATH } from "./config.ts";

Deno.test("Config paths - CONFIG_DIR should be defined", () => {
    assertExists(CONFIG_DIR);
    assertEquals(CONFIG_DIR.includes("skill-lab"), true);
});

Deno.test("Config paths - CONFIG_PATH should be defined", () => {
    assertExists(CONFIG_PATH);
    assertEquals(CONFIG_PATH.endsWith("config.json"), true);
});

Deno.test("Config paths - INSTALLED_PATH should be defined", () => {
    assertExists(INSTALLED_PATH);
    assertEquals(INSTALLED_PATH.endsWith("installed.json"), true);
});

Deno.test("getConfigValue returns full object when path is empty", () => {
    const config = { allowlist: { languages: { python: { imports: ["os"] } } } };
    assertEquals(getConfigValue(config, undefined), config);
    assertEquals(getConfigValue(config, ""), config);
});

Deno.test("getConfigValue resolves nested dot-paths", () => {
    const config = { allowlist: { languages: { python: { imports: ["os", "sys"] } } } };
    assertEquals(getConfigValue(config, "allowlist"), config.allowlist);
    assertEquals(
        getConfigValue(config, "allowlist.languages.python"),
        config.allowlist.languages.python,
    );
    assertEquals(
        getConfigValue(config, "allowlist.languages.python.imports"),
        ["os", "sys"],
    );
});

Deno.test("getConfigValue returns undefined for missing path", () => {
    const config = { allowlist: { languages: {} } };
    assertEquals(getConfigValue(config, "allowlist.languages.ruby"), undefined);
    assertEquals(getConfigValue(config, "denylist.network"), undefined);
});
