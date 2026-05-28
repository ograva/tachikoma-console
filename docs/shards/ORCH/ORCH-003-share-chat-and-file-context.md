# ORCH-003 Share Chat and File Context

| Field | Value |
| :--- | :--- |
| **Shard ID** | ORCH-003 |
| **Module** | ORCH - Multi-Agent Conversation Protocol |
| **Story Ref** | ORCH-003 |
| **Priority** | Medium |
| **Status** | Not Started |
| **Complexity** | M |
| **Depends On** | ORCH-001, CHAT-001 |

## Description

Implement shared context assembly across chat metadata and uploaded files so all personas reason over the same inputs. This shard defines deterministic input inclusion order and safe failure behavior for unsupported files. It preserves current chat-page ownership while keeping service extraction as a later architecture enhancement.

## Acceptance Criteria

- [ ] Chat description and uploaded text file context are included in persona request payloads.
- [ ] Context assembly follows documented deterministic ordering rules.
- [ ] Unsupported or invalid files fail safely without protocol crash.

## Test Coverage

- [ ] Unit: Context builder ordering and file-type handling logic with malformed input tests.
- [ ] E2E: File upload plus shared context multi-agent response validation (T315-T320).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/*`.
- Keep context handling transparent in diagnostics.
- Validate payload growth against token governance policies.
