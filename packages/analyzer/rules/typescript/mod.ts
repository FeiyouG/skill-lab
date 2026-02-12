import type { AstGrepRule } from "../../astgrep/client.ts";
import { JAVASCRIPT_RULES } from "../javascript/mod.ts";

export const TYPESCRIPT_RULES: AstGrepRule[] = [...JAVASCRIPT_RULES].map((rule) => ({
    ...rule,
    language: "typescript",
}));
