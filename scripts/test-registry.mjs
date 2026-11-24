#!/usr/bin/env node
/**
 * Generates docs/testing/TEST_REGISTRY.md from the Playwright specs in e2e/specs/.
 *
 * The specs are the source of truth: test IDs live in titles such as
 *   test.describe('T000-T004 Sign-in flows', ...)  -> reserved block
 *   test('T000 anonymous path lands user in app @smoke', ...)
 *
 * Usage:
 *   node scripts/test-registry.mjs          write the registry
 *   node scripts/test-registry.mjs --check  exit 1 if the registry is stale, IDs are duplicated, or reserved ranges overlap
 */
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const specsDir = path.join(repoRoot, "e2e", "specs");
const outPath = path.join(repoRoot, "docs", "testing", "TEST_REGISTRY.md");

/** Hundreds-block per PRD module. Keep in sync with the PRD PREFIX codes. */
const MODULE_RANGES = [
  { prefix: "AUTH", dir: "auth", start: 0, end: 99 },
  { prefix: "AGNT", dir: "agnt", start: 100, end: 199 },
  { prefix: "CHAT", dir: "chat", start: 200, end: 299 },
  { prefix: "ORCH", dir: "orch", start: 300, end: 399 },
  { prefix: "SYNC", dir: "sync", start: 400, end: 499 },
  { prefix: "OPER", dir: "oper", start: 500, end: 599 },
  { prefix: "EDGE", dir: "(any)", start: 900, end: 999 },
];

const TITLE_RE = /\btest(\.describe)?(?:\.(?:only|skip|fixme))?\(\s*(['"`])(T\d{3})(?:-T(\d{3}))?\s+(.*?)\2/g;

function listSpecs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSpecs(full));
    else if (entry.name.endsWith(".spec.ts")) out.push(full);
  }
  return out.sort();
}

const num = (id) => Number(id.slice(1));
const fmt = (n) => `T${String(n).padStart(3, "0")}`;

function collect() {
  const tests = [];
  const blocks = [];
  for (const file of listSpecs(specsDir)) {
    const rel = path.relative(repoRoot, file).split(path.sep).join("/");
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(TITLE_RE)) {
      const [, isDescribe, , startId, endId, rest] = m;
      const line = src.slice(0, m.index).split("\n").length;
      if (isDescribe && endId) {
        blocks.push({ start: num(startId), end: Number(endId), title: rest.trim(), file: rel });
      } else if (!isDescribe) {
        const smoke = /@smoke\b/.test(rest);
        const landscape = /@landscape\b/.test(rest);
        tests.push({
          id: startId,
          n: num(startId),
          title: rest.replace(/\s*@(smoke|landscape)\b/g, "").trim(),
          smoke,
          landscape,
          file: rel,
          line,
        });
      }
    }
  }
  return { tests, blocks };
}

function moduleFor(n) {
  return MODULE_RANGES.find((r) => n >= r.start && n <= r.end);
}

