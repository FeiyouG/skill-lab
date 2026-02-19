# Getting Started

This guide shows the shortest path to analyze a skill with Skill Lab.

## 1) Install the CLI

Follow [CLI Installation](/cli/installation).

## 2) Analyze a local skill

```bash
slab analyze ./path/to/skill
```

The target directory should contain `SKILL.md` at its root.

## 3) Analyze a skill hosted on Github

```bash
slab analyze https://github.com/username/repo
```

For repositories with multiple skills, scope to one skill directory:

```bash
slab analyze https://github.com/username/repo --subDir skills/my-skill
```

## 4) Read the result

Skill Lab reports a deterministic analysis result with:

- `permissions`: requested and inferred capabilities
- `risks`: typed risk signals with severity
- `score` and `riskLevel`: aggregate risk output
- `summary`: compact, human-readable assessment

Use JSON output when integrating with tooling:

```bash
slab analyze ./path/to/skill --json
```


Use sarif output when integrating with Github security scan:

```bash
slab analyze ./path/to/skill --sarif
```

## Next steps

- [CLI Overview](/cli/overview)
- [API Overview](/analyzer/quickstart)
