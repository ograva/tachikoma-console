import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SHARD_ID_PATTERN = /^[A-Z]{4}-\d{3}$/;

export const STATUS_ALIASES = {
  "Not Started": ["Not Started", "Todo", "To Do", "Backlog"],
  "In Progress": ["In Progress", "Doing", "Active"],
  "Ready for Review": ["Ready for Review", "In Review", "Review"],
  Completed: ["Completed", "Done", "Closed"],
  Superseded: ["Superseded", "Cancelled", "Archived"],
};

/** Maps each module code to its iteration name — must match GitHub Project iteration titles exactly. */
export const MODULE_SPRINT = {
  AUTH: "Iteration 1",
  AGNT: "Iteration 1",
  CHAT: "Iteration 1",
  ORCH: "Iteration 1",
  SYNC: "Iteration 1",
  OPER: "Iteration 1",
  ADMN: "Iteration 1",
  MSTR: "Iteration 1",
  REPO: "Iteration 2",
  KTCH: "Iteration 2",
  HWBR: "Iteration 2",
  VNDR: "Iteration 2",
  RCNC: "Iteration 3",
  ALRT: "Iteration 3",
};

/** Returns the iteration name for a backlog shard (e.g. "Iteration 1") derived from its module code. */
export function getShardSprint(shard) {
  const moduleCode = String(shard.module || "")
    .split(" ")[0]
    .toUpperCase();
  return MODULE_SPRINT[moduleCode] ?? null;
}

/**
 * Maps backlog priority values (High / Medium / Low) to GitHub Project Priority field option names.
 * Covers both P0/P1/P2 and low/medium/high formats.
 */
export const PRIORITY_ALIASES = {
  High: ["high", "p0"],
  Medium: ["medium", "p1"],
  Low: ["low", "p2"],
};

/**
 * Finds a single-select option ID within any project field by value name.
 * Accepts an aliases map (like PRIORITY_ALIASES) or does a direct case-insensitive match.
 */
export function findSingleSelectOptionId(field, value, aliasMap = null) {
  if (!field?.options?.length || !value) {
    return null;
  }
  const candidates = aliasMap
    ? (aliasMap[value] ?? [String(value).toLowerCase()])
    : [String(value).toLowerCase()];
  const aliasSet = new Set(candidates.map((s) => s.toLowerCase()));
  const match = field.options.find((opt) =>
    aliasSet.has(String(opt.name || "").toLowerCase()),
  );
  return match?.id ?? null;
}

export function parseArgs(argv) {
  const flags = new Map();
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const [rawKey, maybeValue] = token.slice(2).split("=", 2);
      if (maybeValue !== undefined) {
        flags.set(rawKey, maybeValue);
      } else if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
        flags.set(rawKey, argv[i + 1]);
        i += 1;
      } else {
        flags.set(rawKey, "true");
      }
      continue;
    }
    positional.push(token);
  }
  return { flags, positional };
}

export function hasFlag(flags, name) {
  if (name === "dry-run" && process.env.ATHENA_DRY_RUN === "1") {
    return true;
  }
  return flags.has(name) && flags.get(name) !== "false";
}

function readJsonFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function runCommand(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n")
      .trim();
    const projectScopeHint = output.includes(
      "Resource not accessible by integration",
    )
      ? "\nHint: run 'gh auth refresh -s project' and retry, or pass --project-number explicitly."
      : "";
    throw new Error(
      `${cmd} ${args.join(" ")} failed: ${output}${projectScopeHint}`,
    );
  }

  return (result.stdout || "").trim();
}

export function runGh(args, { dryRun = false } = {}) {
  if (dryRun) {
    console.log(`[dry-run] gh ${args.join(" ")}`);
    return "";
  }
  return runCommand("gh", args);
}

function getCurrentRepo() {
  const nameWithOwner = runCommand("gh", [
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "-q",
    ".nameWithOwner",
  ]);
  const [owner, repo] = nameWithOwner.split("/");
  return { owner, repo, nameWithOwner };
}

function loadAthenaConfigFile(repoRoot) {
  const configPath = path.join(repoRoot, ".github", "athena.config.json");
  return readJsonFileIfExists(configPath) ?? {};
}

function findProjectNumberByTitle(owner, title) {
  const raw = runCommand("gh", [
    "project",
    "list",
    "--owner",
    owner,
    "--format",
    "json",
  ]);
  const projects = JSON.parse(raw).projects ?? [];
  const normalizedTitle = title.trim().toLowerCase();
  const match = projects.find(
    (project) =>
      String(project.title || "")
        .trim()
        .toLowerCase() === normalizedTitle,
  );
  return match?.number ?? null;
}

