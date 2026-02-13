# skill-lab

A focused Deno workspace for the SkillReader library, analyzer library, and `slab` CLI executable.

## Workspace

- `packages/skillreader` - `@FeiyouG/skill-lab`
- `packages/analyzer` - `@FeiyouG/skill-lab-analyzer`
- `packages/shared` - `@FeiyouG/skill-lab-shared`
- `packages/cli` - `@FeiyouG/skill-lab-cli`

## Development

No install step is required. Deno fetches dependencies automatically.

```bash
deno task check
deno task test
deno task build
```

## Docs

The documentation site lives in `docs/` and is built with VitePress via Deno tasks.
No `npm` commands are required.

```bash
deno task docs:dev
deno task docs:build
```

## CLI

The executable name is controlled by `CLI_NAME` in `packages/cli/src/main.ts`.
Current command name: `slab`.
