# GitHub Projects Sync — Athena Automation

This document describes the full GitHub Projects v2 syncing setup for StockPot, powered by the **Athena** script suite (`scripts/athena-*.mjs`).

---

## Overview

The Athena suite keeps `docs/context/BACKLOG.md` (the authoritative source of truth for shard status) in two-way sync with the GitHub Projects v2 board (**MLP**, project #13). It also manages GitHub Issues and repository labels.

```
BACKLOG.md ──► athena-blast-issues  ──► GitHub Issues (one issue per shard)
                                              │
BACKLOG.md ──► athena-sync-project  ──► GitHub Projects board
                                         (Status, Iteration, Priority, Complexity)
                                              │
GitHub Projects board ──► athena-reconcile ──► BACKLOG.md (pull status changes back)
```

---

## Prerequisites

- **GitHub CLI** (`gh`) installed and authenticated
- Auth must include the `project` OAuth scope:
  ```bash
  gh auth refresh -s project
  ```
- Node.js 22 (the scripts use `node:` builtins and top-level `await`)
- Run all commands from the workspace root (`e:\Apps\stockpot`)

---

## Configuration

`.github/athena.config.json` — committed to the repository:

```json
{
  "repo": "ograva/stockpot",
  "projectOwner": "ograva",
  "projectNumber": 13,
  "projectTitle": "MLP"
}
```

| Field           | Purpose                                                                             |
| :-------------- | :---------------------------------------------------------------------------------- |
| `repo`          | `owner/repo` — used for all `gh issue` and `gh label` commands                      |
| `projectOwner`  | GitHub username that owns the Project (personal account, not org)                   |
| `projectNumber` | Project number from the URL: `github.com/users/ograva/projects/**13**`              |
| `projectTitle`  | Fallback title-based lookup when `--project-title` flag is passed on the CLI        |

> **Gotcha:** The project number visible in the URL for personal-account projects is **not** the same as global issue numbers. Use `gh project list --owner ograva --format json` to verify the correct number when in doubt.

---

## GitHub Project Field Requirements

The sync scripts detect fields by name and type. Only **Status** is required; all others degrade gracefully.

| Field Name   | Type                       | Required | Values expected                                              |
| :----------- | :------------------------- | :------- | :----------------------------------------------------------- |
| `Status`     | `ProjectV2SingleSelectField` | **Yes**  | `Backlog`, `In Progress`, `In Review`, `Done`               |
| `Iteration`  | `ProjectV2IterationField`  | No       | `Iteration 1`, `Iteration 2`, `Iteration 3` (+ 4, 5 if needed) |
| `Priority`   | `ProjectV2SingleSelectField` | No       | `high`, `medium`, `low` (or `P0`, `P1`, `P2`)               |
| `complexity` | `ProjectV2SingleSelectField` | No       | `xs`, `s`, `m`, `l`, `xl`                                   |

When an optional field is missing from the project, the script logs a skip message and continues without error.

### Iteration field detection — technical note

GitHub's `gh project field-list` returns `type: "ProjectV2IterationField"` for iteration fields and does **not** include the iteration options in that response. The sync script makes a follow-up GraphQL call (`gh api graphql`) to fetch `configuration.iterations[].{id, title}` for matching.

---

## Module → Iteration Mapping

Shard iteration is derived automatically from the module prefix. Defined in `scripts/athena-lib.mjs` as `MODULE_SPRINT`:

| Module | Iteration     |
| :----- | :------------ |
| AUTH   | Iteration 1   |
| ADMN   | Iteration 1   |
| MSTR   | Iteration 1   |
| REPO   | Iteration 2   |
| KTCH   | Iteration 2   |
| SYNC   | Iteration 2   |
| HWBR   | Iteration 2   |
| VNDR   | Iteration 2   |
| RCNC   | Iteration 3   |
| ALRT   | Iteration 3   |

The iteration title in `MODULE_SPRINT` must match the iteration title on the GitHub Project exactly (case-sensitive). If a shard's module maps to an iteration that doesn't exist on the project, the sync logs a warning and skips iteration sync for that shard.

---

## BACKLOG.md — Source of Truth

`docs/context/BACKLOG.md` is the canonical registry for all shards. Each row in its Markdown tables drives everything downstream.

**Relevant columns:**

| Column       | Description                                                                 |
| :----------- | :-------------------------------------------------------------------------- |
| `Shard ID`   | Unique ID, e.g. `AUTH-005`. Prefix must be one of the 10 module codes.     |
| `Title`      | Issue title text                                                             |
| `Module`     | Module prefix code (AUTH, ADMN, MSTR, …)                                   |
| `Priority`   | `High`, `Medium`, or `Low`                                                  |
| `Status`     | `Not Started`, `In Progress`, `Ready for Review`, `Completed`, `Superseded` |
| `Complexity` | `xs`, `s`, `m`, `l`, or `xl`                                                |
| `File`       | Link to the shard file and optionally the linked GitHub issue `(#N)`        |

The issue number in the `File` column (`(#N)` or `[#N](url)`) is how scripts identify which GitHub Issue corresponds to a shard.

---

## Scripts Reference

### `npm run athena:setup-labels`

Creates (or updates via `--force`) all repository labels in one pass.

**Labels created:**

| Category   | Labels                                                   |
| :--------- | :------------------------------------------------------- |
| Priority   | `priority:high`, `priority:medium`, `priority:low`       |
| Complexity | `complexity:xs`, `complexity:s`, `complexity:m`, `complexity:l`, `complexity:xl` |
| Shard status | `shard:not-started`, `shard:in-progress`, `shard:ready-for-review`, `shard:completed` |
| Module     | `AUTH`, `ADMN`, `MSTR`, `REPO`, `KTCH`, `SYNC`, `HWBR`, `VNDR`, `RCNC`, `ALRT` |

Run once when setting up a new repository. Safe to re-run (idempotent).

---

### `npm run athena:blast-issues`

Creates GitHub Issues for every shard in BACKLOG.md that does not yet have a linked issue and whose status is not `Completed` or `Superseded` — this covers `Not Started`, `In Progress`, and `Ready for Review` shards.

- Reads each shard's `.md` file from `docs/shards/[MODULE]/` for the issue body
- Applies priority, complexity, shard-status, and module labels
- Adds the new issue to the configured GitHub Project
- Writes the issue number back to BACKLOG.md and the shard file (`issue:` field)
- Skips shards that already have an issue linked

```bash
npm run athena:blast-issues       # create issues for all unlinked shards
npm run athena:blast-issues:dry   # preview only, no writes
```

---

### `npm run athena:sync-project`

Pushes the current BACKLOG.md state outward to the GitHub Projects v2 board.

**Per shard (that has an issue number):**
1. Ensures the issue is on the project board (adds it if missing)
2. Sets **Status** from the shard's `status` column
3. Sets **Iteration** from the module's sprint mapping (if the field exists)
4. Sets **Priority** from the shard's `priority` column (if the field exists)
5. Sets **Complexity** from the shard's `complexity` column (if the field exists)

```bash
npm run athena:sync-project
npm run athena:sync-project:dry   # preview only
```

**Status value mapping:**

| BACKLOG.md value   | GitHub Project option |
| :----------------- | :-------------------- |
| `Not Started`      | `Backlog`             |
| `In Progress`      | `In Progress`         |
| `Ready for Review` | `In Review`           |
| `Completed`        | `Done`                |

---

### `npm run athena:reconcile`

Pulls status changes **from** GitHub back into BACKLOG.md and shard files.

- Reads the current Status field value for each project item
- Closes GitHub Issues for shards marked `Completed` on the board
- Updates the `Status` column in BACKLOG.md and the `status:` field in each shard `.md` file
- Prints a summary of changed shards

```bash
npm run athena:reconcile
npm run athena:reconcile:dry   # preview only
```

---

### `npm run athena:ship`

Ships a completed shard as a pull request. (See `scripts/athena-ship-pr.mjs` for full details.)

---

## End-to-End Workflow

### Initial repository setup (run once)

```bash
# 1. Create labels
npm run athena:setup-labels

# 2. Create issues for all Not Started shards and add them to the board
npm run athena:blast-issues

# 3. Push all statuses, iterations, priorities, and complexities to the board
npm run athena:sync-project
```

### Daily development loop

```bash
# After updating a shard status in BACKLOG.md:
npm run athena:sync-project

# After moving cards on the GitHub Projects board:
npm run athena:reconcile
```

### Dry-run mode

All scripts have a `:dry` counterpart that prints every `gh` command to stdout but does not execute it. No files or GitHub data are modified.

```bash
npm run athena:blast-issues:dry
npm run athena:sync-project:dry
npm run athena:reconcile:dry
npm run athena:ship:dry
```

> **Windows/PowerShell note:** `npm run script -- --dry-run` does **not** forward the flag correctly on Windows npm 11+. Always use the dedicated `:dry` scripts above. Alternatively, invoke the script directly: `node scripts/athena-blast-issues.mjs --dry-run`.

---

## Troubleshooting

### `GraphQL: Could not resolve to a ProjectV2 with the number N`

The project number in `.github/athena.config.json` is wrong. Find the correct number:

```bash
gh project list --owner ograva --format json
```

Look for the project titled `MLP` and use its `number` field. Update `athena.config.json` accordingly.

### `No Iteration field found on project — sprint sync will be skipped`

The GitHub Project does not have an **Iteration** field, or the field type is not `ProjectV2IterationField`. Add an Iteration field via the project's **Settings → Fields** UI, then re-run the sync.

Iteration titles on the project must match `MODULE_SPRINT` values in `athena-lib.mjs` exactly: `Iteration 1`, `Iteration 2`, `Iteration 3`.

### `No project status option found for '...'`

The shard has a status value in BACKLOG.md that doesn't map to any GitHub Project Status option. Check the status value against the mapping table above and correct it in BACKLOG.md.

### `Resource not accessible by integration`

The authenticated `gh` session is missing the `project` OAuth scope. Fix:

```bash
gh auth refresh -s project
```

### `gh auth status` shows wrong account

If you have multiple GitHub accounts, ensure the active account is the one that owns project #13:

```bash
gh auth status
gh auth switch   # if needed
```
