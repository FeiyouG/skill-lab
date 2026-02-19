import { build, emptyDir } from "jsr:@deno/dnt@^0.42.0";
import { dirname, fromFileUrl, join } from "jsr:@std/path@^1.0.0";

const ROOT_DIR = join(dirname(fromFileUrl(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT_DIR, "npm");
const VENDOR_SRC_DIR = join(ROOT_DIR, "vendor", "ast-grep-wasm");
const VENDOR_TMP_DIR = join(ROOT_DIR, "packages", ".npm-build-vendor", "ast-grep-wasm");
const VENDOR_SHIM_PATH = join(VENDOR_TMP_DIR, "mod.ts");
const versionArg = Deno.args[0] ?? "0.1.0";
const version = normalizeVersion(versionArg);

await emptyDir(OUTPUT_DIR);
await prepareAstGrepVendor();

try {
    await build({
        entryPoints: [join(ROOT_DIR, "packages/skillreader/mod.ts")],
        outDir: OUTPUT_DIR,
        importMap: join(ROOT_DIR, "scripts/npm.import_map.json"),
        test: false,
        shims: {
            deno: true,
        },
        package: {
            name: "@feiyoug/skill-lab",
            version,
            description: "Skill Lab library exports for analyzer and skill readers",
            license: "MIT",
            repository: {
                type: "git",
                url: "git+https://github.com/FeiyouG/skill-lab.git",
            },
            bugs: {
                url: "https://github.com/FeiyouG/skill-lab/issues",
            },
        },
    });

    await Deno.copyFile(join(ROOT_DIR, "README.md"), join(OUTPUT_DIR, "README.md"));
} finally {
    await Deno.remove(join(ROOT_DIR, "packages", ".npm-build-vendor"), { recursive: true })
        .catch(() => undefined);
}

function normalizeVersion(input: string): string {
    const cleaned = input.trim().replace(/^v/, "");
    const valid = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(cleaned);
    if (!valid) {
        throw new Error(`Invalid npm version: ${input}`);
    }
    return cleaned;
}

async function prepareAstGrepVendor(): Promise<void> {
    await Deno.mkdir(VENDOR_TMP_DIR, { recursive: true });

    let hasFiles = false;
    for await (const entry of Deno.readDir(VENDOR_SRC_DIR)) {
        if (!entry.isFile) continue;
        hasFiles = true;
        await Deno.copyFile(
            join(VENDOR_SRC_DIR, entry.name),
            join(VENDOR_TMP_DIR, entry.name),
        );
    }

    if (!hasFiles) {
        throw new Error("Missing vendor/ast-grep-wasm files. Run `deno task setup` first.");
    }

    await Deno.writeTextFile(
        VENDOR_SHIM_PATH,
        [
            'import cjsMod from "./ast_grep_wasm.cjs";',
            "",
            "export const initializeTreeSitter = cjsMod.initializeTreeSitter;",
            "export const parse = cjsMod.parse;",
            "export const registerDynamicLanguage = cjsMod.registerDynamicLanguage;",
            "export default cjsMod;",
            "",
        ].join("\n"),
    );
}
