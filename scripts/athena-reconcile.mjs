#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  getIssueState,
  hasFlag,
  issueUrl,
  listProjectItems,
  loadAthenaContext,
  normalizeStatus,
  parseArgs,
  readBacklog,
  resolveShardPath,
  updateBacklogRowStatus,
  upsertShardField,
  writeBacklog,
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

const projectItems = listProjectItems({
  projectNumber: context.projectNumber,
  projectOwner: context.projectOwner,
});

const statusByIssueUrl = new Map();
for (const item of projectItems) {
  const contentUrl = item?.content?.url;
  if (!contentUrl) {
    continue;
  }

  const statusField = (item.fieldValues || []).find(
    (value) => String(value?.field?.name || "").toLowerCase() === "status",
  );
  const statusValue =
    statusField?.name || statusField?.optionName || statusField?.value;
  if (statusValue) {
    statusByIssueUrl.set(contentUrl, normalizeStatus(statusValue));
  }
}

const changed = [];
let scanned = 0;

for (const shard of backlog.rows) {
  if (!shard.issueNumber) {
    continue;
  }

  scanned += 1;
  const shardPath = resolveShardPath(backlogPath, shard.fileRelPath);
  if (!fs.existsSync(shardPath)) {
    console.warn(`Missing shard file for ${shard.shardId}: ${shardPath}`);
    continue;
  }

  const issue = getIssueState({
    repo: context.repo,
    issueNumber: shard.issueNumber,
    dryRun,
  });
  const thisIssueUrl = issue.url || issueUrl(context.repo, shard.issueNumber);

  let canonical = normalizeStatus(shard.status);
  if (issue.state === "CLOSED") {
    canonical = "Completed";
  } else {
    const projectStatus = statusByIssueUrl.get(thisIssueUrl);
    if (projectStatus) {
      canonical = projectStatus;
    }
  }

  if (canonical !== normalizeStatus(shard.status)) {
    changed.push({ shardId: shard.shardId, from: shard.status, to: canonical });
    if (!dryRun) {
      updateBacklogRowStatus(backlog, shard.shardId, canonical);
      upsertShardField(shardPath, "Status", canonical);
    }
  }
}

if (!dryRun) {
  writeBacklog(backlogPath, backlog);
}

console.log(
  `${dryRun ? "Scanned" : "Reconciled"} ${scanned} shard-linked issue(s).`,
);
if (!changed.length) {
  console.log("No status mismatches found.");
} else {
  console.log(
    `${dryRun ? "Would update" : "Updated"} ${changed.length} shard(s):`,
  );
  for (const row of changed) {
    console.log(`- ${row.shardId}: ${row.from} -> ${row.to}`);
  }
}
