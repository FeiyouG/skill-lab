# Architecture

Skill Lab is a deterministic analysis layer for AI agent skills.

It is designed as infrastructure: inspect skill behavior before enablement, expose
permission intent, and support policy decisions with repeatable output.

## Design goals

- Deterministic results from the same source and configuration
- Clear separation between source reading and risk evaluation
- Structured output that works for both people and automation
- Extensible policy enforcement without changing core analysis semantics

## Package boundaries

- `packages/cli`: user-facing command interface (`slab`)
- `packages/skillreader`: source access and repository normalization
- `packages/analyzer`: deterministic permission and risk analysis pipeline
- `packages/shared`: shared domain models and output types

## Analysis pipeline

`@FeiyouG/skill-lab-analyzer` runs a staged pipeline:

1. Discovery (`001`) - collect files, normalize structure, parse frontmatter.
2. Permissions (`002`) - extract declared and inferred capability requests.
3. Risks (`003`) - map findings to typed signals and compute score and `riskLevel`.

## CLI integration

The `slab analyze` command resolves a `SkillReader` implementation from:

- local filesystem
- GitHub repository with optional `--gitRef`

Then it passes that reader into `runAnalysis()` and prints either JSON or a concise summary.

## Why this structure matters

- Source handling stays explicit and auditable.
- Analysis output remains consistent across local and remote inputs.
- Policy checks can be layered on top without duplicating parsing logic.
