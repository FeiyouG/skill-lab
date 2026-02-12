# Analyzer Rules

This directory stores analyzer detection rules as constants/configuration.

- `network.ts`: network request and egress related patterns
- `filesystem.ts`: file read/write/delete patterns
- `shell.ts`: command execution and sudo patterns
- `secrets.ts`: secret/env access patterns
- `destructive.ts`: destructive system/file operations
- `injection.ts`: command/code injection patterns
- `prompt.ts`: prompt injection regex patterns

Runtime scanning code only references these exported constants.
