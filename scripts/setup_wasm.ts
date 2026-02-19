/**
 * setup_wasm.ts
 *
 * Builds @ast-grep/wasm from the ast-grep wasm branch and installs the
 * resulting artifacts into vendor/ast-grep-wasm/ at the repo root.
 *
 * The upstream wasm-pack output is CommonJS. This script additionally writes
 * an ESM entrypoint (`ast_grep_wasm.mjs`) so Deno can import named exports
 * directly from `@ast-grep/wasm` without a project-local shim.
 *
 * Note: the generated CJS wrapper is patched to load
 * `ast_grep_wasm_bg.wasm.bin` (not `.wasm`) so `deno compile --include`
 * can embed vendor assets without treating the file as a Wasm module.
 *
 * Source: https://github.com/ast-grep/ast-grep/pull/2484
 * Pinned commit: 3392cb5b0b53887db618866d95a41893c1575cb6
 *
 * Prerequisites:
 *   - Rust (stable) with wasm32-unknown-unknown target
 *   - wasm-pack (https://rustwasm.github.io/wasm-pack/)
 *
 * Usage:
 *   deno run -A scripts/setup_wasm.ts
 *   # or via task:
 *   deno task setup
 */

import { join } from "jsr:@std/path@^1.0.0";

const REPO_URL = "https://github.com/ast-grep/ast-grep";
// Pinned to the wasm branch commit from PR #2484:
// https://github.com/ast-grep/ast-grep/pull/2484
const PINNED_COMMIT = "3392cb5b0b53887db618866d95a41893c1575cb6";
const CRATE_SUBDIR = "crates/wasm";

const SCRIPT_DIR = new URL(".", import.meta.url).pathname;
const REPO_ROOT = join(SCRIPT_DIR, "..");
const VENDOR_DIR = join(REPO_ROOT, "vendor", "ast-grep-wasm");
const TMP_DIR = "/tmp/ast-grep-wasm-build";

async function dirExists(path: string): Promise<boolean> {
    try {
        const stat = await Deno.stat(path);
        return stat.isDirectory;
    } catch {
        return false;
    }
}

async function run(cmd: string[], cwd?: string): Promise<void> {
    console.log(`$ ${cmd.join(" ")}${cwd ? ` (in ${cwd})` : ""}`);
    const proc = new Deno.Command(cmd[0], {
        args: cmd.slice(1),
        cwd,
        stdout: "inherit",
        stderr: "inherit",
    });
    const status = await proc.output();
    if (!status.success) {
        throw new Error(`Command failed with code ${status.code}: ${cmd.join(" ")}`);
    }
}

async function main(): Promise<void> {
    console.log("=== Setting up @ast-grep/wasm vendor artifact ===");
    console.log(`Pinned commit: ${PINNED_COMMIT}`);
    console.log(`PR: https://github.com/ast-grep/ast-grep/pull/2484`);
    console.log(`Output: ${VENDOR_DIR}`);
    console.log("");

    // 1. Clone or update the repo at the pinned commit
    if (await dirExists(TMP_DIR)) {
        console.log("Cleaning existing build directory...");
        await Deno.remove(TMP_DIR, { recursive: true });
    }

    console.log("Cloning ast-grep repository (shallow)...");
    await run(["git", "clone", "--no-checkout", "--filter=blob:none", REPO_URL, TMP_DIR]);
    await run(["git", "checkout", PINNED_COMMIT], TMP_DIR);

    // 2. Build with wasm-pack
    const crateDir = join(TMP_DIR, CRATE_SUBDIR);
    console.log("\nBuilding WASM package (this may take a few minutes)...");
    await run(
        ["wasm-pack", "build", "--target", "nodejs", "--out-dir", "pkg"],
        crateDir,
    );

    // 3. Install artifacts to vendor/
    console.log("\nInstalling artifacts to vendor/ast-grep-wasm/...");
    if (await dirExists(VENDOR_DIR)) {
        await Deno.remove(VENDOR_DIR, { recursive: true });
    }
    await Deno.mkdir(VENDOR_DIR, { recursive: true });

    const pkgDir = join(crateDir, "pkg");
    for (
        const [srcName, dstName] of [
            ["ast_grep_wasm_bg.wasm", "ast_grep_wasm_bg.wasm.bin"],
            ["ast_grep_wasm.js", "ast_grep_wasm.js"],
            ["ast_grep_wasm.d.ts", "ast_grep_wasm.d.ts"],
        ]
    ) {
        const src = join(pkgDir, srcName);
        const dst = join(VENDOR_DIR, dstName);
        try {
            await Deno.copyFile(src, dst);
            console.log(`  Copied ${srcName} -> ${dstName}`);
        } catch {
            if (srcName.endsWith(".d.ts")) {
                // Type declarations are optional
                console.log(`  Skipped ${srcName} (not found — optional)`);
            } else {
                throw new Error(`Required file not found in build output: ${src}`);
            }
        }
    }

    // 4. Create CJS and ESM entrypoints.
    await Deno.copyFile(
        join(VENDOR_DIR, "ast_grep_wasm.js"),
        join(VENDOR_DIR, "ast_grep_wasm.cjs"),
    );

    // Patch CJS loader to read .wasm.bin instead of .wasm so deno compile can
    // include the file as a generic asset.
    const cjsPath = join(VENDOR_DIR, "ast_grep_wasm.cjs");
    const cjsSource = await Deno.readTextFile(cjsPath);
    const patchedCjs = cjsSource.replace(
        "ast_grep_wasm_bg.wasm`",
        "ast_grep_wasm_bg.wasm.bin`",
    );
    await Deno.writeTextFile(cjsPath, patchedCjs);
    console.log("  Wrote ast_grep_wasm.cjs");

    const esmEntrypoint = `import cjsMod from "./ast_grep_wasm.cjs";

export const dumpPattern = cjsMod.dumpPattern;
export const initializeTreeSitter = cjsMod.initializeTreeSitter;
export const kind = cjsMod.kind;
export const parse = cjsMod.parse;
export const pattern = cjsMod.pattern;
export const registerDynamicLanguage = cjsMod.registerDynamicLanguage;

export default cjsMod;
`;
    await Deno.writeTextFile(join(VENDOR_DIR, "ast_grep_wasm.mjs"), esmEntrypoint);
    console.log("  Wrote ast_grep_wasm.mjs");

    // 5. Write a package.json pointing to the ESM wrapper.
    const packageJson = {
        name: "@ast-grep/wasm",
        version: "0.0.0-wasm-branch",
        description: "Built from ast-grep wasm branch (PR #2484, commit " + PINNED_COMMIT + ")",
        type: "module",
        main: "ast_grep_wasm.mjs",
        exports: {
            ".": "./ast_grep_wasm.mjs",
        },
        types: "ast_grep_wasm.d.ts",
    };
    await Deno.writeTextFile(
        join(VENDOR_DIR, "package.json"),
        JSON.stringify(packageJson, null, 4) + "\n",
    );
    console.log("  Wrote package.json");

    console.log("\n=== Setup complete ===");
    console.log(`Vendor artifacts available at: ${VENDOR_DIR}`);
}

main().catch((err) => {
    console.error("Setup failed:", err.message);
    Deno.exit(1);
});
