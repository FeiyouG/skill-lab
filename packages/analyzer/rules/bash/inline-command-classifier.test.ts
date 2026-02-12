import { assertEquals } from "@std/assert";
import { isLikelyInlineBashCommand } from "./inline-command-classifier.ts";

Deno.test("inline classifier: true for specific bash command rules", () => {
    assertEquals(isLikelyInlineBashCommand({ snippet: "git status" }), true);
    assertEquals(isLikelyInlineBashCommand({ snippet: "npm install" }), true);
    assertEquals(isLikelyInlineBashCommand({ snippet: "curl https://example.com" }), true);
});

Deno.test("inline classifier: false for identifiers and labels", () => {
    assertEquals(isLikelyInlineBashCommand({ snippet: "name" }), false);
    assertEquals(isLikelyInlineBashCommand({ snippet: "description" }), false);
    assertEquals(isLikelyInlineBashCommand({ snippet: "markdown" }), false);
    assertEquals(isLikelyInlineBashCommand({ snippet: "Only" }), false);
    assertEquals(isLikelyInlineBashCommand({ snippet: "**Package**" }), false);
});

Deno.test("inline classifier: false for pure path-like snippets", () => {
    assertEquals(isLikelyInlineBashCommand({ snippet: "scripts/" }), false);
    assertEquals(isLikelyInlineBashCommand({ snippet: "references/finance.md" }), false);
    assertEquals(isLikelyInlineBashCommand({ snippet: "assets/logo.png" }), false);
});

Deno.test("inline classifier: context can allow known command tokens", () => {
    assertEquals(
        isLikelyInlineBashCommand({
            snippet: "deno",
            lineContext: "Run `deno` from terminal",
        }),
        true,
    );
    assertEquals(
        isLikelyInlineBashCommand({
            snippet: "deno",
            lineContext: "The value is `deno` in metadata",
        }),
        false,
    );
});
