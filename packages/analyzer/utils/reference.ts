import type { Reference } from "skill-lab/shared";

export function toReferenceString(reference: Reference): string {
    if (reference.lineEnd && reference.lineEnd !== reference.line) {
        return `${reference.file}:${reference.line}-${reference.lineEnd}`;
    }
    return `${reference.file}:${reference.line}`;
}
