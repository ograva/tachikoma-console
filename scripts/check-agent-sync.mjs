#!/usr/bin/env node
/**
 * Keeps the three copies of the cohort agent specs from drifting apart.
 *
 *   .github/agents/<name>.agent.md   full spec, single source of truth (Copilot)
 *   .claude/agents/<name>.md         Claude Code subagent (operating contract)
 *   .cursor/rules/agent-<name>.md    thin Cursor rule that includes the full spec
 *
 * Checks: every agent exists in all three places, the Claude and Cursor files
 * point at the .github spec, the Claude subagent frontmatter is valid, and no
 * file reintroduces a known-stale convention.
 *
 * Usage: node scripts/check-agent-sync.mjs   (exit 1 on any problem)
 */
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const AGENTS = ["mary", "jason", "watson", "eunice", "poe", "quinn", "athena"];

/** Conventions that were removed on purpose. Add a pattern here when you retire one. */
const STALE = [
  [/Tailwind\s*4|tailwind\.config|Material\s*21/i, "Tailwind/Material 21 styling (CONSTRAINTS.md §7: Material + SCSS tokens)"],
  [/e2e\/(admin|user-app|\[app\])\//, "old e2e layout (use e2e/specs/<prefix>/)"],
  [/docs\/base_template/, "docs/base_template (does not exist)"],
  [/MONOREPO[ _]USE[ _]GUIDE/i, "monorepo guide (does not exist)"],
  [/test:e2e:\[app\]/, "test:e2e:[app] (use npm run test:e2e)"],
  [/cohorts -flow\.md/, "old cohorts file name (now cohorts-flow.md)"],
  [/docs\/testing\/(TESTING_STRATEGY|WRITING_TESTS|DATA_TEST_IDS)\.md/, "docs/testing guide that does not exist"],
];

const problems = [];
const read = (rel) => {
  const full = path.join(repoRoot, rel);
  if (!fs.existsSync(full)) {
    problems.push(`missing: ${rel}`);
    return null;
  }
  return fs.readFileSync(full, "utf8");
};

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

for (const name of AGENTS) {
  const spec = `.github/agents/${name}.agent.md`;
  const claude = `.claude/agents/${name}.md`;
  const cursor = `.cursor/rules/agent-${name}.md`;
  const files = { [spec]: read(spec), [claude]: read(claude), [cursor]: read(cursor) };

  const c = files[claude];
  if (c) {
    const fm = frontmatter(c);
    if (!fm) problems.push(`${claude}: missing YAML frontmatter`);
    else {
      if (fm.name !== name) problems.push(`${claude}: frontmatter name is "${fm.name}", expected "${name}"`);
      if (!fm.description) problems.push(`${claude}: frontmatter needs a description`);
    }
    if (!c.includes(spec)) problems.push(`${claude}: does not reference ${spec}`);
  }
  const r = files[cursor];
  if (r && !r.includes(`@${spec}`)) problems.push(`${cursor}: does not include @${spec}`);
  const s = files[spec];
  if (s && !/Cohort position/.test(s)) problems.push(`${spec}: missing the "Cohort position" note`);

  for (const [rel, text] of Object.entries(files)) {
    if (!text) continue;
    text.split("\n").forEach((line, i) => {
      for (const [re, why] of STALE) if (re.test(line)) problems.push(`${rel}:${i + 1}: stale convention: ${why}`);
    });
  }
}

// Agents present in one place but not in the canonical list.
for (const [dir, re] of [
  [".github/agents", /^(.+)\.agent\.md$/],
  [".claude/agents", /^(.+)\.md$/],
  [".cursor/rules", /^agent-(.+)\.md$/],
]) {
  const full = path.join(repoRoot, dir);
  if (!fs.existsSync(full)) continue;
  for (const f of fs.readdirSync(full)) {
    const m = f.match(re);
    if (m && !AGENTS.includes(m[1])) problems.push(`${dir}/${f}: agent "${m[1]}" is not in the cohort list (scripts/check-agent-sync.mjs)`);
  }
}

if (problems.length) {
  console.error(`Agent specs out of sync (${problems.length}):\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`Agent specs in sync: ${AGENTS.length} agents × 3 locations.`);
