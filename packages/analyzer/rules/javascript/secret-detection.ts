import type { AstGrepRule } from "../../astgrep/client.ts";
import { DETECT_SECRET_NAME_RISK } from "../shared/secret-evaluators.ts";

export const JAVASCRIPT_SECRET_DETECTION_RULES: AstGrepRule[] = [
    {
        id: "secret-js-deno-env-read",
        description: "Detects Deno.env.get access",
        language: "javascript",
        patterns: ["Deno.env.get($KEY)"],
        permission: {
            tool: "env",
            scope: "env",
            permission: "read",
            metadata: { key: "KEY" },
            mappedRisks: [DETECT_SECRET_NAME_RISK],
        },
    },
    {
        id: "secret-js-node-env-read-bracket",
        description: "Detects process.env[key] access",
        language: "javascript",
        patterns: ["process.env[$KEY]"],
        permission: {
            tool: "env",
            scope: "env",
            permission: "read",
            metadata: { key: "KEY" },
            mappedRisks: [DETECT_SECRET_NAME_RISK],
        },
    },
    {
        id: "secret-js-node-env-read-dot",
        description: "Detects process.env.KEY access",
        language: "javascript",
        patterns: ["process.env.$KEY"],
        permission: {
            tool: "env",
            scope: "env",
            permission: "read",
            metadata: { key: "KEY" },
            mappedRisks: [DETECT_SECRET_NAME_RISK],
        },
    },
    {
        id: "secret-js-deno-env-write",
        description: "Detects Deno.env.set access",
        language: "javascript",
        patterns: ["Deno.env.set($KEY, $VALUE)"],
        permission: {
            tool: "env",
            scope: "env",
            permission: "write",
            metadata: { key: "KEY" },
        },
    },
    {
        id: "secret-js-node-env-write",
        description: "Detects process.env assignments",
        language: "javascript",
        patterns: ["process.env.$KEY = $VALUE", "process.env[$KEY] = $VALUE"],
        permission: {
            tool: "env",
            scope: "env",
            permission: "write",
            metadata: { key: "KEY" },
        },
    },
];
