export type DecodedCodeBlockPath = {
    parentPath: string;
    startLine: number;
    endLine: number;
};

export function encodeCodeBlockPath(
    parentPath: string,
    startLine: number,
    endLine: number,
): string {
    return `${parentPath}:${startLine}-${endLine}`;
}

export function decodeCodeBlockPath(path: string): DecodedCodeBlockPath | null {
    const match = path.match(/^(.+):(\d+)-(\d+)$/);
    if (!match) return null;

    const startLine = Number(match[2]);
    const endLine = Number(match[3]);
    if (!Number.isFinite(startLine) || !Number.isFinite(endLine)) return null;
    if (startLine <= 0 || endLine < startLine) return null;

    return {
        parentPath: match[1],
        startLine,
        endLine,
    };
}

export function isCodeBlockPath(path: string): boolean {
    return decodeCodeBlockPath(path) !== null;
}
