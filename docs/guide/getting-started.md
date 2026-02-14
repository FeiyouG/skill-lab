# Getting Started

This guide shows the shortest path to analyze a skill with Skill Lab.

## 1) Install the CLI

Follow [CLI Installation](/cli/installation).

## 2) Analyze a local skill

```bash
slab analyze ./path/to/skill
```

The target directory should contain `SKILL.md` at its root.

## 3) Analyze a GitHub skill

```bash
slab analyze https://github.com/org/repo
```

For repositories with multiple skills, scope to one skill directory:

```bash
slab analyze https://github.com/org/repo --subDir skills/my-skill
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

## Next steps

- [Architecture](/guide/architecture)
- [CLI Overview](/cli/overview)
- [Analyzer Quickstart](/analyzer/quickstart)
