# SkillReader API Reference

## Main API

The recommended entrypoint is:

```ts
SkillReaderFactory.create({
  source: string,
  subDir?: string,
  gitRef?: string,
  githubToken?: string,
})
```

This returns a `SkillReader` implementation for local filesystem, GitHub, or local git-ref mode.

## SkillReader methods

- `listFiles(): Promise<SkillFile[]>`
- `readTextFile(path): Promise<string | null>`
- `readFile(path): Promise<ReadableStream<Uint8Array> | null>`
- `readManifest(): Promise<SkillManifest | null>`
- `getSkillMdPath(): Promise<string>`
- `getSkillMdContent(): Promise<string>`
- `getSkillMdFrontmatter(): Promise<SkillFrontmatter>`
- `validate(): Promise<{ ok: boolean; reason?: string }>`
