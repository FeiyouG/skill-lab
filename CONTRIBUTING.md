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

Skill Lab uses Deno tasks for local development.

Run core checks:

```bash
deno task check
deno task test
deno task build
```

Build and run the CLI locally:

```bash
deno task cli:build
deno task cli:dev
```

Build npm output locally:

```bash
deno task npm:build
```

## ast-grep runtime and parser bundling

The compiled CLI relies on ast-grep runtime registration data from
`packages/analyzer/astgrep/registry.ts`.

This registry is the single source of truth for:

- development-time ast-grep language registration
- bundled parser filenames used at runtime in compiled artifacts
- parser tarball URLs used by release/nightly build packaging

When updating ast-grep language/parser versions:

1. Update entries in `packages/analyzer/astgrep/registry.ts`.
2. Verify parser fetch script output:

   ```bash
   deno run -A scripts/fetch_astgrep_parsers.ts --parser-prebuild prebuild-macOS-ARM64 --out-dir /tmp/astgrep-parsers
   ```

3. Run analyzer checks/tests:

   ```bash
   deno task analyzer:check
   deno task analyzer:test
   ```

Design notes and trade-offs are documented in `docs/guide/astgrep-runtime.md`.

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
