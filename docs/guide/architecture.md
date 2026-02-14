# Architecture

Skill Lab is split into focused packages with clear boundaries.

## Package boundaries

- `packages/cli`: user-facing commands and output formatting.
- `packages/skillreader`: read and validate skill repositories.
- `packages/analyzer`: scan files, extract permissions/findings, and compute risks.
- `packages/shared`: shared domain and API response types.

## Analysis pipeline

`@FeiyouG/skill-lab-analyzer` runs a three-step pipeline:

1. Discovery (`001`) - collect files and parse frontmatter.
2. Permissions (`002`) - extract allowed and inferred capability requests.
3. Risks (`003`) - map findings to risk signals and compute score/risk level.

## CLI integration

The `slab analyze` command resolves a `SkillReader` implementation from:

- local filesystem,
- GitHub repository + optional ref.

Then it passes that reader into `runAnalysis()` and prints either JSON or a concise summary.
