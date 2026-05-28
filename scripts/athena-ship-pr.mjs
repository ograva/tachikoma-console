#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  getShardIssueNumber,
  getShardTitle,
  hasFlag,
  loadAthenaContext,
  parseArgs,
  readBacklog,
  requireShardId,
  resolveShardPath,
  runGh,
  updateBacklogRowStatus,
  upsertShardField,
  writeBacklog,
} from "./athena-lib.mjs";

const { flags, positional } = parseArgs(process.argv.slice(2));
const dryRun = hasFlag(flags, "dry-run");
const runChecks = hasFlag(flags, "run-checks");

const shardId = positional[0] || flags.get("shard");
requireShardId(shardId);

const context = loadAthenaContext({ flags, requireProject: false });
const backlogPath = path.join(
  context.repoRoot,
  "docs",
  "context",
  "BACKLOG.md",
);
const backlog = readBacklog(backlogPath);

const shard = backlog.rows.find((row) => row.shardId === shardId);
if (!shard) {
  throw new Error(`Could not locate shard ${shardId} in BACKLOG.md`);
}

const shardPath = resolveShardPath(backlogPath, shard.fileRelPath);
const issueNumber = getShardIssueNumber(shardPath) || shard.issueNumber;
if (!issueNumber) {
  throw new Error(
    `Shard ${shardId} has no linked GitHub Issue. Run athena:blast-issues first.`,
  );
}

const currentBranch = runGit(["branch", "--show-current"]);
if (!currentBranch) {
  throw new Error("Could not determine current branch.");
}
if (currentBranch === "main") {
  throw new Error(
    "Refusing to ship from main. Checkout the shard feature branch first.",
  );
}

if (runChecks) {
  runCommand("npm", ["run", "build"], dryRun);
  runCommand("npm", ["test", "--", "--watch=false"], dryRun);
}

const title = getShardTitle(shardPath, shard.title).replace(
  `${shardId} — `,
  "",
);
const prTitle = `[${shardId}] ${title}`;
const shardRelativePath = path
  .relative(context.repoRoot, shardPath)
  .replaceAll("\\", "/");

const prBody = [
  `Closes #${issueNumber}`,
  "",
  "Summary",
  `- Implements shard ${shardId}: ${shard.title}`,
  "",
  "References",
  `- Shard file: ${shardRelativePath}`,
].join("\n");

const prOutput = runGh(
  [
    "pr",
    "create",
    "--repo",
    context.repo,
    "--title",
    prTitle,
    "--body",
    prBody,
    "--base",
    flags.get("base") || "main",
    "--head",
    currentBranch,
  ],
  { dryRun },
);

if (!dryRun) {
  upsertShardField(shardPath, "Status", "Ready for Review");
  updateBacklogRowStatus(backlog, shardId, "Ready for Review");
  writeBacklog(backlogPath, backlog);
}

console.log(
  `${dryRun ? "Planned" : "Opened"} PR for ${shardId}${prOutput ? `: ${prOutput}` : ""}`,
);

function runGit(args) {
  return runCommand("git", args, false);
}

function runCommand(command, args, dry) {
  if (dry) {
    console.log(`[dry-run] ${command} ${args.join(" ")}`);
    return "";
  }

  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n")
      .trim();
    throw new Error(`${command} ${args.join(" ")} failed: ${output}`);
  }

  return (result.stdout || "").trim();
}
