import { assertEquals } from "@std/assert";
import { AstGrepClient } from "../../astgrep/client.ts";
import type { AnalyzerContext } from "../../types.ts";
import { isLikelyInlineBashCommand } from "./inline-command-classifier.ts";

const context = {
    astgrepClient: new AstGrepClient(),
} as AnalyzerContext;

Deno.test("inline classifier: true for specific bash command rules", () => {
    assertEquals(isLikelyInlineBashCommand(context, { snippet: "git status" }), true);
    assertEquals(isLikelyInlineBashCommand(context, { snippet: "npm install" }), true);
    assertEquals(isLikelyInlineBashCommand(context, { snippet: "curl https://example.com" }), true);
});

Deno.test("inline classifier: false for identifiers and labels", () => {
    assertEquals(isLikelyInlineBashCommand(context, { snippet: "name" }), false);
    assertEquals(isLikelyInlineBashCommand(context, { snippet: "description" }), false);
    assertEquals(isLikelyInlineBashCommand(context, { snippet: "markdown" }), false);
    assertEquals(isLikelyInlineBashCommand(context, { snippet: "Only" }), false);
    assertEquals(isLikelyInlineBashCommand(context, { snippet: "**Package**" }), false);
});

Deno.test("inline classifier: false for pure path-like snippets", () => {
    assertEquals(isLikelyInlineBashCommand(context, { snippet: "scripts/" }), false);
    assertEquals(isLikelyInlineBashCommand(context, { snippet: "references/finance.md" }), false);
    assertEquals(isLikelyInlineBashCommand(context, { snippet: "assets/logo.png" }), false);
});

Deno.test("inline classifier: context can allow known command tokens", () => {
    assertEquals(
        isLikelyInlineBashCommand(context, {
            snippet: "deno",
            lineContext: "Run `deno` from terminal",
        }),
        true,
    );
    assertEquals(
        isLikelyInlineBashCommand(context, {
            snippet: "deno",
            lineContext: "The value is `deno` in metadata",
        }),
        false,
    );
});
