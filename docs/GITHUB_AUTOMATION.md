# Athena GitHub Automation

This document wires Athena's orchestration commands to executable scripts in this repository.

## Prerequisites

1. Authenticate GitHub CLI:
   - `gh auth login`
2. Ensure project scope is granted:
   - `gh auth refresh -s project`
3. Optional: copy `.github/athena.config.example.json` to `.github/athena.config.json` and set your project number.

## Configuration Priority

Scripts resolve config in this order:

1. CLI flags
2. Environment variables
3. `.github/athena.config.json`
4. Defaults (`projectTitle=MLP`, repo auto-detected)

Supported environment variables:

- `ATHENA_REPO` (example: `ograva/stockpot`)
- `ATHENA_PROJECT_OWNER` (example: `ograva`)
- `ATHENA_PROJECT_NUMBER` (example: `3`)
- `ATHENA_PROJECT_TITLE` (example: `MLP`)

## Command Mapping

- `/blast-issues` -> `npm run athena:blast-issues`
- `/sync-project` -> `npm run athena:sync-project`
- `/reconcile` -> `npm run athena:reconcile`
- `/ship [ShardID]` -> `npm run athena:ship -- SHARD-ID`

## Scripts

Dry-run first for each command.

```bash
npm run athena:setup-labels -- --dry-run
npm run athena:blast-issues -- --dry-run
npm run athena:sync-project -- --dry-run
npm run athena:reconcile -- --dry-run
npm run athena:ship -- REPO-001 --dry-run
```

Live run:

```bash
npm run athena:setup-labels
npm run athena:blast-issues
npm run athena:sync-project
npm run athena:reconcile
npm run athena:ship -- REPO-001
```

## Notes

- `athena:blast-issues` only creates issues for shards with status `Not Started`.
- Issue numbers are written to shard files as `GitHub Issue` and appended in `BACKLOG.md` file links.
- `athena:sync-project` ensures each issue is in your Project v2 and updates Status to match `BACKLOG.md`.
- `athena:reconcile` updates local shard/backlog status from live GitHub issue + project status.
- `athena:ship` requires a non-`main` branch and linked issue number.
