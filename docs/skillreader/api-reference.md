# SkillReader API Reference

## Main exports

From `packages/skillreader/mod.ts`:

- Abstract `SkillReader`
- `LocalFsSkillReader`
- `GitHubApiSkillReader`, `GitHubRawSkillReader`, `GitHubSkillReader`
- `CloudStorageSkillReader`
- Manifest helpers: `createSkillManifest`, `createZipManifest`, `parseSkillManifest`
- Utility helpers: `parseFrontmatter`, `contentTypeFromPath`, `isProbablyText`

## `SkillReader` base methods

- `listFiles(): Promise<SkillFile[]>`
- `readTextFile(path): Promise<string | null>`
- `readFile(path): Promise<ReadableStream<Uint8Array> | null>`
- `readManifest(): Promise<SkillManifest | null>`
- `getSkillMdPath(): Promise<string>`
- `getSkillMdContent(): Promise<string>`
- `getSkillMdFrontmatter(): Promise<SkillFrontmatter>`
- `validate(): Promise<{ ok: boolean; reason?: string }>`

## Key types

- `SkillFile`
- `SkillManifest` (`SkillFileManifest` or `SkillZipManifest`)
- `SkillFrontmatter`
- `SkillContentType`
