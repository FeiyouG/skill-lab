import { contentTypeFromPath, isProbablyText } from "../utils.ts";
import type { SkillFile, SkillManifest, SkillZipManifest, ZipManifestFile } from "../types.ts";
import { SkillReader } from "../types.ts";
import { isZipManifest, parseSkillManifest } from "../manifest.ts";
import { decompressDeflateStream, fetchRangeStream } from "../utils/http-range.ts";

/**
 * ZIP local file header signature (magic number: 0x04034b50).
 */
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;

/**
 * ZIP local file header fixed section length in bytes.
 */
const LOCAL_FILE_HEADER_LENGTH = 30;

export type CloudStorageSkillReaderOptions = {
    /**
     * Base URL for skill storage (CloudFront/CDN).
     * Example: https://d1234abcd.cloudfront.net/skills/my-skill/v1.0.0
     */
    baseUrl: string;
};

/**
 * Reader for skill-lab backend cloud storage (public CDN).
 */
export class CloudStorageSkillReader extends SkillReader {
    private baseUrl: string;
    private cachedManifest: SkillManifest | null = null;
    private dataOffsetCache = new Map<string, number>();

    constructor(options: CloudStorageSkillReaderOptions) {
        super();
        this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    }

    async listFiles(dir?: string): Promise<SkillFile[]> {
        const manifest = await this.readManifest();
        if (!manifest) {
            throw new Error("Manifest not found at storage URL");
        }

        const targetPrefix = dir ? normalizePrefix(dir) : "";

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
        if (!manifest) return null;

        if (isZipManifest(manifest)) {
            return await this.readFileFromZip(path, manifest);
        }

        const fileUrl = `${this.baseUrl}/${path.replace(/^\/+/, "")}`;
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) return null;
            return response.body;
        } catch {
            return null;
        }
    }

    async readManifest(): Promise<SkillManifest | null> {
        if (this.cachedManifest) return this.cachedManifest;

        const manifestUrl = `${this.baseUrl}/manifest.json`;
        try {
            const response = await fetch(manifestUrl);
            if (!response.ok) return null;

            const text = await response.text();
            const manifest = parseSkillManifest(text);
            this.cachedManifest = manifest;
            return manifest;
        } catch {
            return null;
        }
    }

    private async readFileFromZip(
        path: string,
        manifest: SkillZipManifest,
    ): Promise<ReadableStream<Uint8Array> | null> {
        const normalizedPath = path.replace(/^\/+/, "");
        const fileEntry = manifest.files.find((file) => file.path === normalizedPath);
        if (!fileEntry) return null;

        const zipUrl = `${this.baseUrl}/skill.zip`;
        const dataOffset = await this.getDataOffset(zipUrl, fileEntry);
        const rangeStream = await fetchRangeStream(zipUrl, dataOffset, fileEntry.compressedSize);

        if (fileEntry.compressionMethod === 0) {
            return rangeStream;
        }
        if (fileEntry.compressionMethod === 8) {
            return decompressDeflateStream(rangeStream);
        }

        throw new Error(`Unsupported compression: ${fileEntry.compressionMethod}`);
    }

    private async getDataOffset(
        zipUrl: string,
        fileEntry: Pick<ZipManifestFile, "path" | "offset">,
    ): Promise<number> {
        const cached = this.dataOffsetCache.get(fileEntry.path);
        if (cached !== undefined) return cached;

        const headerStream = await fetchRangeStream(
            zipUrl,
            fileEntry.offset,
            LOCAL_FILE_HEADER_LENGTH,
        );
        const headerBuffer = new Uint8Array(await new Response(headerStream).arrayBuffer());

        if (headerBuffer.byteLength < LOCAL_FILE_HEADER_LENGTH) {
            throw new Error("Failed to read ZIP header");
        }

        const view = new DataView(
            headerBuffer.buffer,
            headerBuffer.byteOffset,
            headerBuffer.byteLength,
        );

        const signature = view.getUint32(0, true);
        if (signature !== LOCAL_FILE_HEADER_SIGNATURE) {
            throw new Error(`Invalid ZIP signature at offset ${fileEntry.offset}`);
        }

        const fileNameLength = view.getUint16(26, true);
        const extraFieldLength = view.getUint16(28, true);
        const dataOffset = fileEntry.offset + LOCAL_FILE_HEADER_LENGTH +
            fileNameLength + extraFieldLength;

        this.dataOffsetCache.set(fileEntry.path, dataOffset);
        return dataOffset;
    }
}

function normalizePrefix(prefix: string): string {
    return prefix.replace(/^\/+|\/+$/g, "");
}
