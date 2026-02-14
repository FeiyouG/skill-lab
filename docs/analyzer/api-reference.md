# Analyzer API Reference

## `Analyzer` (recommended)

```ts
const analyzer = new Analyzer();

await analyzer.analyze({
  source: "./my-skill",
  subDir?: string,
  gitRef?: string,
  githubToken?: string,
  skillId?: string,
  skillVersionId?: string,
  config?: Partial<AnalyzerConfig>,
});
```

`Analyzer` is exported from `@FeiyouG/skill-lab` and is the primary entry point for deterministic analysis.

## `runAnalysis`

```ts
runAnalysis(input: {
  options: SkillReaderFactoryOptions;
  skillId?: string;
  skillVersionId?: string;
  config?: Partial<AnalyzerConfig>;
}): Promise<AnalyzerResult>
```

### Input

```ts
export type SkillReaderFactoryOptions = {
    source: string;
    subDir?: string;
    gitRef?: string;
    githubToken?: string;
};

export type AnalyzerConfig = {
    maxFileSize: number;
    maxFileCount: number;
    maxScanDepth: number;
};
```

- `skillId`: optional identifier to attach to output
- `skillVersionId`: optional version identifier to attach to output

### Output

- `permissions: Permission[]`
- `risks: Risk[]`
- `score: number`
- `riskLevel: "safe" | "caution" | "attention" | "risky" | "avoid"`
- `summary: string`
- `warnings: string[]`
- `metadata`: scanned/skipped files, rules used, effective config

Other exported helpers include `createInitialState`, `DEFAULT_CONFIG`, and
`DEFAULT_SKILL_VERSION`.
