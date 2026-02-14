# Skill Lab

Skill Lab is a toolkit for deterministic analysis of AI agent skills.

It helps teams inspect skill behavior before enablement by producing structured
permission and risk output.

## Install the CLI (`slab`)

#### Homebrew

```bash
brew tap feiyoug/tap/slab
```

or

```bash
brew tap feiyoug/tap
brew install slab
```

#### Verify installation:

```bash
slab --help
```

For other install options, please see our [docs](https://skill-lab.pages.dev/cli/installation).

## Install the library

#### npm

```bash
npm install @FeiyouG/skill-lab
```

#### pnpm

```bash
pnpm add @FeiyouG/skill-lab
```

#### Deno

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

## Documentation

- Docs site: `https://skill-lab.pages.dev`

## Repository layout

- `packages/skillreader` - skill repository readers
- `packages/analyzer` - deterministic analysis pipeline
- `packages/shared` - shared domain and API types
- `packages/cli` - `slab` command-line interface

For contributor workflows, see `CONTRIBUTING.md`.
