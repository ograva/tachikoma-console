# UI Template Pack

This folder provides reusable templates to ensure design concepts are executed consistently across planning, implementation, and QA.

## Files

- Shard template:
  - docs/context/designs/templates/Shard_Template.md
- UI implementation task template:
  - docs/context/designs/templates/UI_Task_Template.md
- Component design contract template:
  - docs/context/designs/templates/Component_Design_Contract_Template.md
- QA validation template:
  - docs/context/designs/templates/QA_UI_Validation_Template.md
- Theme rollout checklist template:
  - docs/context/designs/templates/Theme_Rollout_Checklist_Template.md

## Suggested Workflow

1. Use UI_Task_Template to define implementation-ready items.
2. Poe decomposes each item into shards using Shard_Template.
3. Engineering implements against Component_Design_Contract_Template.
4. Quinn validates with QA_UI_Validation_Template.
5. Use Theme_Rollout_Checklist_Template for phase-level release gate.
