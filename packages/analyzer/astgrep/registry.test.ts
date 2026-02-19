import { assertEquals, assertRejects } from "jsr:@std/assert@^1.0.0";
import { ensureGrammar, getCacheDir, GRAMMAR_SPECS } from "../treesitter/registry.ts";

Deno.test("GRAMMAR_SPECS contains expected languages", () => {
    const langs = Object.keys(GRAMMAR_SPECS).sort();
    assertEquals(langs, [
        "bash",
        "javascript",
        "markdown",
        "markdown-inline",
        "python",
        "tsx",
        "typescript",
    ]);
});

Deno.test("GRAMMAR_SPECS each entry has filename and url", () => {
    for (const [lang, spec] of Object.entries(GRAMMAR_SPECS)) {
        assertEquals(typeof spec.filename, "string", `${lang}.filename should be a string`);
        assertEquals(typeof spec.url, "string", `${lang}.url should be a string`);
        assertEquals(
            spec.filename.endsWith(".wasm"),
            true,
            `${lang}.filename should end with .wasm`,
        );
        assertEquals(
            spec.url.startsWith("https://github.com/"),
            true,
            `${lang}.url should be a GitHub URL`,
        );
    }
});

Deno.test("getCacheDir respects SKILL_LAB_CACHE_DIR override", () => {
    const prev = Deno.env.get("SKILL_LAB_CACHE_DIR");
    try {
        Deno.env.set("SKILL_LAB_CACHE_DIR", "/custom/cache");
        assertEquals(getCacheDir(), "/custom/cache");
    } finally {
        if (prev !== undefined) {
            Deno.env.set("SKILL_LAB_CACHE_DIR", prev);
        } else {
            Deno.env.delete("SKILL_LAB_CACHE_DIR");
        }
    }
});

Deno.test("getCacheDir respects XDG_CACHE_HOME", () => {
    const prevSkill = Deno.env.get("SKILL_LAB_CACHE_DIR");
    const prevXdg = Deno.env.get("XDG_CACHE_HOME");
    try {
        Deno.env.delete("SKILL_LAB_CACHE_DIR");
        Deno.env.set("XDG_CACHE_HOME", "/xdg/cache");
        const dir = getCacheDir();
        assertEquals(dir.startsWith("/xdg/cache"), true);
        assertEquals(dir.endsWith("skill-lab"), true);
    } finally {
        if (prevSkill !== undefined) {
            Deno.env.set("SKILL_LAB_CACHE_DIR", prevSkill);
        } else {
            Deno.env.delete("SKILL_LAB_CACHE_DIR");
        }
        if (prevXdg !== undefined) {
            Deno.env.set("XDG_CACHE_HOME", prevXdg);
        } else {
            Deno.env.delete("XDG_CACHE_HOME");
        }
    }
});

Deno.test("ensureGrammar throws for unknown language", async () => {
    await assertRejects(
        () => ensureGrammar("unknown-lang"),
        Error,
        "No grammar spec",
    );
});
