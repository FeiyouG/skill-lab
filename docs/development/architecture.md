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

## Analysis pipeline

`@FeiyouG/skill-lab-analyzer` runs a staged pipeline:

1. **File Discovery**: parse frontmatter and metadata, 
    collect and discovery referenced files,
    and normalize structures.
2. **Permission Detection**: extract declared and inferred capability requests.
3. **Risk Analysis**: map findings to typed signals and compute risk severities 
    and generate summaries.

## Why this structure matters

- Source handling stays explicit and auditable.
- Analysis output remains consistent across local and remote inputs.
- Policy checks can be layered on top without duplicating parsing logic.
