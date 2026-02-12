import { Readable as NodeReadable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { createInflateRaw } from "node:zlib";

export async function fetchContentLength(url: string): Promise<number> {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) {
        throw new Error(`HEAD ${url} failed: ${res.status} ${res.statusText}`);
    }
    const len = res.headers.get("content-length");
    if (!len) throw new Error("No content-length header");
    const size = Number.parseInt(len, 10);
    if (Number.isNaN(size)) throw new Error(`Invalid content-length: ${len}`);
    return size;
}

export async function fetchRangeStream(
    url: string,
    start: number,
    length: number,
): Promise<ReadableStream<Uint8Array>> {
    const end = start + length - 1;
    const range = `bytes=${start}-${end}`;
    const res = await fetch(url, { headers: { Range: range } });
    if (!res.ok || !res.body) {
        throw new Error(`Range read failed: ${res.status} ${res.statusText}`);
    }
    return res.body;
}

export function decompressDeflateStream(
    stream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
    const nodeStream = NodeReadable.fromWeb(stream as unknown as NodeReadableStream);
    const inflater = createInflateRaw();
    const decompressed = nodeStream.pipe(inflater);
    return NodeReadable.toWeb(decompressed) as ReadableStream<Uint8Array>;
}
