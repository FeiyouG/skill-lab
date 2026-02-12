/**
 * CLI Main Tests
 */

import { assertEquals, assertExists } from "jsr:@std/assert@^1.0.0";
import { CLI_NAME, CLI_VERSION } from "./main.ts";

Deno.test("CLI constants - CLI_NAME should be defined", () => {
    assertExists(CLI_NAME);
    assertEquals(CLI_NAME, "slab");
});

Deno.test("CLI constants - CLI_VERSION should be defined", () => {
    assertExists(CLI_VERSION);
    assertEquals(typeof CLI_VERSION, "string");
});

Deno.test("CLI constants - CLI_VERSION should be semver format", () => {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    assertEquals(semverRegex.test(CLI_VERSION), true);
});
