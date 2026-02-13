# Analyzer Overview

`@FeiyouG/skill-lab-analyzer` evaluates skills for requested capabilities and potential risks.

## What it produces

- `permissions`: normalized capability requests discovered in frontmatter and content
- `risks`: typed risk signals with severity and references
- `score`: aggregate numeric risk score
- `riskLevel`: one of `safe`, `caution`, `attention`, `risky`, `avoid`
- `summary`: short human-readable outcome

## Pipeline

1. Discovery - gather files and parse frontmatter.
2. Permissions - extract permissions and static findings.
3. Risks - map findings to risk signals and calculate scoring output.
