# Configuration

## Grammar cache

Skill Lab downloads tree-sitter grammar `.wasm` files on first use and caches them
locally. The cache location follows the [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/latest/).

### Cache directory resolution

The cache directory is resolved in this priority order:

1. **`$SKILL_LAB_CACHE_DIR`** — explicit override; use any path you like.

2. **`$XDG_CACHE_HOME/skill-lab`** — if `$XDG_CACHE_HOME` is set.

3. **Platform default:**
   - Linux / macOS: `~/.cache/skill-lab`
   - Windows: `%LOCALAPPDATA%\skill-lab\Cache`

Grammar files are stored under `<cache-dir>/grammars/`, for example:

```
~/.cache/skill-lab/grammars/tree-sitter-bash.wasm
~/.cache/skill-lab/grammars/tree-sitter-typescript.wasm
```

### Environment variables

| Variable              | Description                                                                             |
| --------------------- | --------------------------------------------------------------------------------------- |
| `SKILL_LAB_CACHE_DIR` | Override the cache directory entirely. Takes precedence over XDG and platform defaults. |
| `XDG_CACHE_HOME`      | Standard XDG cache base directory. If set, Skill Lab uses `$XDG_CACHE_HOME/skill-lab`.  |

### Example: custom cache location

```bash
export SKILL_LAB_CACHE_DIR=/mnt/fast-disk/skill-lab-cache
slab analyze .
```

### Clearing the cache

To force a re-download of all grammar files, delete the `grammars/` subdirectory:

```bash
rm -rf ~/.cache/skill-lab/grammars
```

The next `slab` invocation will re-download all required grammars.
