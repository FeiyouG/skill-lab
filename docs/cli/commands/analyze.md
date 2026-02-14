# `slab analyze`

Run deterministic analysis on a skill from local filesystem or GitHub.

## Usage

```bash
slab analyze <path-or-github-repo-url>
```

The target is required. The CLI infers source type from the value.

- GitHub URL (`https://github.com/<owner>/<repo>`) -> GitHub source
- Existing local directory -> local filesystem source
- Any other value -> error

## Options

- `--gitRef <sha|branch|tag>`: Git reference for GitHub or local git repositories. If omitted for GitHub, the default branch is used.
- `--subDir <path>`: optional path from repository root to the skill directory that contains `SKILL.md`
- `--githubToken <token>`: GitHub token for GitHub sources. Overrides `GITHUB_TOKEN`; if neither is set, requests are unauthenticated.
- `--json`: print full analyzer output as JSON

## Examples

```bash
slab analyze ./path/to/skill
slab analyze https://github.com/org/repo
slab analyze https://github.com/org/repo --subDir skills/my-skill
slab analyze /path/to/repo --gitRef main --subDir skills/my-skill
slab analyze ./path/to/skill --json
```

## Notes

- To use `--gitRef` on a local path, the path must be the git repository root.
- Use `--subDir` to point to the skill root directory where `SKILL.md` exists.
