# AGNT-003 Author Structured System Instructions

| Field | Value |
| :--- | :--- |
| **Shard ID** | AGNT-003 |
| **Module** | AGNT - Agent Profiles and Instruction Design |
| **Story Ref** | AGNT-003 |
| **Priority** | Medium |
| **Status** | Not Started |
| **GitHub Issue** | #44 |
| **Complexity** | M |
| **Depends On** | AGNT-001 |

## Description

Implement structured instruction authoring across plaintext, form, and XML modes with reversible conversion paths. This shard supports advanced persona tuning while preserving serialization quality. It must avoid semantic loss across mode transitions.

## Acceptance Criteria

- [ ] Users can switch between plaintext, form, and XML instruction modes.
- [ ] Form mode can generate XML and valid XML can be parsed back into structured fields.
- [ ] AI-assisted conversion from plaintext generates reviewable structured output.

## Test Coverage

- [ ] Unit: XML-to-fields and fields-to-XML conversion routines with roundtrip integrity checks.
- [ ] E2E: Mode switching and conversion behavior with save and reload verification (T113-T118).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-profiles/*`, `src/app/models/agent-profile.model.ts`.
- Maintain canonical model shape consistency on persistence.
- Keep validation feedback explicit for malformed XML.


