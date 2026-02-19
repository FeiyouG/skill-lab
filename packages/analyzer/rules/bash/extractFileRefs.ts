/**
 * File reference extractor for Bash/shell scripts.
 *
 * Detects:
 * - External URLs referenced via curl/wget → via: "url"
 * - Local file includes via source/. → via: "source"
 * - Host filesystem paths in command arguments → via: "bare-path"
 *
 * Uses ast-grep AST traversal on `command` nodes.
 */

import { isHostFsPath, isUrl, looksLikePath } from "../shared/file-refs.ts";
import type { AnalyzerContext, FileRefDiscovery } from "../../types.ts";
import { BASH_NODE } from "./astTypes.ts";

export async function extractBashFileRefs(
    context: AnalyzerContext,
    content: string,
): Promise<FileRefDiscovery[]> {
    const refs: FileRefDiscovery[] = [];

    const ast = await context.astgrepClient.parse("bash", content);
    const root = ast.root();

    const commandNodes = root.findAll({ rule: { kind: BASH_NODE.COMMAND } });

    for (const node of commandNodes) {
        const line = node.range().start.line + 1;

        const nameNode = node.field("name");
        const commandName = nameNode?.text() ?? "";

        // ── source / . includes ──────────────────────────────────────────────
        if (commandName === "source" || commandName === ".") {
            const argNode = node.field("argument");
            const path = argNode?.text() ?? "";
            if (path && looksLikePath(path)) {
                refs.push({ path, line, via: "source" });
            }
            continue;
        }

        // ── curl / wget URLs ─────────────────────────────────────────────────
        if (commandName === "curl" || commandName === "wget") {
            // All word children — find URL args
            const wordNodes = node.findAll({ rule: { kind: BASH_NODE.WORD } });
            for (const word of wordNodes) {
                const text = word.text();
                if (isUrl(text)) {
                    refs.push({ path: text, line, via: "url" });
                }
            }
            continue;
        }

        // ── file operation commands ──────────────────────────────────────────
        const FILE_CMDS = new Set([
            "cat",
            "cp",
            "mv",
            "ln",
            "touch",
            "mkdir",
            "rm",
            "chmod",
            "chown",
            "open",
            "exec",
            "read",
        ]);

        if (FILE_CMDS.has(commandName)) {
            const wordNodes = node.findAll({ rule: { kind: BASH_NODE.WORD } });
            for (const word of wordNodes) {
                const text = word.text();
                // Skip flags and the command name itself
                if (text === commandName || text.startsWith("-")) continue;
                if (isHostFsPath(text)) {
                    refs.push({ path: text, line, via: "bare-path" });
                }
            }
            continue;
        }

        // ── command itself is a script path (e.g. `scripts/run.py`) ─────────
        if (looksLikePath(commandName) && !isUrl(commandName)) {
            refs.push({ path: commandName, line, via: "bare-path" });
        }

        // ── default: check first argument for path-like value ────────────────
        const argNode = node.field("argument");
        if (argNode) {
            const text = argNode.text();
            if (looksLikePath(text) && !isUrl(text)) {
                refs.push({ path: text, line, via: "bare-path" });
            }
        }
    }

    return refs;
}
