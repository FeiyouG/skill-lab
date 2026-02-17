import { assertEquals } from "@std/assert";
import { AstGrepClient } from "../../astgrep/client.ts";
import type { AnalyzerContext } from "../../types.ts";
import { isLikelyInlineBashCommand } from "./inline-command-classifier.ts";

const context = {
    astgrepClient: new AstGrepClient(),
} as AnalyzerContext;

Deno.test("inline classifier: true for specific bash command rules", async () => {
    assertEquals(await isLikelyInlineBashCommand(context, { snippet: "git status" }), true);
    assertEquals(await isLikelyInlineBashCommand(context, { snippet: "npm install" }), true);
    assertEquals(
        await isLikelyInlineBashCommand(context, { snippet: "curl https://example.com" }),
        true,
    );
});

Deno.test("inline classifier: false for identifiers and labels", async () => {
    assertEquals(await isLikelyInlineBashCommand(context, { snippet: "name" }), false);
    assertEquals(await isLikelyInlineBashCommand(context, { snippet: "description" }), false);
    assertEquals(await isLikelyInlineBashCommand(context, { snippet: "markdown" }), false);
    assertEquals(await isLikelyInlineBashCommand(context, { snippet: "Only" }), false);
    assertEquals(await isLikelyInlineBashCommand(context, { snippet: "**Package**" }), false);
});

Deno.test("inline classifier: false for pure path-like snippets", async () => {
    assertEquals(await isLikelyInlineBashCommand(context, { snippet: "scripts/" }), false);
    assertEquals(
        await isLikelyInlineBashCommand(context, { snippet: "references/finance.md" }),
        false,
    );
    assertEquals(await isLikelyInlineBashCommand(context, { snippet: "assets/logo.png" }), false);
});

Deno.test("inline classifier: context can allow known command tokens", async () => {
    assertEquals(
        await isLikelyInlineBashCommand(context, {
            snippet: "deno",
            lineContext: "Run `deno` from terminal",
        }),
        true,
    );
    assertEquals(
        await isLikelyInlineBashCommand(context, {
            snippet: "deno",
            lineContext: "The value is `deno` in metadata",
        }),
        false,
    );
});
