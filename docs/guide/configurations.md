# Configurations

This guide documents the analyzer configuration format used by the CLI and API.

## Analyzer config format

The config is a JSON object with four top-level keys:

```json
{
  "scan": {
    "maxFileSize": 1000000,
    "maxFileCount": 100,
    "maxScanDepth": 5
  },
  "allowlist": {
    "languages": {
      "python": {
        "imports": ["A", "B"],
        ...
      },
      ...
    },
    "network": {
      "domains": ["api.github.com"]
    }
  },
  "denylist": {
    "languages": {
      "javascript": {
        "imports": ["eval"],
        ...
      },
      ...
    },
    "network": {
      "domains": ["bad.com"]
    }
  },
  "riskReport": {
    "baseScore": {
      "info": 0,
      "warning": 1,
      "critical": 5
    },
    "uplift": {
      "NETWORK:data_exfiltration": 5,
        ...
    },
    "thresholds": {
      "safe": 0,
      "caution": 1,
      "attention": 3,
      "risky": 5,
      "avoid": 7
    }
  }
}
```

### scan

- `maxFileSize`: maximum file size in bytes to scan.
- `maxFileCount`: maximum number of files to scan.
- `maxScanDepth`: maximum directory depth to traverse.

### allowlist / denylist

Both have the same shape:

- `languages`: per-language policy keyed by supported grammar name.
- `network`: cross-language network policy.

Current supported language are:

`bash`, `javascript`, `python`, `typescript`, `tsx`, `markdown`, `markdown-inline`.

Language policy fields:

- `imports`: exact module/import names to allow or deny.

Network policy fields:

- `domains`: external hostnames to allow or deny.

Precedence: **denylist overrides allowlist when the same import or domain appears in both**

### riskReport

Controls final score and risk level calculation.

- `baseScore`: base score by risk severity for **each** detected risk.
  - `info`: base score for `info` risks.
  - `warning`: base score for `warning` risks.
  - `critical`: base score for `critical` risks.
- `uplift`: additional score by risk code, applied once per risk code if present.
    A list of risk codes can be found [here](/analyzer/risk-codes).
- `thresholds`: score cutoffs for final risk levels after **summing**
    all detected risks (`safe`, `caution`, `attention`, `risky`, `avoid`).

Final score formula:

1. `max(baseScore[riskGroup.severity])` across all risks,
2. `+ sum(uplift[riskCode])` for each distinct risk code present.
3. Final `riskLevel` is selected by `thresholds`.

## Default Config

```json
{
    "scan": {
        "maxFileSize": 1000000,
        "maxFileCount": 100,
        "maxScanDepth": 5
    },
    "allowlist": {
        "languages": {
            "javascript": {
                "imports": [
                    "buffer",
                    "child_process",
                    "crypto",
                    "events",
                    "fs",
                    "fs/promises",
                    "http",
                    "https",
                    "os",
                    "path",
                    "stream",
                    "timers",
                    "url",
                    "util",
                    "node:buffer",
                    "node:child_process",
                    "node:crypto",
                    "node:events",
                    "node:fs",
                    "node:fs/promises",
                    "node:http",
                    "node:https",
                    "node:os",
                    "node:path",
                    "node:stream",
                    "node:timers",
                    "node:url",
                    "node:util"
                ]
            },
            "typescript": {
                "imports": [
                    "buffer",
                    "child_process",
                    "crypto",
                    "events",
                    "fs",
                    "fs/promises",
                    "http",
                    "https",
                    "os",
                    "path",
                    "stream",
                    "timers",
                    "url",
                    "util",
                    "node:buffer",
                    "node:child_process",
                    "node:crypto",
                    "node:events",
                    "node:fs",
                    "node:fs/promises",
                    "node:http",
                    "node:https",
                    "node:os",
                    "node:path",
                    "node:stream",
                    "node:timers",
                    "node:url",
                    "node:util"
                ]
            },
            "tsx": {
                "imports": [
                    "buffer",
                    "child_process",
                    "crypto",
                    "events",
                    "fs",
                    "fs/promises",
                    "http",
                    "https",
                    "os",
                    "path",
                    "stream",
                    "timers",
                    "url",
                    "util",
                    "node:buffer",
                    "node:child_process",
                    "node:crypto",
                    "node:events",
                    "node:fs",
                    "node:fs/promises",
                    "node:http",
                    "node:https",
                    "node:os",
                    "node:path",
                    "node:stream",
                    "node:timers",
                    "node:url",
                    "node:util"
                ]
            },
            "python": {
                "imports": [
                    "argparse",
                    "collections",
                    "datetime",
                    "functools",
                    "hashlib",
                    "itertools",
                    "json",
                    "logging",
                    "math",
                    "os",
                    "os.path",
                    "pathlib",
                    "re",
                    "shutil",
                    "subprocess",
                    "sys",
                    "tempfile",
                    "typing",
                    "urllib",
                    "urllib.parse",
                    "urllib.request"
                ]
            }
        }
    },
    "riskReport": {
        "baseScore": {
            "info": 0,
            "warning": 1,
            "critical": 5
        },
        "uplift": {
            "NETWORK:data_exfiltration": 5,
            "NETWORK:remote_code_execution": 5,
            "NETWORK:credential_leak": 7,
            "NETWORK:localhost_secret_exposure": 2
        },
        "thresholds": {
            "safe": 0,
            "caution": 1,
            "attention": 3,
            "risky": 5,
            "avoid": 7
        }
    }
}
```

## Merge behavior

- The analyzer deep-merges your config onto the defaults.
- Absent keys fall back to default values.
- For `riskReport`, nested objects are deep-merged and caller values override defaults.
- For `imports` and `domains`, arrays are unioned with de-duplication and defaults
  preserved first, then caller values appended.

Example:

Defaults:

```json
{
    "allowlist": {
        "languages": {
            "python": {
                "imports": ["A", "B"]
            }
        }
    }
}
```

Caller config:

```json
{
    "allowlist": {
        "languages": {
            "python": {
                "imports": ["B", "C", "D"]
            }
        }
    }
}
```

Effective config:

```json
{
    "allowlist": {
        "languages": {
            "python": {
                "imports": ["A", "B", "C", "D"]
            }
        }
    }
}
```
