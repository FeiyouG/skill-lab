# Risk Codes

This page lists all risk codes emitted by the analyzer.

## NETWORK

| Risk Code                           | Description                                                |
| ----------------------------------- | ---------------------------------------------------------- |
| `NETWORK:external_network_access`   | Outbound HTTP/HTTPS call to an external host.              |
| `NETWORK:data_exfiltration`         | Data sent to an external host via write-like HTTP methods. |
| `NETWORK:remote_code_execution`     | Potential remote content piped or executed as code.                  |
| `NETWORK:credential_leak`           | Credential-like values sent to a network destination.      |
| `NETWORK:localhost_secret_exposure` | Secret-like values sent to localhost/loopback.             |

## INJECTION

| Risk Code                     | Description                                                     |
| ----------------------------- | --------------------------------------------------------------- |
| `INJECTION:command_injection` | Untrusted or unsanitized input used in shell command execution. |

## PROMPT

| Risk Code                | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `PROMPT:prompt_override` | Prompt content attempts to override system/developer intent. |

## DESTRUCTIVE

| Risk Code                          | Description                                                               |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `DESTRUCTIVE:destructive_behavior` | Destructive operations such as delete/wipe behavior.                      |
| `DESTRUCTIVE:permission_weakening` | Permission weakening changes (for example broad chmod/chown adjustments). |

## PRIVILEGE

| Risk Code                        | Description                                         |
| -------------------------------- | --------------------------------------------------- |
| `PRIVILEGE:privilege_escalation` | Privilege escalation patterns (for example `sudo`). |

## PERSISTENCE

| Risk Code                 | Description                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| `PERSISTENCE:persistence` | Persistence mechanisms (for example cron/startup/service hooks). |

## SECRETS

| Risk Code               | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `SECRETS:secret_access` | Access to secret-like environment variables or values. |

## DEPENDENCY

| Risk Code                    | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| `DEPENDENCY:external_import` | External import not explicitly configured by policy. |

## REFERENCE

| Risk Code                 | Description                                                 |
| ------------------------- | ----------------------------------------------------------- |
| `REFERENCE:external_file` | External file/source reference not analyzed in current run. |