export function loadAthenaContext({
  flags = new Map(),
  requireProject = false,
} = {}) {
  const repoRoot = process.cwd();
  const fileConfig = loadAthenaConfigFile(repoRoot);
  const currentRepo = getCurrentRepo();

  const repo =
    flags.get("repo") ||
    process.env.ATHENA_REPO ||
    fileConfig.repo ||
    currentRepo.nameWithOwner;
  const [repoOwner] = repo.split("/");

  const projectOwner =
    flags.get("project-owner") ||
    process.env.ATHENA_PROJECT_OWNER ||
    fileConfig.projectOwner ||
    repoOwner;

  const projectTitle =
    flags.get("project-title") ||
    process.env.ATHENA_PROJECT_TITLE ||
    fileConfig.projectTitle ||
    "MLP";

  let projectNumberRaw =
    flags.get("project-number") ||
    process.env.ATHENA_PROJECT_NUMBER ||
    fileConfig.projectNumber ||
    "";

  if (!projectNumberRaw && requireProject) {
    try {
      const discovered = findProjectNumberByTitle(projectOwner, projectTitle);
      if (discovered) {
        projectNumberRaw = String(discovered);
      }
    } catch (error) {
      throw new Error(
        `Could not auto-discover project '${projectTitle}'. ${String(error.message || error)}`,
      );
    }
  }

  const projectNumber = projectNumberRaw ? Number(projectNumberRaw) : null;
  if (requireProject && !Number.isFinite(projectNumber)) {
    throw new Error(
      "Could not resolve GitHub Project number. Set --project-number, ATHENA_PROJECT_NUMBER, or .github/athena.config.json.",
    );
  }

  return {
    repoRoot,
    repo,
    projectOwner,
    projectTitle,
    projectNumber,
  };
}

export function readBacklog(backlogPath) {
  const raw = fs.readFileSync(backlogPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const rows = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith("|")) {
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 8 || !SHARD_ID_PATTERN.test(cells[0])) {
      continue;
    }

    const fileCell = cells[cells.length - 1];
    const linkMatch = fileCell.match(/\(([^)]+)\)/);
    if (!linkMatch) {
      continue;
    }

    const issueMatch = fileCell.match(/#(\d+)/);

    rows.push({
      lineIndex: i,
      originalLine: line,
      cells,
      shardId: cells[0],
      title: cells[1],
      module: cells[2],
      priority: cells[3],
      status: cells[4],
      complexity: cells[5],
      storyRef: cells[6],
      fileCell,
      fileRelPath: linkMatch[1],
      issueNumber: issueMatch ? Number(issueMatch[1]) : null,
    });
  }

  return { raw, lines, rows };
}

export function resolveShardPath(backlogPath, fileRelPath) {
  const backlogDir = path.dirname(backlogPath);
  return path.resolve(backlogDir, fileRelPath);
}

export function updateBacklogRowStatus(backlogData, shardId, newStatus) {
  const row = backlogData.rows.find((item) => item.shardId === shardId);
  if (!row) {
    throw new Error(`Could not find shard ${shardId} in backlog.`);
  }

  row.cells[4] = newStatus;
  row.status = newStatus;
  backlogData.lines[row.lineIndex] = `| ${row.cells.join(" | ")} |`;
}

export function updateBacklogRowIssue(backlogData, shardId, issueNumber) {
  const row = backlogData.rows.find((item) => item.shardId === shardId);
  if (!row) {
    throw new Error(`Could not find shard ${shardId} in backlog.`);
  }

  const stripped = row.fileCell.replace(/\s*\(#\d+\)\s*$/, "");
  const nextFileCell = `${stripped} (#${issueNumber})`;
  row.cells[row.cells.length - 1] = nextFileCell;
  row.fileCell = nextFileCell;
  row.issueNumber = issueNumber;
  backlogData.lines[row.lineIndex] = `| ${row.cells.join(" | ")} |`;
}

export function writeBacklog(backlogPath, backlogData) {
  fs.writeFileSync(backlogPath, `${backlogData.lines.join("\n")}\n`, "utf8");
}

export function parseShardFrontMatterTable(shardContent) {
  const lines = shardContent.split(/\r?\n/);
  const map = new Map();
  const fieldLineIndices = new Map();

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|$/);
    if (!match) {
      continue;
    }

    const key = match[1].trim();
    const value = match[2].trim();
    map.set(key, value);
    fieldLineIndices.set(key, i);
  }

  return { lines, map, fieldLineIndices };
}

