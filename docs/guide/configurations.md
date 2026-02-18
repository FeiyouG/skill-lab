# Configurations

This guide documents the analyzer configuration format used by the CLI and API.

## Analyzer config format

The config is a JSON object with three top-level keys:

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

Precedence: denylist overrides allowlist when the same import or domain appears in both.

## Default Config

```json
{
  "scan": {
    "maxFileSize": 1000000,
    "maxFileCount": 100,
    "maxScanDepth": 5
  },
}
```

## Merge behavior

- The analyzer deep-merges your config onto the defaults.
- Absent keys fall back to default values.
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
