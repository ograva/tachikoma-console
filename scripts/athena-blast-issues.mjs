#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  buildIssueBody,
  ensureProjectItem,
  getShardLabels,
  issueUrl,
  loadAthenaContext,
  parseArgs,
  parseIssueNumberFromUrl,
  readBacklog,
  resolveShardPath,
  runGh,
  updateBacklogRowIssue,
  upsertShardField,
  writeBacklog,
  hasFlag,
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

const candidates = backlog.rows.filter(
  (row) => row.status !== "Completed" && row.status !== "Superseded",
);
if (!candidates.length) {
  console.log("No actionable shards found in backlog.");
  process.exit(0);
}

console.log(
  `Found ${candidates.length} actionable shard(s) (Not Started / In Progress / Ready for Review).`,
);

let created = 0;
for (const shard of candidates) {
  const shardPath = resolveShardPath(backlogPath, shard.fileRelPath);
  if (!fs.existsSync(shardPath)) {
    console.warn(
      `Skipping ${shard.shardId}: shard file missing at ${shardPath}`,
    );
    continue;
  }

  const existingIssueValue = getExistingIssueValue(shardPath);
  if (existingIssueValue) {
    console.log(
      `Skipping ${shard.shardId}: already linked to ${existingIssueValue}.`,
    );
    continue;
  }

  const shardContent = fs.readFileSync(shardPath, "utf8");
  const body = buildIssueBody({ shard, shardContent });
  const labels = getShardLabels(shard);

  const args = [
    "issue",
    "create",
    "--repo",
    context.repo,
    "--title",
    `${shard.shardId}: ${shard.title}`,
    "--body",
    body,
  ];
  for (const label of labels) {
    args.push("--label", label);
  }

  const output = runGh(args, { dryRun });
  const createdUrl = output || issueUrl(context.repo, 0);
  const issueNumber = parseIssueNumberFromUrl(createdUrl);

  if (!dryRun && !issueNumber) {
    throw new Error(
      `Could not parse issue number from output for ${shard.shardId}: ${output}`,
    );
  }

  const resolvedIssueNumber =
    issueNumber || Number(flags.get("mock-issue") || 0) || 99999;
  const resolvedUrl = issueNumber
    ? createdUrl
    : issueUrl(context.repo, resolvedIssueNumber);

  try {
    ensureProjectItem({
      projectNumber: context.projectNumber,
      projectOwner: context.projectOwner,
      issueUrlValue: resolvedUrl,
      dryRun,
    });
  } catch (projectErr) {
    console.warn(
      `Warning: could not add #${resolvedIssueNumber} to project board — ${projectErr.message.split("\n")[0]}. ` +
        `Set a PAT with 'project' scope to enable board sync.`,
    );
  }

  if (!dryRun) {
    upsertShardField(shardPath, "GitHub Issue", `#${resolvedIssueNumber}`);
    updateBacklogRowIssue(backlog, shard.shardId, resolvedIssueNumber);
  }

  created += 1;
  console.log(`Created issue #${resolvedIssueNumber} for ${shard.shardId}.`);
}

if (!dryRun) {
  writeBacklog(backlogPath, backlog);
}

console.log(`${dryRun ? "Planned" : "Created"} ${created} issue(s).`);

function getExistingIssueValue(shardPath) {
  const content = fs.readFileSync(shardPath, "utf8");
  const issueRow = content.match(
    /^\|\s*\*\*GitHub Issue\*\*\s*\|\s*(.+?)\s*\|$/m,
  );
  if (!issueRow) {
    return "";
  }
  return issueRow[1].trim();
}
