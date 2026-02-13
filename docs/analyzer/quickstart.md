# Analyzer Quickstart

## Run from code

```ts
import { LocalFsSkillReader } from "@FeiyouG/skill-lab";
import { runAnalysis } from "@FeiyouG/skill-lab-analyzer";

const reader = new LocalFsSkillReader({ root: "./my-skill" });
const result = await runAnalysis({ context: { skillReader: reader } });

console.log(result.riskLevel, result.score, result.summary);
```

## Run from CLI

```bash
slab analyze ./my-skill --json
```

## Typical checks

- Ensure `SKILL.md` exists and has valid frontmatter.
- Review `permissions` for scope and necessity.
- Review `risks` with `critical`/`warning` severity first.
