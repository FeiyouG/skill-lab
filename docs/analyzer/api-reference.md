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
  logger?: AnalyzerLogger,
  showProgressBar?: boolean,
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
  logger?: AnalyzerLogger;
  showProgressBar?: boolean;
}): Promise<SkillAnalyzerResult>
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
    scan?: {
        maxFileSize?: number;
        maxFileCount?: number;
        maxScanDepth?: number;
    };
    allowlist?: {
        languages?: Record<string, { imports?: string[] }>;
        network?: { domains?: string[] };
    };
    denylist?: {
        languages?: Record<string, { imports?: string[] }>;
        network?: { domains?: string[] };
    };
    riskReport?: {
        baseScore?: { info?: number; warning?: number; critical?: number };
        uplift?: Record<string, number>;
        thresholds?: {
            safe?: number;
            caution?: number;
            attention?: number;
            risky?: number;
            avoid?: number;
        };
    };
};
```

- `skillId`: optional identifier to attach to output
- `skillVersionId`: optional version identifier to attach to output

### Output

`runAnalysis` returns `SkillAnalyzerResult`, which wraps analyzer state and can be
serialized in multiple formats:

- `toString()`
- `toJson()`
- `toSarif(toolVersion)`

`toString()` renders grouped terminal output, sorting risk groups by highest
severity and using `groupKey` when present.

`SkillAnalyzerResult` includes:

- `permissions: Permission[]`
- `risks: Risk[]`
- `Risk` includes optional `groupKey?: string` for output/scoring grouping
- `score: number`
- `riskLevel: "safe" | "caution" | "attention" | "risky" | "avoid"`
- `summary: string`
- `warnings: string[]`
- `metadata`: scanned/skipped files, rules used, effective config

For the full config schema and merge behavior, see
[Configurations](/guide/configurations).

For the full list of analyzer risk types, see
[Risk Codes](/analyzer/risk-codes).

Other exported helpers include `createInitialState`, `DEFAULT_ANALYZER_CONFIG`,
and `DEFAULT_SKILL_VERSION`.