export function upsertShardField(
  shardPath,
  fieldName,
  fieldValue,
  insertAfterField = "Status",
) {
  const content = fs.readFileSync(shardPath, "utf8");
  const parsed = parseShardFrontMatterTable(content);
  const { lines, fieldLineIndices } = parsed;
  const nextLine = `| **${fieldName}** | ${fieldValue} |`;

  if (fieldLineIndices.has(fieldName)) {
    lines[fieldLineIndices.get(fieldName)] = nextLine;
  } else if (fieldLineIndices.has(insertAfterField)) {
    const index = fieldLineIndices.get(insertAfterField);
    lines.splice(index + 1, 0, nextLine);
  } else {
    lines.splice(0, 0, nextLine);
  }

  fs.writeFileSync(shardPath, `${lines.join("\n")}\n`, "utf8");
}

export function getShardIssueNumber(shardPath) {
  const content = fs.readFileSync(shardPath, "utf8");
  const parsed = parseShardFrontMatterTable(content);
  const value = parsed.map.get("GitHub Issue") || "";
  const match = value.match(/#(\d+)/);
  return match ? Number(match[1]) : null;
}

export function getShardTitle(shardPath, fallbackTitle) {
  const content = fs.readFileSync(shardPath, "utf8");
  const firstLine =
    content.split(/\r?\n/).find((line) => line.trim().length > 0) || "";
  if (firstLine.startsWith("# ")) {
    return firstLine.replace(/^#\s+/, "").trim();
  }
  return fallbackTitle;
}

export function buildIssueBody({ shard, shardContent }) {
  const acBlock = extractChecklistSection(
    shardContent,
    "## Acceptance Criteria",
    ["## Test Coverage", "## Dev Notes"],
  );
  const descriptionBlock = extractSection(shardContent, "## Description", [
    "## Acceptance Criteria",
  ]);

  const lines = [
    `Shard ID: ${shard.shardId}`,
    `Module: ${shard.module}`,
    `Story Ref: ${shard.storyRef}`,
    `Priority: ${shard.priority}`,
    `Complexity: ${shard.complexity}`,
    "",
    "Description",
    descriptionBlock || "No description provided.",
    "",
    "Acceptance Criteria",
    acBlock || "No acceptance criteria listed.",
  ];

  return lines.join("\n");
}

function extractSection(content, startHeading, endHeadings = []) {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === startHeading.trim());
  if (start === -1) {
    return "";
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (endHeadings.includes(lines[i].trim())) {
      end = i;
      break;
    }
  }

  return lines
    .slice(start + 1, end)
    .join("\n")
    .trim();
}

function extractChecklistSection(content, startHeading, endHeadings = []) {
  return extractSection(content, startHeading, endHeadings);
}

export function getShardLabels(shard) {
  return [
    `priority:${String(shard.priority).toLowerCase()}`,
    `complexity:${String(shard.complexity).toLowerCase()}`,
    String(shard.module).split(" ")[0],
  ];
}

export function parseIssueNumberFromUrl(url) {
  const match = String(url).match(/\/issues\/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function findStatusOptionId(statusField, targetStatus) {
  if (!statusField?.options?.length) {
    return null;
  }

  const aliases = STATUS_ALIASES[targetStatus] || [targetStatus];
  const aliasSet = new Set(aliases.map((name) => name.toLowerCase()));

  const match = statusField.options.find((option) =>
    aliasSet.has(String(option.name || "").toLowerCase()),
  );
  return match?.id ?? null;
}

/**
 * Finds the iteration ID within an iteration field that matches the given sprint name.
 * Comparison is case-insensitive and trims whitespace.
 * Returns null when the field is absent or no matching iteration exists.
 */
export function findIterationId(iterationField, sprintName) {
  if (!iterationField?.iterations?.length || !sprintName) {
    return null;
  }
  const target = String(sprintName).toLowerCase().trim();
  const match = iterationField.iterations.find(
    (iter) =>
      String(iter.title || "")
        .toLowerCase()
        .trim() === target,
  );
  return match?.id ?? null;
}

/**
 * Sets the Iteration field on a GitHub Projects v2 item.
 * Uses `gh project item-edit --iteration-id` which is distinct from --single-select-option-id.
 */
export function setProjectItemIterationField({
  projectId,
  itemId,
  iterationFieldId,
  iterationId,
  dryRun,
}) {
  runGh(
    [
      "project",
      "item-edit",
      "--id",
      itemId,
      "--project-id",
      projectId,
      "--field-id",
      iterationFieldId,
      "--iteration-id",
      iterationId,
    ],
    { dryRun },
  );
}

export function loadProjectMetadata({ projectNumber, projectOwner }) {
  const viewRaw = runGh(
    [
      "project",
      "view",
      String(projectNumber),
      "--owner",
      projectOwner,
      "--format",
      "json",
    ],
    { dryRun: false },
  );
  const project = JSON.parse(viewRaw);

  const fieldsRaw = runGh(
    [
      "project",
      "field-list",
      String(projectNumber),
      "--owner",
      projectOwner,
      "--format",
      "json",
    ],
    { dryRun: false },
  );
  const fieldsPayload = JSON.parse(fieldsRaw);
  const fields = fieldsPayload.fields ?? [];

  const statusField = fields.find(
    (field) => String(field.name).toLowerCase() === "status",
  );
  if (!statusField) {
    throw new Error("Project does not have a Status field.");
  }

  // Iteration field is optional — gracefully absent when not configured on the project.
  // The GitHub API returns type "ProjectV2IterationField" (not "ITERATION").
  // field-list does not include iteration options, so fetch them via a separate GraphQL call.
  const iterationFieldBase =
    fields.find((field) => field.type === "ProjectV2IterationField") ?? null;

  let iterationField = null;
  if (iterationFieldBase) {
    const gqlQuery = [
      "query($login: String!, $num: Int!) {",
      "  user(login: $login) {",
      "    projectV2(number: $num) {",
      '      field(name: "Iteration") {',
      "        ... on ProjectV2IterationField {",
      "          configuration { iterations { id title startDate duration } }",
      "        }",
      "      }",
      "    }",
      "  }",
      "}",
    ].join(" ");
    const iterRaw = runGh(
      [
        "api",
        "graphql",
        "-f",
        `query=${gqlQuery}`,
        "-f",
        `login=${projectOwner}`,
        "-F",
        `num=${projectNumber}`,
      ],
      { dryRun: false },
    );
    const iterData = JSON.parse(iterRaw);
    const iterConfig = iterData?.data?.user?.projectV2?.field?.configuration;
    iterationField = {
      ...iterationFieldBase,
      iterations: iterConfig?.iterations ?? [],
    };
  }

  // Priority and Complexity are optional single-select fields.
  const priorityField =
    fields.find(
      (field) => String(field.name || "").toLowerCase() === "priority",
    ) ?? null;

  const complexityField =
    fields.find(
      (field) => String(field.name || "").toLowerCase() === "complexity",
    ) ?? null;

  return {
    project,
    statusField,
    iterationField,
    priorityField,
    complexityField,
  };
}

export function issueUrl(repo, issueNumber) {
  return `https://github.com/${repo}/issues/${issueNumber}`;
}

export function listProjectItems({ projectNumber, projectOwner }) {
  const raw = runGh(
    [
      "project",
      "item-list",
      String(projectNumber),
      "--owner",
      projectOwner,
      "--limit",
      "200",
      "--format",
      "json",
    ],
    { dryRun: false },
  );
  const payload = JSON.parse(raw);
  return payload.items ?? [];
}

export function ensureProjectItem({
  projectNumber,
  projectOwner,
  issueUrlValue,
  dryRun,
}) {
  runGh(
    [
      "project",
      "item-add",
      String(projectNumber),
      "--owner",
      projectOwner,
      "--url",
      issueUrlValue,
    ],
    { dryRun },
  );
}

export function setProjectItemStatus({
  projectId,
  itemId,
  statusFieldId,
  optionId,
  dryRun,
}) {
  runGh(
    [
      "project",
      "item-edit",
      "--id",
      itemId,
      "--project-id",
      projectId,
      "--field-id",
      statusFieldId,
      "--single-select-option-id",
      optionId,
    ],
    { dryRun },
  );
}

/** Generic single-select field setter — used for Priority, Complexity, and any other single-select. */
export function setProjectItemSingleSelect({
  projectId,
  itemId,
  fieldId,
  optionId,
  dryRun,
}) {
  runGh(
    [
      "project",
      "item-edit",
      "--id",
      itemId,
      "--project-id",
      projectId,
      "--field-id",
      fieldId,
      "--single-select-option-id",
      optionId,
    ],
    { dryRun },
  );
}

export function getIssueState({ repo, issueNumber, dryRun = false }) {
  if (dryRun) {
    return { state: "OPEN", url: issueUrl(repo, issueNumber) };
  }

  const raw = runGh(
    [
      "issue",
      "view",
      String(issueNumber),
      "--repo",
      repo,
      "--json",
      "state,url,title,number",
    ],
    { dryRun: false },
  );
  return JSON.parse(raw);
}

export function normalizeStatus(status) {
  const current = String(status || "").trim();
  for (const [normalized, aliases] of Object.entries(STATUS_ALIASES)) {
    if (
      aliases.some((alias) => alias.toLowerCase() === current.toLowerCase())
    ) {
      return normalized;
    }
  }
  return current;
}

export function requireShardId(value) {
  if (!SHARD_ID_PATTERN.test(String(value || ""))) {
    throw new Error(
      "Expected a shard ID in format PREFIX-### (for example: REPO-001).",
    );
  }
}
