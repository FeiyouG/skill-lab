# SkillReader Quickstart

## Local filesystem

```ts
import { SkillReaderFactory } from "@FeiyouG/skill-lab";

const reader = await SkillReaderFactory.create({ source: "./my-skill" });
const validation = await reader.validate();

if (!validation.ok) {
    throw new Error(validation.reason);
}

const files = await reader.listFiles();
const frontmatter = await reader.getSkillMdFrontmatter();
```

## GitHub source (default branch)

```ts
import { SkillReaderFactory } from "@FeiyouG/skill-lab";

const reader = await SkillReaderFactory.create({
    source: "https://github.com/org/repo",
    subDir: "skills/example",
});
```

## Local git repository at a specific ref

```ts
import { SkillReaderFactory } from "@FeiyouG/skill-lab";

const reader = await SkillReaderFactory.create({
    source: "/path/to/repo-root",
    gitRef: "main",
    subDir: "skills/example",
});
```

For local `gitRef`, `source` must point to the git repository root.
