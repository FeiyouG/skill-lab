import { assertEquals } from "@std/assert";
import { extractBashFileRefs } from "./extractFileRefs.ts";
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

Deno.test("extractBashFileRefs - extracts curl URLs", () => {
    const content = `curl https://api.example.com/data -o output.json`;
    const refs = extractBashFileRefs(makeContext(), content);
    const urls = refs.filter((r) => r.via === "url").map((r) => r.path);

    assertEquals(urls.some((u) => u.includes("api.example.com")), true);
});

Deno.test("extractBashFileRefs - extracts wget URLs", () => {
    const content = `wget https://download.example.com/file.tar.gz`;
    const refs = extractBashFileRefs(makeContext(), content);
    const urls = refs.filter((r) => r.via === "url").map((r) => r.path);

    assertEquals(urls.some((u) => u.includes("download.example.com")), true);
});

Deno.test("extractBashFileRefs - extracts source includes", () => {
    const content = `source ./helper.sh\n. ./utils.sh`;
    const refs = extractBashFileRefs(makeContext(), content);
    const sources = refs.filter((r) => r.via === "source").map((r) => r.path);

    assertEquals(sources.includes("./helper.sh"), true);
    assertEquals(sources.includes("./utils.sh"), true);
});

Deno.test("extractBashFileRefs - detects host FS paths", () => {
    const content = `cat ~/secrets.txt\ncp /etc/passwd /tmp/out`;
    const refs = extractBashFileRefs(makeContext(), content);
    const hostPaths = refs.filter((r) => r.via === "bare-path").map((r) => r.path);

    assertEquals(hostPaths.some((p) => p.includes("~/secrets.txt") || p.includes("~/")), true);
});

Deno.test("extractBashFileRefs - skips comment lines", () => {
    const content = `# curl https://should-not-be-extracted.com/data`;
    const refs = extractBashFileRefs(makeContext(), content);

    assertEquals(refs.length, 0);
});

Deno.test("extractBashFileRefs - extracts script command path", () => {
    const content = `scripts/package_skill.py <path/to/skill-folder>`;
    const refs = extractBashFileRefs(makeContext(), content);
    const paths = refs.map((r) => r.path);

    assertEquals(paths.includes("scripts/package_skill.py"), true);
});
