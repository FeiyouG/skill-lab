import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@^2.39.0";
import { contentTypeFromPath, isProbablyText } from "../utils.ts";
import type { SkillFile, SkillManifest, SkillZipManifest, ZipManifestFile } from "../types.ts";
import { SkillReader } from "../types.ts";
import { createSkillManifest, isZipManifest, parseSkillManifest } from "../manifest.ts";
import { decompressDeflateStream, fetchRangeStream } from "../utils/http-range.ts";

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const LOCAL_FILE_HEADER_LENGTH = 30;

export type SupabaseSkillReaderOptions = {
    supabaseUrl?: string;
    supabaseKey?: string;
    supabaseClient?: SupabaseClient;
    bucket: string;
    prefix: string;
};

export class SupabaseSkillReader extends SkillReader {
    private supabase: SupabaseClient;
    private bucket: string;
    private prefix: string;
    private cachedManifest: SkillManifest | null = null;
    private signedZipUrl: string | null = null;
    private dataOffsetCache = new Map<string, number>();

    constructor(options: SupabaseSkillReaderOptions) {
        super();
        if (!options.supabaseClient) {
            if (!options.supabaseUrl || !options.supabaseKey) {
                throw new Error("Supabase URL and key are required");
            }
            this.supabase = createClient(options.supabaseUrl, options.supabaseKey, {
                auth: { persistSession: false, autoRefreshToken: false },
            });
        } else {
            this.supabase = options.supabaseClient;
        }
        this.bucket = options.bucket;
        this.prefix = normalizePrefix(options.prefix);
    }

    async listFiles(dir?: string): Promise<SkillFile[]> {
        const manifest = await this.readManifest();
        const targetPrefix = dir ? normalizePrefix(dir) : "";
        if (manifest) {
            return manifest.files
                .filter((file) => {
                    if (!targetPrefix) return true;
                    return file.path.startsWith(`${targetPrefix}/`);
                })
                .map((file) => ({
                    path: file.path,
                    size: file.size,
                    contentType: contentTypeFromPath(file.path),
                }));
        }
        const files = await this.listStorage(this.prefix);
        if (!targetPrefix) return files;
        return files.filter((file) => file.path.startsWith(`${targetPrefix}/`));
    }

    async readTextFile(path: string): Promise<string | null> {
        const contentType = contentTypeFromPath(path);
        if (contentType === "binary") return null;
        const stream = await this.readFile(path);
        if (!stream) return null;
        const buffer = new Uint8Array(await new Response(stream).arrayBuffer());
        if (!isProbablyText(buffer)) return null;
        return new TextDecoder().decode(buffer);
    }

    async readFile(path: string): Promise<ReadableStream<Uint8Array> | null> {
        const manifest = await this.readManifest();
        if (manifest && isZipManifest(manifest)) {
            return await this.readFileFromZip(path, manifest);
        }
        const storagePath = this.buildStoragePath(path);
        const { data } = await this.supabase.storage.from(this.bucket).download(storagePath);
        if (!data) return null;
        return data.stream();
    }

    async readManifest(): Promise<SkillManifest | null> {
        if (this.cachedManifest) return this.cachedManifest;
        const manifestPath = this.buildStoragePath("manifest.json");
        const { data } = await this.supabase.storage.from(this.bucket).download(manifestPath);
        if (!data) return null;
        const text = await data.text();
        const manifest = parseSkillManifest(text);
        this.cachedManifest = manifest;
        return manifest;
    }

    async writeManifest(files: SkillFile[]): Promise<void> {
        const manifest = createSkillManifest(files);
        const body = JSON.stringify(manifest, null, 2);
        const manifestPath = this.buildStoragePath("manifest.json");
        await this.supabase.storage.from(this.bucket).upload(manifestPath, body, {
            upsert: true,
            contentType: "application/json",
        });
    }

