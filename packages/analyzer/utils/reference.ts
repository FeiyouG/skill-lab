import type { Reference } from "../types.ts";

export function toReferenceString(reference: Reference): string {
    if (reference.lineEnd && reference.lineEnd !== reference.line) {
        return `${reference.file}:${reference.line}-${reference.lineEnd}`;
    }
    return `${reference.file}:${reference.line}`;
}
