# ast-grep Runtime in Compiled CLI

## Problem

`slab` is distributed as compiled binaries. The analyzer uses `@ast-grep/napi`
plus language parser shared objects. In compiled environments (for example
Homebrew installs), parser auto-discovery can fail because parser files are not
in the expected package layout.

The symptom is runtime startup failure from native loading (for example
`GetLibPath ... No such file or directory`).

## Current solution

Skill Lab now uses one declarative registry file:

- `packages/analyzer/astgrep/registry.ts`

The registry defines, per language:

- development registration metadata (`extensions`, symbols, etc.)
- bundled parser output filename (`*-parser.so`)
- tarball URL used to fetch parser prebuilds for release bundles

This registry powers both runtime modes:

1. Development mode
   - `AstGrepClient` builds registrations from npm language packages.
2. Bundled mode (compiled CLI)
   - `AstGrepClient` loads parser paths from bundled resources using
     `SKILL_LAB_AST_GREP_RESOURCES_DIR`.

## Release archive layout

Release archives for macOS/Linux include:

```text
./
├── slab
├── slab-bin
└── resources/
    └── ast-grep/
```

`slab` is the launcher entrypoint. It resolves its install directory, sets
`SKILL_LAB_AST_GREP_RESOURCES_DIR`, and then executes `slab-bin`.

Keep `slab`, `slab-bin`, and `resources/ast-grep` together in the same install
directory.

If macOS Gatekeeper blocks `slab-bin` or bundled parser files (for example
`typescript-parser.so`) from release archives, clear quarantine recursively on
the install directory:

```bash
xattr -dr com.apple.quarantine ~/.local/lib/slab
```

## Build pipeline integration

During release and nightly archive builds, workflow steps call:

```bash
deno run -A scripts/fetch_astgrep_parsers.ts --parser-prebuild <prebuild> --out-dir bundle/resources/ast-grep
```

This script reads the same registry, downloads language tarballs, extracts
`parser.so` for the target prebuild, and writes parser files with the expected
bundle names.

## Trade-offs

- Pros
  - one source of truth for runtime and build metadata
  - removes duplicated curl/cp shell blocks in workflows
  - easier parser version and language updates
- Cons
  - larger release archives due to bundled parser shared objects
  - additional CI step with network dependency for parser fetch

## Future improvements

- Add CI validation to verify every registry tarball URL is reachable.
- Explore ways to bake `@ast-grep/napi` during compilation to produce a single binary
- Add per-platform smoke tests for extracted archives (`./slab --help` and
  `slab analyze` minimal run).
- Add Linux musl targets in the release matrix if Alpine support is required.
- Consider moving parser artifact preparation to a pre-generated cache step to
  reduce repeated downloads across matrix jobs.
