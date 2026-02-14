import { assertEquals, assertRejects } from "jsr:@std/assert@^1.0.0";
import {
    AST_GREP_LANGUAGE_SPECS,
    buildBundledRegistrations,
    buildDevRegistrations,
} from "./registry.ts";

Deno.test("buildDevRegistrations returns all configured grammars", () => {
    const registrations = buildDevRegistrations();
    assertEquals(
        Object.keys(registrations).sort(),
        Object.keys(AST_GREP_LANGUAGE_SPECS).sort(),
    );
});

Deno.test("buildBundledRegistrations builds parser registrations from resource dir", async () => {
    const dir = await Deno.makeTempDir();
    try {
        for (const spec of Object.values(AST_GREP_LANGUAGE_SPECS)) {
            await Deno.writeFile(`${dir}/${spec.parserFileName}`, new Uint8Array([1]));
        }

        const registrations = buildBundledRegistrations(dir);
        assertEquals(
            Object.keys(registrations).sort(),
            Object.keys(AST_GREP_LANGUAGE_SPECS).sort(),
        );
        assertEquals(registrations.bash.libraryPath.endsWith("/bash-parser.so"), true);
    } finally {
        await Deno.remove(dir, { recursive: true });
    }
});

Deno.test("buildBundledRegistrations throws when parser file is missing", async () => {
    const dir = await Deno.makeTempDir();
    try {
        for (const [grammar, spec] of Object.entries(AST_GREP_LANGUAGE_SPECS)) {
            if (grammar === "markdown") continue;
            await Deno.writeFile(`${dir}/${spec.parserFileName}`, new Uint8Array([1]));
        }

        assertRejects(
            () => {
                return Promise.resolve().then(() => {
                    buildBundledRegistrations(dir);
                });
            },
            Error,
            "Missing ast-grep parser",
        );
    } finally {
        await Deno.remove(dir, { recursive: true });
    }
});
