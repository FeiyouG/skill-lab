# Analyzer Quickstart

## Run from code

```ts
import { LocalFsSkillReader } from "@FeiyouG/skill-lab";
import { runAnalysis } from "@FeiyouG/skill-lab-analyzer";
import { AstGrepClient } from "../../packages/analyzer/astgrep/client.ts";
import { TreesitterClient } from "../../packages/analyzer/treesiter/client.ts";

const result = await runAnalysis({
    options: {
        root: "./my-skill", // or a github link
        // subDir: "optoinal subdirectory",
        // gitRef: "Optional git commit sha/tag/branch"
    },
});

console.log(result.riskLevel, result.score, result.summary);
```

This is equivalent of running the following from CLI:

```bash
slab analyze ./my-skill --json
```

## Typical checks

- Ensure `SKILL.md` exists and has valid frontmatter.
- Review `permissions` for scope and necessity.
- Review `risks` with `critical`/`warning` severity first.
