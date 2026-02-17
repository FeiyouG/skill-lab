import { assertEquals } from "@std/assert";
import type { AnalyzerContext } from "../../types.ts";
import { AstGrepClient } from "../../astgrep/client.ts";
import { TreesitterClient } from "../../treesitter/client.ts";
import { extractCodeBlocks } from "./extractCodeBlocks.ts";

function makeContext(): AnalyzerContext {
    return {
        astgrepClient: new AstGrepClient(),
        treesitterClient: new TreesitterClient(),
        skillReader: null as unknown as AnalyzerContext["skillReader"],
    };
}

Deno.test("extractCodeBlocks extracts fenced script blocks with language mapping", async () => {
    const content = [
        "# Title",
        "```bash",
        "echo hi",
        "```",
    ].join("\n");

    const blocks = await extractCodeBlocks(makeContext(), content);
    const script = blocks.find((b) => b.type === "script");

    assertEquals(script?.language, "bash");
    assertEquals(script?.content, "echo hi");
    assertEquals(script?.startLine, 2);
    assertEquals(script?.endLine, 4);
});

Deno.test("extractCodeBlocks falls back to text for unknown fence language", async () => {
    const content = "```customlang\nprint('x')\n```";
    const blocks = await extractCodeBlocks(makeContext(), content);
    const script = blocks.find((b) => b.type === "script");

    assertEquals(script?.language, "text");
    assertEquals(script?.content, "print('x')");
});

Deno.test("extractCodeBlocks skips empty fenced content", async () => {
    const content = "```bash\n\n```";
    const blocks = await extractCodeBlocks(makeContext(), content);
    assertEquals(blocks.some((b) => b.type === "script"), false);
});

Deno.test("extractCodeBlocks extracts inline code spans as inline bash blocks", async () => {
    const content = "Run `git status` then `python scripts/check.py`.";
    const blocks = await extractCodeBlocks(makeContext(), content);
    const inline = blocks.filter((b) => b.type === "inline").map((b) => b.content);

    assertEquals(inline.includes("git status"), true);
    assertEquals(inline.includes("python scripts/check.py"), true);
});

Deno.test("extractCodeBlocks skips non-command inline snippets", async () => {
    const long = "a".repeat(201);
    const content = `Ignore \`123\` and \`${long}\` and \`_hidden\``;
    const blocks = await extractCodeBlocks(makeContext(), content);
    const inline = blocks.filter((b) => b.type === "inline");
    assertEquals(inline.length, 0);
});

Deno.test("extractCodeBlocks handles mixed fenced and inline blocks", async () => {
    const content = [
        "Line 1",
        "```python",
        "print('hi')",
        "```",
        "Use `npm test` now.",
    ].join("\n");
    const blocks = await extractCodeBlocks(makeContext(), content);

    const types = blocks.map((b) => b.type).sort();
    assertEquals(types, ["inline", "script"]);
});
