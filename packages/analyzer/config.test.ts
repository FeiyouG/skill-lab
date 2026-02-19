import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { DEFAULT_ANALYZER_CONFIG, resolveConfig } from "./config.ts";

Deno.test("resolveConfig applies defaults and overrides", () => {
    const resolved = resolveConfig({
        scan: {
            maxFileCount: 50,
        },
        allowlist: {
            network: {
                domains: ["pypi.org"],
            },
        },
    });

    assertEquals(resolved.scan?.maxFileSize, DEFAULT_ANALYZER_CONFIG.scan?.maxFileSize);
    assertEquals(resolved.scan?.maxFileCount, 50);
    assertEquals(resolved.scan?.maxScanDepth, DEFAULT_ANALYZER_CONFIG.scan?.maxScanDepth);
    assertEquals(resolved.allowlist?.network?.domains, ["pypi.org"]);
    assertEquals(resolved.allowlist?.languages, undefined);
});
