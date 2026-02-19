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
- `--json`: print full analyzer output as JSON (also implies `--warn`)
- `--sarif`: print results as SARIF 2.1.0 (also implies `--warn`)

### Logging

- `--verbose`: enable debug logging
- `--warn`: only warnings and errors
- `--silence`: disable all logs

If multiple logging flags are set, precedence is `--silence` > `--warn` > `--verbose`.

## SARIF output

[SARIF](https://sarifweb.azurewebsites.net/) (Static Analysis Results Interchange Format) is a standard JSON schema for static analysis tools. GitHub Code Scanning accepts SARIF files to surface findings directly in pull requests and the Security tab — making `--sarif` the right choice for CI workflows.

Pipe the output to a file:

```bash
slab analyze ./path/to/skill --sarif > results.sarif
```

To upload to GitHub Code Scanning:

```bash
slab analyze ./path/to/skill --sarif > results.sarif

# upload via the GitHub CLI:
gh api repos/<owner>/<repo>/code-scanning/sarifs \
  --method POST \
  -f commit_sha=$(git rev-parse HEAD) \
  -f ref=$(git symbolic-ref HEAD) \
  -f sarif=$(gzip -c results.sarif | base64)

# upload via Github Action:
- name: Upload SARIF file
  uses: github/codeql-action/upload-sarif@v3
  with:
    # Path to the SARIF file relative to the repository root
    sarif_file: result.sarif
    # Optional: Assign a category to distinguish results from different runs or tools
    category: skill-lab

```

## Examples

```bash
slab analyze ./path/to/skill
slab analyze https://github.com/org/repo
slab analyze https://github.com/org/repo --subDir skills/my-skill
slab analyze /path/to/repo --gitRef main --subDir skills/my-skill
slab analyze ./path/to/skill --json
slab analyze ./path/to/skill --verbose
slab analyze ./path/to/skill --warn
slab analyze ./path/to/skill --silence --json
slab analyze ./path/to/skill --sarif > results.sarif
```

## Notes

- To use `--gitRef` on a local path, the path must be the git repository root.
- Use `--subDir` to point to the skill root directory where `SKILL.md` exists.
