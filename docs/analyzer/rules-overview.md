# Rules Overview

Risk codes are grouped by category:

- `NETWORK:*` - exfiltration, remote execution, credential leaks, localhost exposure
- `INJECTION:*` - command injection patterns
- `PROMPT:*` - prompt override and prompt-injection patterns
- `DESTRUCTIVE:*` - destructive behavior and permission weakening
- `PRIVILEGE:*` - privilege escalation indicators
- `PERSISTENCE:*` - persistence mechanisms
- `SECRETS:*` - secret access and handling concerns

Rule definitions are language-aware and include Bash, JavaScript, TypeScript, Python, Markdown, and text contexts.
