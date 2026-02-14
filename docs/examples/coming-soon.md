# Example: Analyze a Skill at a Historical Git Ref

Use this when your repository contains multiple skills and you want to analyze
one skill at a specific branch, tag, or commit.

```bash
slab analyze /path/to/repo \
  --gitRef main \
  --subDir skills/my-skill \
  --json
```

What this does:

- reads files from git ref `main` instead of the working tree
- scopes analysis to `skills/my-skill`
- expects `skills/my-skill/SKILL.md` to exist
- prints full analyzer output as JSON
