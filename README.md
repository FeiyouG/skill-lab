# Skill Lab

Skill Lab is a toolkit for analyzing and understanding AI agent skills.

It helps to inspect skill behavior before enablement by producing deterministic
permission and risk output.

The project is still experimental. Feedback and PRs are welcome.

## What it provides

- Deterministic static analysis for skills from local paths or GitHub.
- Structured `permissions` and `risks` output for review and automation.
- Aggregate `score`, `riskLevel`, and `summary` for fast triage.

📖 [Documentation](https://skill-lab.pages.dev/)

## Install the CLI (`slab`)

### Homebrew

```bash
brew tap feiyoug/tap/slab
```

Or:

```bash
brew tap feiyoug/tap
brew install slab
```

Verify installation:

```bash
slab --help
```

For other install options, see [CLI Installation](https://skill-lab.pages.dev/cli/installation).

## Install the library

### npm

```bash
npm install @FeiyouG/skill-lab
```

### pnpm

```bash
pnpm add @FeiyouG/skill-lab
```

### Deno

```bash
deno add npm:@FeiyouG/skill-lab
```

Use in code:

```ts
import { Analyzer } from "@FeiyouG/skill-lab";
```

## Quick example

```bash
slab analyze ./path/to/skill --json
```

The target directory should contain `SKILL.md` at its root.
