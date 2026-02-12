/**
 * Config Tests
 */

import { assertEquals, assertExists } from "jsr:@std/assert@^1.0.0";
import { CONFIG_DIR, CONFIG_PATH, INSTALLED_PATH } from "./config.ts";

Deno.test("Config paths - CONFIG_DIR should be defined", () => {
    assertExists(CONFIG_DIR);
    assertEquals(CONFIG_DIR.includes(".config/slab"), true);
});

Deno.test("Config paths - CONFIG_PATH should be defined", () => {
    assertExists(CONFIG_PATH);
    assertEquals(CONFIG_PATH.endsWith("config.json"), true);
});

Deno.test("Config paths - INSTALLED_PATH should be defined", () => {
    assertExists(INSTALLED_PATH);
    assertEquals(INSTALLED_PATH.endsWith("installed.json"), true);
});
