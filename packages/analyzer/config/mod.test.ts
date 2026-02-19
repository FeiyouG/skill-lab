import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { DEFAULT_ANALYZER_CONFIG, resolveConfig } from "./mod.ts";

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
    assertEquals(resolved.allowlist?.languages, DEFAULT_ANALYZER_CONFIG.allowlist?.languages);
});

Deno.test("resolveConfig unions allowlist imports and network domains", () => {
    const resolved = resolveConfig({
        allowlist: {
            languages: {
                python: {
                    imports: ["requests", "json"],
                },
                javascript: {
                    imports: ["axios", "fs"],
                },
            },
            network: {
                domains: ["pypi.org", "npmjs.com", "pypi.org"],
            },
        },
    });

    assertEquals(resolved.allowlist?.languages?.python?.imports?.includes("os"), true);
    assertEquals(resolved.allowlist?.languages?.python?.imports?.includes("json"), true);
    assertEquals(resolved.allowlist?.languages?.python?.imports?.includes("requests"), true);

    assertEquals(resolved.allowlist?.languages?.javascript?.imports?.includes("fs"), true);
    assertEquals(resolved.allowlist?.languages?.javascript?.imports?.includes("axios"), true);

    assertEquals(resolved.allowlist?.network?.domains, ["pypi.org", "npmjs.com"]);
});
