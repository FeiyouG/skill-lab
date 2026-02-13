# `slab analyze`

Run local analyzer v2 against a skill from local filesystem, GitHub, or cloud storage.

## Usage

```bash
slab analyze [path]
slab analyze --github <repo-url> --gitRef <ref>
slab analyze --cloud <base-url>
```

## Options

- `--github <url>`: GitHub repository URL
- `--gitRef <sha|branch|tag>`: Git reference for GitHub mode
- `--dir <path>`: subdirectory under the selected source
- `--github-token <token>`: override `GITHUB_TOKEN`
- `--cloud <baseUrl>`: read skill from cloud storage
- `--json`: print full analyzer output as JSON

## Examples

```bash
slab analyze ./path/to/skill
slab analyze --github https://github.com/org/repo --gitRef main --dir skills/my-skill
slab analyze --cloud https://storage.example.com/skills/my-skill
slab analyze ./path/to/skill --json
```
