import type { AstGrepRule } from "../../astgrep/client.ts";
import { DETECT_SECRET_NAME_RISK } from "../shared/secret-evaluators.ts";

export const PYTHON_SECRET_DETECTION_RULES: AstGrepRule[] = [
    {
        id: "secret-python-env-read",
        description: "Detects Python env reads",
        language: "python",
        patterns: ["os.environ[$KEY]", "os.environ.get($KEY)", "os.getenv($KEY)"],
        permission: {
            tool: "env",
            scope: "env",
            permission: "read",
            metadata: { key: "KEY" },
            mappedRisks: [DETECT_SECRET_NAME_RISK],
        },
    },
    {
        id: "secret-python-env-write",
        description: "Detects Python env writes",
        language: "python",
        patterns: ["os.environ[$KEY] = $VALUE"],
        permission: {
            tool: "env",
            scope: "env",
            permission: "write",
            metadata: { key: "KEY" },
        },
    },
];
