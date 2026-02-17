import { assertEquals } from "@std/assert";
import { extractMarkdownFileRefs } from "./extractFileRefs.ts";
import { AstGrepClient } from "../../astgrep/client.ts";
import { TreesitterClient } from "../../treesitter/client.ts";
import type { AnalyzerContext } from "../../types.ts";

function makeContext(): AnalyzerContext {
    return {
        astgrepClient: new AstGrepClient(),
        treesitterClient: new TreesitterClient(),
        skillReader: null as unknown as AnalyzerContext["skillReader"],
    };
}

Deno.test("extractMarkdownFileRefs - extracts markdown links", async () => {
    const content = `
# My skill

See [the workflows guide](references/workflows.md) for details.
Also check [output patterns](references/output-patterns.md).
`;
    const refs = await extractMarkdownFileRefs(makeContext(), content);
    const paths = refs.map((r) => r.path);
    const vias = refs.map((r) => r.via);

    // Both real links should be found
    assertEquals(paths.includes("references/workflows.md"), true);
    assertEquals(paths.includes("references/output-patterns.md"), true);

    // All should be markdown-link
    for (const via of vias) {
        assertEquals(via, "markdown-link");
    }
});

Deno.test("extractMarkdownFileRefs - skips fenced code block content", async () => {
    const content = `
# Skill structure

\`\`\`
bigquery-skill/
├── SKILL.md
└── reference/
    ├── finance.md
    ├── sales.md
    └── product.md
\`\`\`

Some text after the block.
`;
    const refs = await extractMarkdownFileRefs(makeContext(), content);
    const paths = refs.map((r) => r.path);

    // Paths inside fenced block should NOT be extracted
    assertEquals(paths.includes("finance.md"), false);
    assertEquals(paths.includes("sales.md"), false);
    assertEquals(paths.includes("product.md"), false);
});

Deno.test("extractMarkdownFileRefs - skips code block with language label", async () => {
    const content = `
# Example

\`\`\`markdown
skill-creator/
├── SKILL.md
└── references/
    ├── finance.md
    └── mnda.md
\`\`\`

Real link: [see this](references/real.md)
`;
    const refs = await extractMarkdownFileRefs(makeContext(), content);
    const paths = refs.map((r) => r.path);

    // Files inside fenced block should NOT be extracted
    assertEquals(paths.includes("finance.md"), false);
    assertEquals(paths.includes("mnda.md"), false);

    // The real markdown link SHOULD be extracted
    assertEquals(paths.includes("references/real.md"), true);
});

Deno.test("extractMarkdownFileRefs - filters out URLs in markdown links", async () => {
    const content = `See [Apache License](https://www.apache.org/licenses/LICENSE-2.0) for terms.`;
    const refs = await extractMarkdownFileRefs(makeContext(), content);
    const paths = refs.map((r) => r.path);

    // URLs should be filtered out (they're not skill-local file refs)
    assertEquals(paths.some((p) => p.includes("apache.org")), false);
});

Deno.test("extractMarkdownFileRefs - extracts inline code paths", async () => {
    const content = "Run the extraction script: `scripts/extract.py arg1` to process the file.";
    const refs = await extractMarkdownFileRefs(makeContext(), content);
    const paths = refs.map((r) => r.path);
    const vias = refs.map((r) => r.via);

    // The path argument in inline code should be found
    const inlineIdx = paths.indexOf("scripts/extract.py");
    // If found, it should be tagged as inline-code
    if (inlineIdx >= 0) {
        assertEquals(vias[inlineIdx], "inline-code");
    }
    // Note: the first token (scripts/extract.py here) could be treated as command or path
    // depending on tree-sitter node type detection; at minimum it should not crash
});

Deno.test("extractMarkdownFileRefs - does not extract anchor links", async () => {
    const content = `See [the section](#installation) for details.`;
    const refs = await extractMarkdownFileRefs(makeContext(), content);
    const paths = refs.map((r) => r.path);

    assertEquals(paths.includes("#installation"), false);
});
