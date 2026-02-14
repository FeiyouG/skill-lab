import { build, emptyDir } from "jsr:@deno/dnt@^0.42.0";
import { dirname, fromFileUrl, join } from "jsr:@std/path@^1.0.0";

const ROOT_DIR = join(dirname(fromFileUrl(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT_DIR, "npm");
const versionArg = Deno.args[0] ?? "0.1.0";
const version = normalizeVersion(versionArg);

await emptyDir(OUTPUT_DIR);

await build({
    entryPoints: [join(ROOT_DIR, "packages/skillreader/mod.ts")],
    outDir: OUTPUT_DIR,
    importMap: join(ROOT_DIR, "scripts/npm.import_map.json"),
    test: false,
    shims: {
        deno: true,
    },
    package: {
        name: "@FeiyouG/skill-lab",
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

function normalizeVersion(input: string): string {
    const cleaned = input.trim().replace(/^v/, "");
    const valid = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(cleaned);
    if (!valid) {
        throw new Error(`Invalid npm version: ${input}`);
    }
    return cleaned;
}
