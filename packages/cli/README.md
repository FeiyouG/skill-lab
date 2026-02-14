# slab CLI

`slab` is the Skill Lab command line tool.

## Run

```bash
deno task --cwd packages/cli dev
```

## Build executable

```bash
deno task --cwd packages/cli build
```

## Install command

```bash
deno task --cwd packages/cli install
```

## Common commands

```bash
slab search <query>
slab info <skill>
slab install <skill>
slab list
slab update
slab uninstall <skill>
slab config
slab analyze <path>
```

## Analyze sources

```bash
slab analyze ./path/to/skill
slab analyze https://github.com/org/repo
slab analyze https://github.com/org/repo --subDir skills/my-skill --gitRef main
```

For GitHub URLs, `--githubToken` overrides `GITHUB_TOKEN`. If neither is set,
the CLI uses unauthenticated GitHub requests.
