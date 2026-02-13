import { assertEquals } from "@std/assert";
import { extractPythonFileRefs } from "./extractFileRefs.ts";
import { AstGrepClient } from "../../astgrep/client.ts";
import { TreesitterClient } from "../../treesiter/client.ts";
import type { AnalyzerContext } from "../../types.ts";

function makeContext(): AnalyzerContext {
    return {
        astgrepClient: new AstGrepClient(),
        treesitterClient: new TreesitterClient(),
        skillReader: null as unknown as AnalyzerContext["skillReader"],
    };
}

Deno.test("extractPythonFileRefs - extracts import statements", () => {
    const content = `import requests\nimport os.path\nfrom pathlib import Path`;
    const refs = extractPythonFileRefs(makeContext(), content);
    const imports = refs.filter((r) => r.via === "import").map((r) => r.path);

    assertEquals(imports.includes("requests"), true);
    assertEquals(imports.includes("os.path"), true);
    assertEquals(imports.includes("pathlib"), true);
});

Deno.test("extractPythonFileRefs - extracts from-import statements", () => {
    const content = `from typing import List\nfrom collections import defaultdict`;
    const refs = extractPythonFileRefs(makeContext(), content);
    const imports = refs.filter((r) => r.via === "import").map((r) => r.path);

    assertEquals(imports.includes("typing"), true);
    assertEquals(imports.includes("collections"), true);
});

Deno.test("extractPythonFileRefs - detects open() with host FS path", () => {
    const content = `with open("/etc/config.txt", "r") as f:\n    data = f.read()`;
    const refs = extractPythonFileRefs(makeContext(), content);
    const hostPaths = refs.filter((r) => r.via === "bare-path").map((r) => r.path);

    assertEquals(hostPaths.includes("/etc/config.txt"), true);
});

Deno.test("extractPythonFileRefs - skips comment lines", () => {
    const content = `# import requests  <- this is commented out`;
    const refs = extractPythonFileRefs(makeContext(), content);
    const imports = refs.filter((r) => r.via === "import");

    assertEquals(imports.length, 0);
});
