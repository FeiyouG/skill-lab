/**
 * File reference extractor for Python scripts.
 *
 * Detects:
 * - import statements → via: "import"
 * - from...import statements → via: "import"
 * - open() calls with host FS paths → via: "bare-path"
 * - URL string literals (requests.get, urllib, etc.) → via: "url"
 *
 * Uses ast-grep AST traversal.
 */

import { isHostFsPath, isUrl } from "../shared/file-refs.ts";
import type { AnalyzerContext, FileRefDiscovery } from "../../types.ts";
import { PYTHON_NODE } from "./astTypes.ts";

export function extractPythonFileRefs(
    context: AnalyzerContext,
    content: string,
): FileRefDiscovery[] {
    const refs: FileRefDiscovery[] = [];

    const ast = context.astgrepClient.parse("python", content);
    const root = ast.root();

    // ── import_statement (e.g. `import os`, `import os.path`) ───────────────
    const importNodes = root.findAll({ rule: { kind: PYTHON_NODE.IMPORT_STATEMENT } });
    for (const node of importNodes) {
        const nameNode = node.find({ rule: { kind: PYTHON_NODE.DOTTED_NAME } });
        const pkg = nameNode?.text() ?? "";
        if (pkg) {
            refs.push({ path: pkg, line: node.range().start.line + 1, via: "import" });
        }
    }

    // ── import_from_statement (e.g. `from os.path import join`) ─────────────
    const fromImportNodes = root.findAll({ rule: { kind: PYTHON_NODE.IMPORT_FROM_STATEMENT } });
    for (const node of fromImportNodes) {
        const moduleNode = node.field("module_name");
        const pkg = moduleNode?.text() ?? "";
        if (pkg) {
            refs.push({ path: pkg, line: node.range().start.line + 1, via: "import" });
        }
    }

    // ── open("path") ─────────────────────────────────────────────────────────
    const openCallNodes = root.findAll({
        rule: {
            kind: PYTHON_NODE.CALL,
            has: {
                field: "function",
                regex: "^open$",
                stopBy: "neighbor",
            },
        },
    });
    for (const node of openCallNodes) {
        const argsNode = node.field("arguments");
        if (!argsNode) continue;
        // string → string_content (Python string has no string_fragment)
        const strNode = argsNode.find({ rule: { kind: PYTHON_NODE.STRING } });
        const contentNode = strNode?.find({ rule: { kind: PYTHON_NODE.STRING_CONTENT } });
        const path = contentNode?.text() ?? "";
        if (path && isHostFsPath(path)) {
            refs.push({ path, line: node.range().start.line + 1, via: "bare-path" });
        }
    }

    // ── requests.*/urllib.* URL calls ────────────────────────────────────────
    const httpCallNodes = root.findAll({
        rule: {
            kind: PYTHON_NODE.CALL,
            has: {
                field: "function",
                regex: "^(?:requests|urllib)",
                stopBy: "neighbor",
            },
        },
    });
    for (const node of httpCallNodes) {
        const argsNode = node.field("arguments");
        if (!argsNode) continue;
        const strNode = argsNode.find({ rule: { kind: PYTHON_NODE.STRING } });
        const contentNode = strNode?.find({ rule: { kind: PYTHON_NODE.STRING_CONTENT } });
        const url = contentNode?.text() ?? "";
        if (url && isUrl(url)) {
            refs.push({ path: url, line: node.range().start.line + 1, via: "url" });
        }
    }

    return refs;
}
