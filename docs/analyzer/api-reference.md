# Analyzer API Reference

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