function render({ tests, blocks }) {
  const byId = new Map();
  const duplicates = [];
  for (const t of tests) {
    if (byId.has(t.id)) duplicates.push(t.id);
    else byId.set(t.id, t);
  }

  const lines = [];
  lines.push("# TEST_REGISTRY");
  lines.push("");
  lines.push("> **Generated file. Do not edit by hand.** Regenerate with `npm run test:registry` after adding or renaming tests.");
  lines.push("> Source of truth: the `T###` titles in `e2e/specs/**/*.spec.ts`. Owner: Quinn (QA).");
  lines.push("");
  lines.push("## Conventions");
  lines.push("");
  lines.push("- Group tests in a `test.describe('T###-T### <Area>', …)` block. The range reserves those IDs for that area.");
  lines.push("- Title each test `test('T### should …', …)`. Add `@smoke` to tests that guard a critical path (`npm run test:e2e:smoke`).");
  lines.push("- Layouts: Playwright runs two projects. `portrait` (390x844 phone, the default) runs every test not tagged `@landscape`; `landscape` (1280x800 desktop) runs only `@landscape` tests. Tag the test title `@landscape` when it is about, or depends on, the landscape roundtable or the status bar. Don't set per-test viewports to switch layout.");
  lines.push("- Select elements only with `[data-test-id=\"…\"]`. Reuse the helpers in `e2e/helpers/`.");
  lines.push("- Allocate new IDs from the module's block: use **Next free** below for a new area, or an unused ID inside an existing reserved range.");
  lines.push("- Note `Source: Quinn` in a comment above tests that Quinn authored beyond Eunice's flow diagrams.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Module | Range | Spec folder | Tests | Smoke | Next free | Reserved but unused |");
  lines.push("| :--- | :--- | :--- | ---: | ---: | :--- | :--- |");

  for (const r of MODULE_RANGES) {
    const mod = [...byId.values()].filter((t) => t.n >= r.start && t.n <= r.end);
    const modBlocks = blocks.filter((b) => b.start >= r.start && b.start <= r.end);
    const maxUsed = Math.max(r.start - 1, ...mod.map((t) => t.n), ...modBlocks.map((b) => b.end));
    const next = maxUsed + 1 <= r.end ? fmt(maxUsed + 1) : "block full";
    const unused = [];
    for (const b of modBlocks) {
      for (let i = b.start; i <= b.end; i++) if (!byId.has(fmt(i))) unused.push(fmt(i));
    }
    lines.push(
      `| ${r.prefix} | ${fmt(r.start)}–${fmt(r.end)} | ${r.dir === "(any)" ? "any module folder" : `\`e2e/specs/${r.dir}/\``} | ${mod.length} | ${mod.filter((t) => t.smoke).length} | ${next} | ${compress(unused) || "—"} |`,
    );
  }
  lines.push("");
  lines.push(`**Total:** ${byId.size} tests, ${[...byId.values()].filter((t) => t.smoke).length} tagged \`@smoke\`, ${[...byId.values()].filter((t) => t.landscape).length} tagged \`@landscape\`.`);
  if (duplicates.length) {
    lines.push("");
    lines.push(`**⚠ Duplicate IDs:** ${[...new Set(duplicates)].join(", ")}. Each ID must be unique; renumber before merging.`);
  }
  const sorted = [...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
  const overlaps = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length && sorted[j].start <= sorted[i].end; j++) {
      overlaps.push(`${fmt(sorted[i].start)}–${fmt(sorted[i].end)} "${sorted[i].title}" overlaps ${fmt(sorted[j].start)}–${fmt(sorted[j].end)} "${sorted[j].title}"`);
    }
  }
  if (overlaps.length) {
    lines.push("");
    lines.push(`**⚠ Overlapping reserved ranges:** ${overlaps.join("; ")}. Narrow one block's title range.`);
  }
  const orphans = [...byId.values()].filter((t) => !moduleFor(t.n));
  if (orphans.length) {
    lines.push("");
    lines.push(`**⚠ IDs outside any module range:** ${orphans.map((t) => t.id).join(", ")}.`);
  }

  for (const r of MODULE_RANGES) {
    const mod = [...byId.values()].filter((t) => t.n >= r.start && t.n <= r.end).sort((a, b) => a.n - b.n);
    if (!mod.length) continue;
    lines.push("");
    lines.push(`## ${r.prefix}`);
    lines.push("");
    const modBlocks = blocks.filter((b) => b.start >= r.start && b.start <= r.end).sort((a, b) => a.start - b.start);
    for (const b of modBlocks) {
      lines.push(`### ${fmt(b.start)}–${fmt(b.end)} ${b.title}`);
      lines.push("");
      lines.push("| ID | Test | Smoke | Landscape | Location |");
      lines.push("| :--- | :--- | :---: | :---: | :--- |");
      for (const t of mod.filter((t) => t.n >= b.start && t.n <= b.end)) {
        lines.push(`| ${t.id} | ${escapeCell(t.title)} | ${t.smoke ? "✓" : ""} | ${t.landscape ? "✓" : ""} | \`${t.file}:${t.line}\` |`);
      }
      lines.push("");
    }
    const loose = mod.filter((t) => !modBlocks.some((b) => t.n >= b.start && t.n <= b.end));
    if (loose.length) {
      lines.push("### Ungrouped");
      lines.push("");
      lines.push("| ID | Test | Smoke | Landscape | Location |");
      lines.push("| :--- | :--- | :---: | :---: | :--- |");
      for (const t of loose) lines.push(`| ${t.id} | ${escapeCell(t.title)} | ${t.smoke ? "✓" : ""} | ${t.landscape ? "✓" : ""} | \`${t.file}:${t.line}\` |`);
      lines.push("");
    }
    while (lines[lines.length - 1] === "") lines.pop();
  }
  lines.push("");
  return { text: lines.join("\n"), duplicates, overlaps };
}

function escapeCell(s) {
  return s.replace(/\|/g, "\\|");
}

function compress(ids) {
  if (!ids.length) return "";
  const nums = ids.map(num).sort((a, b) => a - b);
  const parts = [];
  let s = nums[0];
  let p = nums[0];
  for (const n of nums.slice(1).concat([Infinity])) {
    if (n === p + 1) {
      p = n;
      continue;
    }
    parts.push(s === p ? fmt(s) : `${fmt(s)}–${fmt(p)}`);
    s = p = n;
  }
  return parts.join(", ");
}

const { text, duplicates, overlaps } = render(collect());
if (process.argv.includes("--check")) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (current !== text) {
    console.error("TEST_REGISTRY.md is stale. Run: npm run test:registry");
    process.exit(1);
  }
  if (duplicates.length) {
    console.error(`Duplicate test IDs: ${[...new Set(duplicates)].join(", ")}`);
    process.exit(1);
  }
  if (overlaps.length) {
    console.error(`Overlapping test ID ranges:\n  - ${overlaps.join("\n  - ")}`);
    process.exit(1);
  }
  console.log("TEST_REGISTRY.md is up to date.");
} else {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, text);
  console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
}
