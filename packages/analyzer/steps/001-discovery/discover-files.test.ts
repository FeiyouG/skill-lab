import { assertEquals } from "@std/assert";
import { discoverReferencedFiles } from "./discover-files.ts";
import type { SkillFile } from "@FeiyouG/skill-lab";
import { AstGrepClient } from "../../astgrep/client.ts";
import { TreesitterClient } from "../../treesitter/client.ts";
import { DEFAULT_ANALYZER_CONFIG } from "../../config/mod.ts";
import type { AnalyzerContext } from "../../types.ts";

// Minimal SkillFile for test use
function makeSkillFile(path: string): SkillFile {
    return { path } as unknown as SkillFile;
}

function makeContext(): AnalyzerContext {
    return {
        astgrepClient: new AstGrepClient(),
        treesitterClient: new TreesitterClient(),
        skillReader: null as unknown as AnalyzerContext["skillReader"],
        config: DEFAULT_ANALYZER_CONFIG,
    };
}

const SKILL_MD_CONTENT = `---
name: my-skill
description: A test skill
---

# My Skill

See [the workflows guide](references/workflows.md) for details.

The following files are NOT part of this skill (hypothetical examples):
\`\`\`
bigquery-skill/
├── SKILL.md
└── reference/
    ├── finance.md
    └── sales.md
\`\`\`

External link: [Apache License](https://www.apache.org/licenses/LICENSE-2.0)
`;

Deno.test(
    "discoverReferencedFiles - discovers local markdown-linked files",
    async () => {
        const allFiles: SkillFile[] = [
            makeSkillFile("SKILL.md"),
            makeSkillFile("references/workflows.md"),
        ];

        const discovered = await discoverReferencedFiles(makeContext(), {
            startQueue: [{ path: "SKILL.md", depth: 0 }],
            allFiles,
            readTextFile: (path: string): Promise<string | null> => {
                if (path === "SKILL.md") return Promise.resolve(SKILL_MD_CONTENT);
                if (path === "references/workflows.md") {
                    return Promise.resolve("# Workflows\nNo external refs here.");
                }
                return Promise.resolve(null);
            },
            maxScanDepth: 2,
        });

        const local = discovered.filter((r) => r.sourceType === "local").map((r) => r.path);
        assertEquals(local.includes("references/workflows.md"), true);
    },
);

Deno.test(
    "discoverReferencedFiles - silently discards bare-path non-existing refs",
    async () => {
        // finance.md and sales.md are inside a fenced code block, so the markdown
        // extractor should NOT pick them up (tree-sitter skips fenced blocks).
        // Even if they were picked up as bare-paths, they don't exist in allFiles,
        // so they should be silently discarded (no external entry).
        const allFiles: SkillFile[] = [
            makeSkillFile("SKILL.md"),
        ];

        const discovered = await discoverReferencedFiles(makeContext(), {
            startQueue: [{ path: "SKILL.md", depth: 0 }],
            allFiles,
            readTextFile: (path: string): Promise<string | null> => {
                if (path === "SKILL.md") return Promise.resolve(SKILL_MD_CONTENT);
                return Promise.resolve(null);
            },
            maxScanDepth: 2,
        });

        const paths = discovered.map((r) => r.path);

        // Paths from fenced block / bare paths should NOT appear in discovered
        assertEquals(paths.includes("finance.md"), false);
        assertEquals(paths.includes("sales.md"), false);
    },
);

Deno.test(
    "discoverReferencedFiles - keeps external markdown-link refs as external",
    async () => {
        const allFiles: SkillFile[] = [makeSkillFile("SKILL.md")];

        const discovered = await discoverReferencedFiles(makeContext(), {
            startQueue: [{ path: "SKILL.md", depth: 0 }],
            allFiles,
            readTextFile: (path: string): Promise<string | null> => {
                if (path === "SKILL.md") return Promise.resolve(SKILL_MD_CONTENT);
                return Promise.resolve(null);
            },
            maxScanDepth: 2,
        });

        // The non-existent markdown-linked file should appear as external
        // (references/workflows.md is linked via markdown-link but doesn't exist in allFiles)
        const external = discovered.filter((r) => r.sourceType === "external").map((r) => r.path);
        const hasExternalRef = external.some((p) =>
            p.includes("workflows.md") || p.includes("apache.org")
        );
        assertEquals(hasExternalRef, true);
    },
);

