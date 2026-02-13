# SkillReader Overview

`@FeiyouG/skill-lab` provides typed readers for skill repositories.

## Supported sources

- Local filesystem (`LocalFsSkillReader`)
- GitHub API and raw endpoints (`GitHubApiSkillReader`, `GitHubRawSkillReader`, `GitHubSkillReader`)
- Cloud storage (`CloudStorageSkillReader`)

## Core responsibilities

- List files with normalized metadata.
- Read text and binary file content.
- Locate and validate `SKILL.md`.
- Parse and validate YAML frontmatter (`name`, `description` required).
