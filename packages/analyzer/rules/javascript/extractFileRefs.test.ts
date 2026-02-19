import { assertEquals } from "@std/assert";
import { extractJsFileRefs } from "./extractFileRefs.ts";
import { AstGrepClient } from "../../astgrep/client.ts";
import { TreesitterClient } from "../../treesitter/client.ts";
import { DEFAULT_ANALYZER_CONFIG } from "../../config/mod.ts";
import type { AnalyzerContext } from "../../types.ts";

function makeContext(): AnalyzerContext {
    return {
        astgrepClient: new AstGrepClient(),
        treesitterClient: new TreesitterClient(),
        skillReader: null as unknown as AnalyzerContext["skillReader"],
        config: DEFAULT_ANALYZER_CONFIG,
    };
}

Deno.test("extractJsFileRefs - extracts ES module imports", async () => {
    const content =
        `import { readFile } from "fs/promises";\nimport axios from "axios";\nimport type { Foo } from "./types.ts";`;
    const refs = await extractJsFileRefs(makeContext(), content);
    const imports = refs.filter((r) => r.via === "import").map((r) => r.path);

    assertEquals(imports.includes("fs/promises"), true);
    assertEquals(imports.includes("axios"), true);
    assertEquals(imports.includes("./types.ts"), true);
});

Deno.test("extractJsFileRefs - extracts require() calls", async () => {
    const content = `const path = require("path");\nconst express = require("express");`;
    const refs = await extractJsFileRefs(makeContext(), content);
    const imports = refs.filter((r) => r.via === "import").map((r) => r.path);

    assertEquals(imports.includes("path"), true);
    assertEquals(imports.includes("express"), true);
});

Deno.test("extractJsFileRefs - extracts fetch URLs", async () => {
    const content = `const res = await fetch("https://api.example.com/users");`;
    const refs = await extractJsFileRefs(makeContext(), content);
    const urls = refs.filter((r) => r.via === "url").map((r) => r.path);

    assertEquals(urls.some((u) => u.includes("api.example.com")), true);
});

Deno.test("extractJsFileRefs - detects fs calls with host paths", async () => {
    const content = `fs.readFile("/etc/secrets.json", "utf8", callback);`;
    const refs = await extractJsFileRefs(makeContext(), content);
    const hostPaths = refs.filter((r) => r.via === "bare-path").map((r) => r.path);

    assertEquals(hostPaths.includes("/etc/secrets.json"), true);
});

Deno.test("extractJsFileRefs - skips comment lines", async () => {
    const content = `// import "should-not-be-extracted"`;
    const refs = await extractJsFileRefs(makeContext(), content);

    assertEquals(refs.length, 0);
});
