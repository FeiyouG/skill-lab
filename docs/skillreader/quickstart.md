# SkillReader Quickstart

## Local filesystem

```ts
import { LocalFsSkillReader } from "@FeiyouG/skill-lab";

const reader = new LocalFsSkillReader({ root: "./my-skill" });
const validation = await reader.validate();

if (!validation.ok) {
    throw new Error(validation.reason);
}

const files = await reader.listFiles();
const frontmatter = await reader.getSkillMdFrontmatter();
```

## GitHub source

```ts
import { GitHubSkillReader } from "@FeiyouG/skill-lab";

const reader = new GitHubSkillReader({
    repoUrl: "https://github.com/org/repo",
    gitRef: "main",
    dir: "skills/example",
    token: Deno.env.get("GITHUB_TOKEN"),
});
```
