# Analyzer API Reference

## Exports

From `packages/analyzer/mod.ts`:

- `runAnalysis(input)`
- `createInitialState(input?)`
- `DEFAULT_CONFIG`, `DEFAULT_SKILL_VERSION`, `VERSION`
- types: `AnalyzerConfig`, `AnalyzerResult`, `AnalyzerState`, `Permission`, `Risk`, `Severity`, `Finding`

## `runAnalysis`

```ts
runAnalysis(input: {
  context: AnalyzerContext;
  skillId?: string;
  skillVersionId?: string;
  config?: Partial<AnalyzerConfig>;
}): Promise<AnalyzerResult>
```

### Input

- `context.skillReader`: required `SkillReader` instance
- `skillId`: optional identifier to attach to output
- `skillVersionId`: optional version identifier to attach to output
- `config`: optional limits override (file size/count/depth)

### Output

- `permissions: Permission[]`
- `risks: Risk[]`
- `score: number`
- `riskLevel: "safe" | "caution" | "attention" | "risky" | "avoid"`
- `summary: string`
- `warnings: string[]`
- `metadata`: scanned/skipped files, rules used, effective config

## `createInitialState`

Creates a blank analyzer state with default config merged with optional overrides.
