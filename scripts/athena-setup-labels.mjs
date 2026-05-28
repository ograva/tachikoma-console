#!/usr/bin/env node
import { hasFlag, loadAthenaContext, parseArgs, runGh } from "./athena-lib.mjs";

const { flags } = parseArgs(process.argv.slice(2));
const dryRun = hasFlag(flags, "dry-run");

const context = loadAthenaContext({ flags, requireProject: false });

const labels = [
  ["priority:high", "B60205", "High-priority shard"],
  ["priority:medium", "D97706", "Medium-priority shard"],
  ["priority:low", "0EA5E9", "Low-priority shard"],
  ["complexity:xs", "9CA3AF", "Complexity XS"],
  ["complexity:s", "6B7280", "Complexity S"],
  ["complexity:m", "4B5563", "Complexity M"],
  ["complexity:l", "374151", "Complexity L"],
  ["complexity:xl", "111827", "Complexity XL"],
  ["shard:not-started", "64748B", "Shard in backlog"],
  ["shard:in-progress", "0284C7", "Shard currently being implemented"],
  ["shard:ready-for-review", "7C3AED", "Shard PR is open and ready for review"],
  ["shard:completed", "15803D", "Shard implementation merged"],
  ["AUTH", "1D4ED8", "AUTH module"],
  ["ADMN", "2563EB", "ADMN module"],
  ["MSTR", "0EA5E9", "MSTR module"],
  ["REPO", "D97706", "REPO module"],
  ["KTCH", "EA580C", "KTCH module"],
  ["SYNC", "0891B2", "SYNC module"],
  ["HWBR", "9333EA", "HWBR module"],
  ["VNDR", "16A34A", "VNDR module"],
  ["RCNC", "DC2626", "RCNC module"],
  ["ALRT", "BE123C", "ALRT module"],
];

for (const [name, color, description] of labels) {
  runGh(
    [
      "label",
      "create",
      name,
      "--repo",
      context.repo,
      "--color",
      color,
      "--description",
      description,
      "--force",
    ],
    { dryRun },
  );
}

console.log(`${dryRun ? "Planned" : "Ensured"} ${labels.length} label(s).`);