    private async readFileFromZip(
        path: string,
        manifest: SkillZipManifest,
    ): Promise<ReadableStream<Uint8Array> | null> {
        const normalizedPath = path.replace(/^\/+/, "");
        const fileEntry = manifest.files.find((file) => file.path === normalizedPath);
        if (!fileEntry) return null;

        const signedUrl = await this.getSignedZipUrl();
        const dataOffset = await this.getDataOffset(signedUrl, fileEntry);
        const rangeStream = await fetchRangeStream(signedUrl, dataOffset, fileEntry.compressedSize);

        if (fileEntry.compressionMethod === 0) {
            return rangeStream;
        }
        if (fileEntry.compressionMethod === 8) {
            return decompressDeflateStream(rangeStream);
        }

        throw new Error(`Unsupported compression method: ${fileEntry.compressionMethod}`);
    }

    private async getSignedZipUrl(): Promise<string> {
        if (this.signedZipUrl) return this.signedZipUrl;
        const zipPath = this.buildStoragePath("skill.zip");
        const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .createSignedUrl(zipPath, 60 * 60 * 24);
        if (error || !data?.signedUrl) {
            throw new Error(
                `Failed to create signed URL for skill.zip: ${error?.message ?? "unknown"}`,
            );
        }
        this.signedZipUrl = data.signedUrl;
        return this.signedZipUrl;
    }

    private async getDataOffset(
        signedUrl: string,
        fileEntry: Pick<ZipManifestFile, "path" | "offset">,
    ): Promise<number> {
        const cached = this.dataOffsetCache.get(fileEntry.path);
        if (cached !== undefined) return cached;

        const headerStream = await fetchRangeStream(
            signedUrl,
            fileEntry.offset,
            LOCAL_FILE_HEADER_LENGTH,
        );
        const headerBuffer = new Uint8Array(await new Response(headerStream).arrayBuffer());
        if (headerBuffer.byteLength < LOCAL_FILE_HEADER_LENGTH) {
            throw new Error("Failed to read zip local header");
        }

        const view = new DataView(
            headerBuffer.buffer,
            headerBuffer.byteOffset,
            headerBuffer.byteLength,
        );
        const signature = view.getUint32(0, true);
        if (signature !== LOCAL_FILE_HEADER_SIGNATURE) {
            throw new Error(`Invalid local file header signature at offset ${fileEntry.offset}`);
        }
        const fileNameLength = view.getUint16(26, true);
        const extraFieldLength = view.getUint16(28, true);
        const dataOffset = fileEntry.offset + LOCAL_FILE_HEADER_LENGTH + fileNameLength +
            extraFieldLength;
        this.dataOffsetCache.set(fileEntry.path, dataOffset);
        return dataOffset;
    }

    private buildStoragePath(relativePath: string): string {
        const normalized = relativePath.replace(/^\/+/, "");
        return this.prefix ? `${this.prefix}/${normalized}` : normalized;
    }

    private async listStorage(prefix: string): Promise<SkillFile[]> {
        const files: SkillFile[] = [];
        const items = await this.listDirectory(prefix);

        for (const item of items) {
            const isFolder = !item.id && !item.metadata;
            const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
            if (isFolder) {
                const nested = await this.listStorage(itemPath);
                files.push(...nested);
                continue;
            }
            const relativePath = this.prefix ? itemPath.slice(this.prefix.length + 1) : itemPath;
            files.push({
                path: relativePath,
                size: item.metadata?.size as number | undefined,
                contentType: contentTypeFromPath(relativePath),
            });
        }

        return files;
    }

    private async listDirectory(path: string) {
        const { data, error } = await this.supabase
            .storage
            .from(this.bucket)
            .list(path, { limit: 1000 });
        if (error || !data) {
            throw new Error("Failed to list Supabase storage");
        }
        return data as Array<
            { name: string; id: string | null; metadata?: { size?: number } | null }
        >;
    }
}

function normalizePrefix(prefix: string): string {
    return prefix.replace(/^\/+|\/+$/g, "");
}
