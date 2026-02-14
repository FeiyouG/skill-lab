# SkillReader Overview

`@FeiyouG/skill-lab` provides readers for skill repositories and a source-aware factory.

## Recommended entrypoint

Use `SkillReaderFactory` to create the correct reader from one input value.

```ts
import { SkillReaderFactory } from "@FeiyouG/skill-lab";

const reader = await SkillReaderFactory.create({
    source: "https://github.com/org/repo",
    subDir: "skills/my-skill",
});
```

## Source types

- Local filesystem (`LocalFsSkillReader`)
- GitHub repositories (`GitHubSkillReader`)
- Local git history when `gitRef` is provided

## Core responsibilities

- List files with normalized metadata.
- Read text and binary file content.
- Locate and validate `SKILL.md`.
- Parse and validate YAML frontmatter (`name`, `description` required).
