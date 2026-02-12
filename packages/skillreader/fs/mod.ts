import { join, relative } from "jsr:@std/path@^1.0.0";
import { contentTypeFromPath, isProbablyText } from "../utils.ts";
import type { SkillFile } from "../types.ts";
import { SkillReader } from "../types.ts";
import { parseSkillManifest } from "../manifest.ts";

export type LocalFsSkillReaderOptions = {
    root: string;
};

export class LocalFsSkillReader extends SkillReader {
    private root: string;

    constructor(options: LocalFsSkillReaderOptions) {
        super();
        this.root = options.root;
    }

    async listFiles(dir?: string): Promise<SkillFile[]> {
        const base = dir ? join(this.root, dir) : this.root;
        const files: SkillFile[] = [];

        for await (const entry of this.walkDir(base)) {
            if (!entry.isFile) continue;
            const relPath = relative(this.root, entry.path);
            files.push({
                path: relPath.replace(/\\/g, "/"),
                size: entry.size,
                contentType: contentTypeFromPath(relPath),
            });
        }

        return files;
    }

    async readTextFile(path: string): Promise<string | null> {
        const fullPath = join(this.root, path);
        const contentType = contentTypeFromPath(path);
        if (contentType === "binary") return null;
        try {
            const data = await Deno.readFile(fullPath);
            if (!isProbablyText(data)) return null;
            return new TextDecoder().decode(data);
        } catch {
            return null;
        }
    }

    async readFile(path: string): Promise<ReadableStream<Uint8Array> | null> {
        const fullPath = join(this.root, path);
        try {
            const file = await Deno.open(fullPath, { read: true });
            return file.readable;
        } catch {
            return null;
        }
    }

    async readManifest() {
        const manifestPath = join(this.root, "manifest.json");
        try {
            const text = await Deno.readTextFile(manifestPath);
            return parseSkillManifest(text);
        } catch {
            return null;
        }
    }

    private async *walkDir(
        dir: string,
    ): AsyncGenerator<{ path: string; size: number; isFile: boolean }> {
        for await (const entry of Deno.readDir(dir)) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory) {
                yield* this.walkDir(fullPath);
            } else if (entry.isFile) {
                const stat = await Deno.stat(fullPath);
                yield { path: fullPath, size: stat.size, isFile: true };
            }
        }
    }
}
