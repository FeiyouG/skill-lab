# Analyzer Overview

`@FeiyouG/skill-lab-analyzer` evaluates skills for requested capabilities and potential risks.

It provides deterministic static analysis output suitable for local checks,
CI workflows, and policy evaluation.

## What it produces

- `permissions`: normalized capability requests discovered in frontmatter and content
- `risks`: typed risk signals with severity and references
- `score`: aggregate numeric risk score
- `riskLevel`: one of `safe`, `caution`, `attention`, `risky`, `avoid`
- `summary`: short human-readable outcome

## Pipeline

1. Discovery - gather files and parse frontmatter.
2. Permissions - extract permissions and static findings.
3. Risks - map findings to typed risk signals and calculate scoring output.
