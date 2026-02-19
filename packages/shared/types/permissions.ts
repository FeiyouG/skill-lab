import { FileRole, Reference } from "./references.ts";

export type PermissionScope = "fs" | "sys" | "net" | "env" | "hooks" | "data" | "dep";

export type Permission = {
    id: string;
    tool: string;
    scope: PermissionScope;
    permission: string;
    args?: string[];
    fileRole?: FileRole;
    metadata?: Record<string, unknown>;
    references: Reference[];
    source: "frontmatter" | "detected" | "inferred";
    comment?: string;
    risks: string[];
};
