import { assertEquals } from "@std/assert";
import { extractPythonFileRefs } from "./extractFileRefs.ts";
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

Deno.test("extractPythonFileRefs - extracts import statements", async () => {
    const content = `import requests\nimport os.path\nfrom pathlib import Path`;
    const refs = await extractPythonFileRefs(makeContext(), content);
    const imports = refs.filter((r) => r.via === "import").map((r) => r.path);

    assertEquals(imports.includes("requests"), true);
    assertEquals(imports.includes("os.path"), true);
    assertEquals(imports.includes("pathlib"), true);
});

Deno.test("extractPythonFileRefs - extracts from-import statements", async () => {
    const content = `from typing import List\nfrom collections import defaultdict`;
    const refs = await extractPythonFileRefs(makeContext(), content);
    const imports = refs.filter((r) => r.via === "import").map((r) => r.path);

    assertEquals(imports.includes("typing"), true);
    assertEquals(imports.includes("collections"), true);
});

Deno.test("extractPythonFileRefs - detects open() with host FS path", async () => {
    const content = `with open("/etc/config.txt", "r") as f:\n    data = f.read()`;
    const refs = await extractPythonFileRefs(makeContext(), content);
    const hostPaths = refs.filter((r) => r.via === "bare-path").map((r) => r.path);

    assertEquals(hostPaths.includes("/etc/config.txt"), true);
});

Deno.test("extractPythonFileRefs - skips comment lines", async () => {
    const content = `# import requests  <- this is commented out`;
    const refs = await extractPythonFileRefs(makeContext(), content);
    const imports = refs.filter((r) => r.via === "import");

    assertEquals(imports.length, 0);
});
