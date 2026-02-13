export function isProbablyText(bytes: Uint8Array): boolean {
    const sample = bytes.subarray(0, Math.min(bytes.length, 2048));
    let controlCount = 0;
    for (const byte of sample) {
        if (byte === 0) return false;
        if (byte < 9 || (byte > 13 && byte < 32)) controlCount += 1;
    }
    return controlCount / Math.max(sample.length, 1) < 0.1;
}

export * from "./frontmatter-parser.ts";
export * from "./http-range.ts";
