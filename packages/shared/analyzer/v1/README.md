# Analyzer v1 (static-v1)

Static security and capability analysis for skill repositories.

## Analysis Pipeline

**Step 0: File Inventory**

- Lists all files
- Parses SKILL.md frontmatter (YAML metadata)

**Step 1: Permission Detection**

- Scans `allowed-tools` field (bash, read, fetch)
- Detects `hooks` field
- Searches content for patterns: `fetch()`, `Bash()`, `process.env`, etc.
- Output: Permissions like `fs:read`, `sys:shell`, `net:fetch`

**Step 2: Risk Detection**
Analyzes code for:

- Prompt manipulation
- Code injection (`eval()`, `$()`)
- Secret exposure (credentials, tokens, API keys)
- Destructive operations (`rm -rf`, formatting)
- Config tampering
- Privilege escalation (sudo, root)
- Persistence (cron, rc files, git hooks)
- Code obfuscation (base64, encoded scripts)
- Data exfiltration (external requests)

Some risks require specific permissions (e.g., secret_access needs `fs:read` or `env:read`).

**Step 3: Risk Scoring**

- Combines severity scores (critical=4, warning=2, info=0)
- Adds permission scores (sudo=3, fs:write=2, fs:read=1)
- Maps to risk level: safe → caution → attention → risky → avoid

## Permission Scopes

- `fs:read`, `fs:write` - File system
- `sys:shell`, `sys:subprocess`, `sys:sudo` - System operations
- `net:fetch`, `net:server` - Network
- `env:read` - Environment variables
- `hooks:run` - Hook execution
- `data:*` - Data operations

## Risk Levels

- **safe** (0): Read-only, no side effects
- **caution** (1): Limited side effects
- **attention** (2): Can modify system
- **risky** (3): Elevated access
- **avoid** (4+): Critical risks

## Storage Agnostic

Works with GitHub, local filesystem, Supabase, or any `SkillReader` implementation.

## Version

`static-v1` - Pattern-based static analysis
