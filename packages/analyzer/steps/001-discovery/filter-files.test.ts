import { assertEquals } from "@std/assert";
import type { SkillFile } from "@FeiyouG/skill-lab";
import type { FileReference } from "skill-lab/shared";
import { filterScanQueue } from "./filter-files.ts";

function makeSkillFile(
    path: string,
    size: number,
    contentType: "text" | "binary" = "text",
): SkillFile {
    return { path, size, contentType } as SkillFile;
}

function makeRef(
    path: string,
    role: FileReference["role"],
    fileType: FileReference["fileType"],
): FileReference {
    return {
        path,
        sourceType: "local",
        fileType,
        role,
        depth: 1,
    };
}

Deno.test("filterScanQueue sorts by role then file type", () => {
    const queue: FileReference[] = [
        makeRef("c.md", "reference", "markdown"),
        makeRef("a.md", "entrypoint", "markdown"),
        makeRef("b.py", "script", "python"),
        makeRef("d.pkg", "library", "unknown"),
        makeRef("e.json", "config", "json"),
    ];

    const allFiles: SkillFile[] = [
        makeSkillFile("a.md", 10),
        makeSkillFile("b.py", 10),
        makeSkillFile("c.md", 10),
        makeSkillFile("d.pkg", 10),
        makeSkillFile("e.json", 10),
    ];

    const result = filterScanQueue({ queue, allFiles, maxFileCount: 10, maxFileSize: 1000 });
    assertEquals(result.queue.map((q) => q.path), ["a.md", "c.md", "b.py", "d.pkg", "e.json"]);
});

Deno.test("filterScanQueue skips binary and too-large files", () => {
    const queue: FileReference[] = [
        makeRef("binary.bin", "regular", "unknown"),
        makeRef("large.txt", "regular", "text"),
        makeRef("ok.txt", "regular", "text"),
    ];
    const allFiles: SkillFile[] = [
        makeSkillFile("binary.bin", 50, "binary"),
        makeSkillFile("large.txt", 5000, "text"),
        makeSkillFile("ok.txt", 10, "text"),
    ];

    const result = filterScanQueue({ queue, allFiles, maxFileCount: 10, maxFileSize: 1000 });

    assertEquals(result.queue.map((q) => q.path), ["ok.txt"]);
    assertEquals(result.skipped, [
        { path: "large.txt", reason: "too_large" },
        { path: "binary.bin", reason: "binary" },
    ]);
});

Deno.test("filterScanQueue enforces max file count", () => {
    const queue: FileReference[] = [
        makeRef("a.md", "entrypoint", "markdown"),
        makeRef("b.md", "readme", "markdown"),
        makeRef("c.md", "reference", "markdown"),
    ];
    const allFiles: SkillFile[] = [
        makeSkillFile("a.md", 10),
        makeSkillFile("b.md", 10),
        makeSkillFile("c.md", 10),
    ];

    const result = filterScanQueue({ queue, allFiles, maxFileCount: 2, maxFileSize: 1000 });
    assertEquals(result.queue.map((q) => q.path), ["a.md", "b.md"]);
    assertEquals(result.skipped, [{ path: "c.md", reason: "too_many" }]);
});
