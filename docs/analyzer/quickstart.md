# Analyzer Quickstart

## Run from code

```ts
import { Analyzer } from "@FeiyouG/skill-lab";

const analyzer = new Analyzer();
const result = await analyzer.analyze({
    source: "./my-skill",
});

console.log(result.riskLevel, result.score, result.summary);
```

This is equivalent to the following CLI command:

```bash
slab analyze ./my-skill --json
```

## Typical checks

- Ensure `SKILL.md` exists and has valid frontmatter.
- Review `permissions` for scope and necessity.
- Review `risks` with `critical` severity first, then `warning`.
