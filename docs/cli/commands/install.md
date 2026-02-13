# `slab install`

Install a skill from the registry to local or global skill directories.

## Usage

```bash
slab install <skill> [--version <version>] [--global] [--yes]
```

## Options

- `-v, --version <version>`: install a specific version
- `-g, --global`: install under `~/.config/opencode/skills/`
- `-y, --yes`: skip confirmation for non-completed analysis status

## Examples

```bash
slab install git-release
slab install git-release --version 1.0.0
slab install git-release --global
```