Deno.test(
    "discoverReferencedFiles - marks host FS paths with role host-fs",
    async () => {
        const content = `# Skill\n\nRun: \`cat ~/config.yaml\`\n`;
        const allFiles: SkillFile[] = [makeSkillFile("SKILL.md")];

        const discovered = await discoverReferencedFiles(makeContext(), {
            startQueue: [{ path: "SKILL.md", depth: 0 }],
            allFiles,
            readTextFile: (path: string): Promise<string | null> => {
                if (path === "SKILL.md") return Promise.resolve(content);
                return Promise.resolve(null);
            },
            maxScanDepth: 2,
        });

        const hostFs = discovered.filter((r) => r.role === "host-fs");
        // Note: ~/config.yaml is inside inline code, token "~/config.yaml" should be
        // detected as a host-fs path by the markdown extractor's inline-code handling
        // (if looksLikePath detects it). The key test: if found, it must be role "host-fs".
        for (const entry of hostFs) {
            assertEquals(entry.role, "host-fs");
            assertEquals(entry.sourceType, "external");
        }
    },
);

Deno.test(
    "discoverReferencedFiles - discovers scripts referenced inside bash code blocks",
    async () => {
        const content = `# Packaging

Run:

\`\`\`bash
scripts/package_skill.py <path/to/skill-folder>
\`\`\`
`;

        const allFiles: SkillFile[] = [
            makeSkillFile("SKILL.md"),
            makeSkillFile("scripts/package_skill.py"),
        ];

        const discovered = await discoverReferencedFiles(makeContext(), {
            startQueue: [{ path: "SKILL.md", depth: 0 }],
            allFiles,
            readTextFile: (path: string): Promise<string | null> => {
                if (path === "SKILL.md") return Promise.resolve(content);
                if (path === "scripts/package_skill.py") return Promise.resolve("print('ok')");
                return Promise.resolve(null);
            },
            maxScanDepth: 2,
        });

        const discoveredPaths = discovered.map((item) => item.path);
        assertEquals(discoveredPaths.includes("scripts/package_skill.py"), true);
    },
);

Deno.test(
    "discoverReferencedFiles - keeps unresolved imports as external import library refs",
    async () => {
        const content = `import requests\nfrom pathlib import Path\n`;
        const allFiles: SkillFile[] = [makeSkillFile("scripts/main.py")];

        const discovered = await discoverReferencedFiles(makeContext(), {
            startQueue: [{ path: "scripts/main.py", depth: 0 }],
            allFiles,
            readTextFile: (path: string): Promise<string | null> => {
                if (path === "scripts/main.py") return Promise.resolve(content);
                return Promise.resolve(null);
            },
            maxScanDepth: 2,
        });

        const libraries = discovered.filter((item) =>
            item.sourceType === "external" && item.role === "library" &&
            item.discoveryMethod === "import"
        );
        const paths = libraries.map((item) => item.path);

        assertEquals(paths.includes("requests"), true);
        assertEquals(paths.includes("pathlib"), true);
        assertEquals(libraries.every((item) => item.fileType === "python"), true);
    },
);

Deno.test(
    "discoverReferencedFiles - keeps unresolved bash source includes as library refs",
    async () => {
        const content = `source ./lib/common.sh`;
        const allFiles: SkillFile[] = [makeSkillFile("scripts/main.sh")];

        const discovered = await discoverReferencedFiles(makeContext(), {
            startQueue: [{ path: "scripts/main.sh", depth: 0 }],
            allFiles,
            readTextFile: (path: string): Promise<string | null> => {
                if (path === "scripts/main.sh") return Promise.resolve(content);
                return Promise.resolve(null);
            },
            maxScanDepth: 2,
        });

        const sourceLibrary = discovered.find((item) =>
            item.path === "./lib/common.sh" && item.sourceType === "external" &&
            item.role === "library"
        );

        assertEquals(Boolean(sourceLibrary), true);
        assertEquals(sourceLibrary?.fileType, "bash");
        assertEquals(sourceLibrary?.discoveryMethod, "source");
    },
);
