import { basename, join } from "jsr:@std/path@^1.1.4";
import {
    AST_GREP_LANGUAGE_SPECS,
    type AstGrepGrammar,
} from "../packages/analyzer/astgrep/registry.ts";

const args = parseArgs(Deno.args);
await Deno.mkdir(args.outDir, { recursive: true });

const tempRoot = await Deno.makeTempDir({ prefix: "astgrep-parsers-" });
try {
    for (const grammar of Object.keys(AST_GREP_LANGUAGE_SPECS) as AstGrepGrammar[]) {
        const spec = AST_GREP_LANGUAGE_SPECS[grammar];
        const tarballFile = join(tempRoot, `${grammar}.tgz`);
        const extractDir = join(tempRoot, grammar);

        await downloadFile(spec.parserTarballUrl, tarballFile);
        await Deno.mkdir(extractDir, { recursive: true });
        await extractTarball(tarballFile, extractDir);

        let parserPath = join(
            extractDir,
            "package",
            "prebuilds",
            args.parserPrebuild,
            "parser.so",
        );
        if (!(await fileExists(parserPath))) {
            await buildParserFromSource(join(extractDir, "package"));
            parserPath = join(extractDir, "package", "parser.so");
        }

        if (!(await fileExists(parserPath))) {
            throw new Error(
                `Parser binary not found for ${grammar}. Expected prebuild ${args.parserPrebuild} or source build output at ${parserPath}.`,
            );
        }

        const destination = join(args.outDir, spec.parserFileName);
        await Deno.copyFile(parserPath, destination);

        console.log(`Fetched ${grammar} parser -> ${destination}`);
    }
} finally {
    await Deno.remove(tempRoot, { recursive: true }).catch(() => {});
}

type ParsedArgs = {
    parserPrebuild: string;
    outDir: string;
};

function parseArgs(input: string[]): ParsedArgs {
    let parserPrebuild: string | undefined;
    let outDir: string | undefined;

    for (let i = 0; i < input.length; i += 1) {
        const arg = input[i];
        if (arg === "--parser-prebuild") {
            parserPrebuild = input[i + 1];
            i += 1;
            continue;
        }
        if (arg === "--out-dir") {
            outDir = input[i + 1];
            i += 1;
            continue;
        }
    }

    if (!parserPrebuild) {
        throw new Error("Missing required flag --parser-prebuild");
    }
    if (!outDir) {
        throw new Error("Missing required flag --out-dir");
    }

    return { parserPrebuild, outDir };
}

async function downloadFile(url: string, destination: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
        throw new Error(`Failed to download ${url}: ${response.status}`);
    }

    const file = await Deno.open(destination, { create: true, write: true, truncate: true });
    await response.body.pipeTo(file.writable);
}

async function extractTarball(tarballFile: string, destination: string): Promise<void> {
    const result = await new Deno.Command("tar", {
        args: ["-xzf", basename(tarballFile), "-C", destination],
        cwd: dirnameSafe(tarballFile),
        stdout: "piped",
        stderr: "piped",
    }).output();

    if (result.code !== 0) {
        const stderr = new TextDecoder().decode(result.stderr);
        throw new Error(`Failed to extract ${tarballFile}: ${stderr}`);
    }
}

async function buildParserFromSource(packageDir: string): Promise<void> {
    const result = await new Deno.Command("npx", {
        args: ["--yes", "tree-sitter-cli@0.25.8", "build", "-o", "parser.so"],
        cwd: packageDir,
        stdout: "piped",
        stderr: "piped",
    }).output();

    if (result.code !== 0) {
        const stderr = new TextDecoder().decode(result.stderr);
        throw new Error(`Failed to build parser from source in ${packageDir}: ${stderr}`);
    }
}

async function fileExists(path: string): Promise<boolean> {
    try {
        const stat = await Deno.stat(path);
        return stat.isFile;
    } catch {
        return false;
    }
}

function dirnameSafe(path: string): string {
    const idx = path.lastIndexOf("/");
    return idx > 0 ? path.slice(0, idx) : ".";
}
