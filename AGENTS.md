# Agent Instructions

## Issue Tracking

This project uses **bd (beads)** for issue tracking.
Run `bd prime` for workflow context, or install hooks (`bd hooks install`) for auto-injection.

Quick reference:

- `bd ready` - Find unblocked work
- `bd create "Title" --type task --priority 2` - Create issue
- `bd close <id>` - Complete issue
- `bd sync` - Sync with git

For full workflow details: `bd prime`

## Workspace Layout

- `packages/skillreader` - SkillReader library
- `packages/analyzer` - Analyzer library
- `packages/shared` - Shared API types and legacy analyzer v1
- `packages/cli` - CLI executable (`slab`)
