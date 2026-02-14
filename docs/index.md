# Skill Lab

Skill Lab is a toolkit for analyzing and understanding AI agent skills.

As agent ecosystems become increasingly composable,
skills can execute commands, access files, and call external services.
Skill Lab provides a deterministic way to inspect and
evaluate those capabilities before enabling them.

It offers the core building blocks for:

- Reading and parsingskill repositories (local or remote)
- Extracting structured metadata
- Identifying permission signals
- Detecting potentially risky patterns
- Enforcing custom policy checks (coming soon)

Skill Lab is designed to make skills easier to inspect, reason about, and trust.

## Components

Skill Lab is organized as a modular workspace:

- `slab` — CLI for analyzing skills
- `@FeiyouG/skill-lab` — permission and risk analysis engine

## Start here

- [Getting Started](/guide/getting-started)
- [CLI Overview](/cli/overview)
- [Library Overview](/analyzer/overview)
