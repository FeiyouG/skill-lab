# Contributing

Thanks for your interest in contributing to Skill Lab.

By submitting a pull request or contribution to this repository,
you agree to the Contributor License Agreement
(CLA) below. If you do not agree, please do not submit a contribution.

## How to contribute

- Open an issue to discuss significant changes before starting work.
- Keep changes focused and include tests when relevant.
- Follow existing code style and project conventions.

## Local development

### Prerequisites

- [Deno](https://deno.land) v2.x
- [Rust](https://rustup.rs) (stable toolchain)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)

Install wasm-pack:

```bash
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
rustup target add wasm32-unknown-unknown
```

### Setup

Before running checks, tests, or builds, run the setup step to build the vendored
`@ast-grep/wasm` artifact:

```bash
deno task setup
```

This clones the ast-grep [wasm branch (PR #2484)](https://github.com/ast-grep/ast-grep/pull/2484)
at a pinned commit, builds it with `wasm-pack`, and installs the output to `vendor/ast-grep-wasm/`.
The `vendor/` directory is gitignored and must be regenerated in each fresh checkout.

See `docs/development/wasm-build.md` for full details on the build process and version pinning.

### Run core checks

```bash
deno task check
deno task test
deno task build
```

### Build and run the CLI locally

```bash
deno task cli:build
deno task cli:dev
```

### Build npm output locally

```bash
deno task npm:build
```

## WASM grammar registry

The compiled CLI downloads tree-sitter grammar `.wasm` files on first use and caches
them in the XDG cache directory (see `docs/cli/configuration.md`).

Grammar download URLs and filenames are defined in
`packages/analyzer/treesitter/registry.ts`. This file is the single source of truth for:

- grammar `.wasm` download URLs (exact version-pinned)
- language-to-grammar mapping for both `AstGrepClient` and `TreesitterClient`
- XDG cache directory resolution logic (`getCacheDir()`)

When updating grammar versions:

1. Update the `GRAMMAR_SPECS` entries in `packages/analyzer/treesitter/registry.ts`.
2. Verify `web-tree-sitter` ABI compatibility (see `docs/development/wasm-build.md`).
3. Run analyzer checks/tests:

   ```bash
   deno task analyzer:check
   deno task analyzer:test
   ```

## Docs development

Run docs locally:

```bash
deno task docs:dev
```

Build static docs output:

```bash
deno task docs:build
```

## Contributor License Agreement (CLA)

You and the Licensor agree to the following terms for your contributions.

1. Definitions
   "You" means the person or entity submitting a contribution.
   "Contribution" means any work you submit to the project, including code,
   documentation, or other materials, whether original or modified.
   "Licensor" means the project owner(s) who manage this repository.

2. Grant of Copyright License
   You grant the Licensor a perpetual, worldwide, non-exclusive, no-charge,
   royalty-free, irrevocable license to use, reproduce, prepare derivative
   works of, publicly display, publicly perform, sublicense, and distribute
   your Contributions and derivative works of your Contributions.

3. Grant of Patent License
   You grant the Licensor a perpetual, worldwide, non-exclusive, no-charge,
   royalty-free, irrevocable patent license to make, have made, use, offer to
   sell, sell, import, and otherwise transfer your Contributions, where such
   license applies only to patent claims licensable by you that are necessarily
   infringed by your Contributions alone or by combination of your
   Contributions with the project.

4. Representations
   You represent that:
   (a) You have the right to submit the Contributions and grant these licenses.
   (b) The Contributions are your original work or you have sufficient rights
   to submit them under these terms.
   (c) You are not aware of any claims or obligations that would prevent the
   Licensor from using your Contributions under the terms above.

5. No Other Rights
   Except for the licenses granted above, you retain all right, title, and
   interest in your Contributions.

6. No Warranty
   Your Contributions are provided "AS IS" without warranties of any kind.
