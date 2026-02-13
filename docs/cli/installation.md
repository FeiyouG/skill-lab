# CLI Installation

## Run during development

```bash
deno task --cwd packages/cli dev
```

## Build executable

```bash
deno task --cwd packages/cli build
```

## Install command locally

```bash
deno task --cwd packages/cli install
```

After install, verify:

```bash
slab --help
```
