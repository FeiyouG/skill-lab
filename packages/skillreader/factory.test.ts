import { assert, assertEquals, assertRejects } from "jsr:@std/assert@^1.0.0";
import { SkillReaderFactory } from "./factory.ts";

Deno.test("SkillReaderFactory rejects non-GitHub URLs", async () => {
    await assertRejects(
        async () => {
            await SkillReaderFactory.create({ source: "https://example.com/repo" });
        },
        Error,
        "Invalid source",
    );
});

Deno.test("SkillReaderFactory resolves local filesystem source", async () => {
    const dir = await Deno.makeTempDir();
    await Deno.writeTextFile(`${dir}/SKILL.md`, "---\nname: test\ndescription: test\n---\n");

    const reader = await SkillReaderFactory.create({ source: dir });
    const validation = await reader.validate();

    assert(validation.ok);
});

Deno.test("SkillReaderFactory resolves local git source with gitRef and subDir", async () => {
    const repoRoot = await Deno.makeTempDir();
    await runGit(repoRoot, ["init", "-b", "main"]);

    const skillDir = `${repoRoot}/skills/demo`;
    await Deno.mkdir(skillDir, { recursive: true });
    await Deno.writeTextFile(
        `${skillDir}/SKILL.md`,
        "---\nname: demo\ndescription: first\n---\n",
    );
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, [
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.com",
        "commit",
        "-m",
        "first",
    ]);

    const firstRef = (await runGit(repoRoot, ["rev-parse", "HEAD"])).trim();

    await Deno.writeTextFile(
        `${skillDir}/SKILL.md`,
        "---\nname: demo\ndescription: second\n---\n",
    );
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, [
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.com",
        "commit",
        "-m",
        "second",
    ]);

    const reader = await SkillReaderFactory.create({
        source: repoRoot,
        gitRef: firstRef,
        subDir: "skills/demo",
    });

    const content = await reader.getSkillMdContent();
    assert(content.includes("description: first"));
    assertEquals(content.includes("description: second"), false);
});

async function runGit(repoRoot: string, args: string[]): Promise<string> {
    const result = await new Deno.Command("git", {
        args: ["-C", repoRoot, ...args],
        stdout: "piped",
        stderr: "piped",
    }).output();
    if (result.code !== 0) {
        const stderr = new TextDecoder().decode(result.stderr);
        throw new Error(`git command failed: ${stderr}`);
    }
    return new TextDecoder().decode(result.stdout);
}
