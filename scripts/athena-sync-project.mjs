#!/usr/bin/env node
import path from "node:path";
import {
  ensureProjectItem,
  findIterationId,
  findSingleSelectOptionId,
  findStatusOptionId,
  getIssueState,
  getShardSprint,
  hasFlag,
  issueUrl,
  listProjectItems,
  loadAthenaContext,
  loadProjectMetadata,
  normalizeStatus,
  parseArgs,
  PRIORITY_ALIASES,
  readBacklog,
  setProjectItemIterationField,
  setProjectItemSingleSelect,
  setProjectItemStatus,
} from "./athena-lib.mjs";

const { flags } = parseArgs(process.argv.slice(2));
const dryRun = hasFlag(flags, "dry-run");

const context = loadAthenaContext({ flags, requireProject: true });
const backlogPath = path.join(
  context.repoRoot,
  "docs",
  "context",
  "BACKLOG.md",
);
const backlog = readBacklog(backlogPath);

const metadata = loadProjectMetadata({
  projectNumber: context.projectNumber,
  projectOwner: context.projectOwner,
});

const statusFieldId = metadata.statusField.id;
const projectId = metadata.project.id;

// Iteration field is optional — absent when not configured on the project.
const iterationField = metadata.iterationField ?? null;
if (iterationField) {
  console.log(
    `Iteration field found: "${iterationField.name}" (${iterationField.id})`,
  );
} else {
  console.log(
    "No Iteration field found on project — sprint sync will be skipped.",
  );
}

const priorityField = metadata.priorityField ?? null;
const complexityField = metadata.complexityField ?? null;
if (!priorityField)
  console.log("No Priority field on project — priority sync will be skipped.");
if (!complexityField)
  console.log(
    "No Complexity field on project — complexity sync will be skipped.",
  );

const optionCache = new Map();
const items = listProjectItems({
  projectNumber: context.projectNumber,
  projectOwner: context.projectOwner,
});

const itemByContentUrl = new Map();
for (const item of items) {
  const contentUrl = item?.content?.url;
  if (contentUrl) {
    itemByContentUrl.set(contentUrl, item);
  }
}

let updated = 0;
let warnings = 0;

for (const shard of backlog.rows) {
  if (!shard.issueNumber) {
    continue;
  }

  const targetStatus = normalizeStatus(shard.status);
  const optionId = getOptionId(targetStatus);
  if (!optionId) {
    console.warn(
      `No project status option found for '${targetStatus}'. Skipping ${shard.shardId}.`,
    );
    warnings += 1;
    continue;
  }

  const thisIssueUrl = issueUrl(context.repo, shard.issueNumber);
  let item = itemByContentUrl.get(thisIssueUrl);

  ensureProjectItem({
    projectNumber: context.projectNumber,
    projectOwner: context.projectOwner,
    issueUrlValue: thisIssueUrl,
    dryRun,
  });

  if (!item) {
    const refreshed = listProjectItems({
      projectNumber: context.projectNumber,
      projectOwner: context.projectOwner,
    });
    item = refreshed.find(
      (candidate) => candidate?.content?.url === thisIssueUrl,
    );
    if (item) {
      itemByContentUrl.set(thisIssueUrl, item);
    }
  }

  if (!item?.id) {
    console.warn(
      `Could not locate project item for ${shard.shardId} (${thisIssueUrl}).`,
    );
    warnings += 1;
    continue;
  }

  setProjectItemStatus({
    projectId,
    itemId: item.id,
    statusFieldId,
    optionId,
    dryRun,
  });

  // Sync iteration field when the project has one configured.
  if (iterationField) {
    const sprintName = getShardSprint(shard);
    const iterationId = findIterationId(iterationField, sprintName);
    if (iterationId) {
      setProjectItemIterationField({
        projectId,
        itemId: item.id,
        iterationFieldId: iterationField.id,
        iterationId,
        dryRun,
      });
    } else if (sprintName) {
      console.warn(
        `No iteration matching "${sprintName}" found for ${shard.shardId}. Skipping iteration sync.`,
      );
      warnings += 1;
    }
  }

  // Sync Priority field.
  if (priorityField) {
    const priorityOptionId = findSingleSelectOptionId(
      priorityField,
      shard.priority,
      PRIORITY_ALIASES,
    );
    if (priorityOptionId) {
      setProjectItemSingleSelect({
        projectId,
        itemId: item.id,
        fieldId: priorityField.id,
        optionId: priorityOptionId,
        dryRun,
      });
    } else {
      console.warn(
        `No priority option matching "${shard.priority}" for ${shard.shardId}. Skipping priority sync.`,
      );
      warnings += 1;
    }
  }

  // Sync Complexity field (direct lowercase match: xs/s/m/l/xl).
  if (complexityField) {
    const complexityOptionId = findSingleSelectOptionId(
      complexityField,
      String(shard.complexity || "").toLowerCase(),
    );
    if (complexityOptionId) {
      setProjectItemSingleSelect({
        projectId,
        itemId: item.id,
        fieldId: complexityField.id,
        optionId: complexityOptionId,
        dryRun,
      });
    } else {
      console.warn(
        `No complexity option matching "${shard.complexity}" for ${shard.shardId}. Skipping complexity sync.`,
      );
      warnings += 1;
    }
  }

  const issue = getIssueState({
    repo: context.repo,
    issueNumber: shard.issueNumber,
    dryRun,
  });
  if (issue.state === "CLOSED" && targetStatus !== "Completed") {
    console.warn(
      `Discrepancy: ${shard.shardId} issue is CLOSED but backlog status is '${shard.status}'.`,
    );
    warnings += 1;
  }

  updated += 1;
}

console.log(
  `${dryRun ? "Planned" : "Updated"} project sync for ${updated} shard-linked issue(s).`,
);
if (warnings) {
  console.log(`Warnings: ${warnings}`);
}

function getOptionId(status) {
  if (optionCache.has(status)) {
    return optionCache.get(status);
  }
  const optionId = findStatusOptionId(metadata.statusField, status);
  optionCache.set(status, optionId);
  return optionId;
}
