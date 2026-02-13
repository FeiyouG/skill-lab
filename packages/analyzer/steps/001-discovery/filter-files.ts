import type { SkillFile } from "@FeiyouG/skill-lab";
import type { FileReference } from "skill-lab/shared";

export function filterScanQueue(input: {
    queue: FileReference[];
    allFiles: SkillFile[];
    maxFileSize: number;
    maxFileCount: number;
}): { queue: FileReference[]; skipped: Array<{ path: string; reason: string }> } {
    const result: FileReference[] = [];
    const skipped: Array<{ path: string; reason: string }> = [];

    const ordered = [...input.queue].sort((a, b) => {
        const roleRank = (value: FileReference["role"]): number => {
            switch (value) {
                case "entrypoint":
                    return 0;
                case "readme":
                    return 1;
                case "reference":
                    return 2;
                case "license":
                    return 3;
                case "script":
                    return 4;
                case "config":
                    return 5;
                default:
                    return 6;
            }
        };

        const fileTypeRank = (value: FileReference["fileType"]): number => {
            if (value === "markdown" || value === "text") return 0;
            if (
                value === "bash" || value === "javascript" || value === "typescript" ||
                value === "python"
            ) return 1;
            if (value === "json" || value === "yaml") return 2;
            return 3;
        };

        const roleDiff = roleRank(a.role) - roleRank(b.role);
        if (roleDiff !== 0) return roleDiff;
        return fileTypeRank(a.fileType) - fileTypeRank(b.fileType);
    });

    for (const fileRef of ordered) {
        const file = input.allFiles.find((item) => item.path === fileRef.path);

        if (file?.contentType === "binary") {
            skipped.push({ path: fileRef.path, reason: "binary" });
            continue;
        }

        if ((file?.size ?? 0) > input.maxFileSize) {
            skipped.push({ path: fileRef.path, reason: "too_large" });
            continue;
        }

        if (result.length >= input.maxFileCount) {
            skipped.push({ path: fileRef.path, reason: "too_many" });
            continue;
        }

        result.push(fileRef);
    }

    return { queue: result, skipped };
}
