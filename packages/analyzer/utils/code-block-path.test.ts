import { assertEquals } from "@std/assert";
import { decodeCodeBlockPath, encodeCodeBlockPath, isCodeBlockPath } from "./code-block-path.ts";

Deno.test("code-block path round trip", () => {
    const encoded = encodeCodeBlockPath("SKILL.md", 42, 60);
    assertEquals(encoded, "SKILL.md:42-60");

    const decoded = decodeCodeBlockPath(encoded);
    assertEquals(decoded, {
        parentPath: "SKILL.md",
        startLine: 42,
        endLine: 60,
    });
});

Deno.test("code-block path decoder rejects invalid shapes", () => {
    assertEquals(decodeCodeBlockPath("SKILL.md"), null);
    assertEquals(decodeCodeBlockPath("SKILL.md:abc-20"), null);
    assertEquals(decodeCodeBlockPath("SKILL.md:10-2"), null);
    assertEquals(decodeCodeBlockPath("SKILL.md:0-2"), null);
});

Deno.test("isCodeBlockPath checks encoded shape", () => {
    assertEquals(isCodeBlockPath("SKILL.md:1-1"), true);
    assertEquals(isCodeBlockPath("references/workflows.md"), false);
});
