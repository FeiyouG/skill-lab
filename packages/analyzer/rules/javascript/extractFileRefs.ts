/**
 * File reference extractor for JavaScript and TypeScript files.
 *
 * Detects:
 * - import/export ... from "specifier" → via: "import"
 * - require("specifier") → via: "import"
 * - URL string literals used in fetch/axios/XMLHttpRequest → via: "url"
 * - Host filesystem paths in fs.readFile / fs.writeFile / open calls → via: "bare-path"
 *
 * Uses ast-grep AST traversal.
 */

import { isHostFsPath, isUrl } from "../shared/file-refs.ts";
import type { AnalyzerContext, FileRefDiscovery } from "../../types.ts";
import { JS_NODE } from "./astTypes.ts";

async function extractJsLikeFileRefs(
    lang: "javascript" | "typescript",
    context: AnalyzerContext,
    content: string,
): Promise<FileRefDiscovery[]> {
    const refs: FileRefDiscovery[] = [];

    const ast = await context.astgrepClient.parse(lang, content);
    const root = ast.root();

    // ── import_statement ────────────────────────────────────────────────────
    const importNodes = root.findAll({ rule: { kind: JS_NODE.IMPORT_STATEMENT } });
    for (const node of importNodes) {
        const sourceNode = node.field("source");
        if (!sourceNode) continue;
        const fragmentNode = sourceNode.find({ rule: { kind: JS_NODE.STRING_FRAGMENT } });
        const specifier = fragmentNode?.text() ?? "";
        if (specifier) {
            refs.push({ path: specifier, line: node.range().start.line + 1, via: "import" });
        }
    }

    // ── export_statement (re-exports only — export ... from "…") ────────────
    const exportNodes = root.findAll({ rule: { kind: JS_NODE.EXPORT_STATEMENT } });
    for (const node of exportNodes) {
        const sourceNode = node.field("source");
        if (!sourceNode) continue; // no `from` clause → local export, skip
        const fragmentNode = sourceNode.find({ rule: { kind: JS_NODE.STRING_FRAGMENT } });
        const specifier = fragmentNode?.text() ?? "";
        if (specifier) {
            refs.push({ path: specifier, line: node.range().start.line + 1, via: "import" });
        }
    }

    // ── require("specifier") ────────────────────────────────────────────────
    const requireNodes = root.findAll({
        rule: {
            kind: JS_NODE.CALL_EXPRESSION,
            has: {
                field: "function",
                regex: "^require$",
                stopBy: "neighbor",
            },
        },
    });
    for (const node of requireNodes) {
        const argsNode = node.field("arguments");
        if (!argsNode) continue;
        const fragmentNode = argsNode.find({ rule: { kind: JS_NODE.STRING_FRAGMENT } });
        const specifier = fragmentNode?.text() ?? "";
        if (specifier) {
            refs.push({ path: specifier, line: node.range().start.line + 1, via: "import" });
        }
    }

    // ── fetch/axios/etc. URL calls ──────────────────────────────────────────
    const urlCallNodes = root.findAll({
        rule: {
            kind: JS_NODE.CALL_EXPRESSION,
            has: {
                field: "function",
                regex:
                    "^(?:fetch|axios\\.(?:get|post|put|delete|patch|head)|XMLHttpRequest|request|got|superagent)$",
                stopBy: "neighbor",
            },
        },
    });
    for (const node of urlCallNodes) {
        const argsNode = node.field("arguments");
        if (!argsNode) continue;
        const fragmentNode = argsNode.find({ rule: { kind: JS_NODE.STRING_FRAGMENT } });
        const url = fragmentNode?.text() ?? "";
        if (url && isUrl(url)) {
            refs.push({ path: url, line: node.range().start.line + 1, via: "url" });
        }
    }

    // ── fs.* calls with host paths ──────────────────────────────────────────
    const fsCallNodes = root.findAll({
        rule: {
            kind: JS_NODE.CALL_EXPRESSION,
            has: {
                field: "function",
                regex:
                    "^fs\\.(?:readFile|writeFile|appendFile|open|access|stat|unlink|mkdir|rmdir|rename|copyFile)$",
                stopBy: "neighbor",
            },
        },
    });
    for (const node of fsCallNodes) {
        const argsNode = node.field("arguments");
        if (!argsNode) continue;
        const fragmentNode = argsNode.find({ rule: { kind: JS_NODE.STRING_FRAGMENT } });
        const path = fragmentNode?.text() ?? "";
        if (path && isHostFsPath(path)) {
            refs.push({ path, line: node.range().start.line + 1, via: "bare-path" });
        }
    }

    return refs;
}

export function extractJsFileRefs(
    context: AnalyzerContext,
    content: string,
): Promise<FileRefDiscovery[]> {
    return extractJsLikeFileRefs("javascript", context, content);
}

export function extractTsFileRefs(
    context: AnalyzerContext,
    content: string,
): Promise<FileRefDiscovery[]> {
    return extractJsLikeFileRefs("typescript", context, content);
}
