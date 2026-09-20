#!/usr/bin/env node
/**
 * Renders ledger/*.yml into docs/index.html.
 *
 * The output is one self-contained file: markup, styles, script and data all
 * inlined. No server, no fetch, no dependencies at read time — open it from a
 * disk in 2050 and it still works. That is the whole point of the format
 * choice, so resist the urge to split it back out.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml } from "js-yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledgerDir = path.join(root, "ledger");
const srcDir = path.join(root, "src");
const outDir = path.join(root, "docs");

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const KINDS = { games: "Games", music: "Music", television: "Television", youtube: "YouTube" };

const files = (await fs.readdir(ledgerDir)).filter((f) => /\.ya?ml$/.test(f));
const entries = [];
const problems = [];

for (const file of files) {
  const kind = file.replace(/\.ya?ml$/, "");
  const raw = parseYaml(await fs.readFile(path.join(ledgerDir, file), "utf8"));
  if (!Array.isArray(raw)) {
    problems.push(`${file}: expected a list of entries`);
    continue;
  }
  for (const e of raw) {
    if (!e?.title) {
      problems.push(`${file}: an entry has no title`);
      continue;
    }
    entries.push({
      id: e.id ?? slug(e.title),
      kind,
      kindLabel: KINDS[kind] ?? kind,
      title: e.title,
      year: e.year ?? null,
      mineYear: e.mine_year ?? null,
      platform: e.platform ?? "",
      by: e.by ?? "",
      region: e.region ?? "",
      what: (e.what ?? "").trim(),
      great: (e.great ?? "").trim(),
      mine: (e.mine ?? "").trim(),
      mentions: e.mentions ?? [],
      where: e.where ?? [],
      // Absent means at-risk: assuming a thing is safe is how it gets lost.
      status: e.status ?? "at-risk",
      statusNote: (e.status_note ?? "").trim(),
      tags: e.tags ?? [],
    });
  }
}

const ids = new Set();
for (const e of entries) {
  if (ids.has(e.id)) problems.push(`duplicate id: ${e.id}`);
  ids.add(e.id);
}
for (const e of entries) {
  for (const m of e.mentions) {
    if (!ids.has(m)) problems.push(`${e.id} mentions "${m}", which does not exist`);
  }
}

entries.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title));

const counts = {
  total: entries.length,
  preserved: entries.filter((e) => e.status === "preserved").length,
  atRisk: entries.filter((e) => e.status === "at-risk").length,
  gone: entries.filter((e) => e.status === "gone").length,
  byKind: Object.fromEntries(
    Object.keys(KINDS).map((k) => [k, entries.filter((e) => e.kind === k).length]),
  ),
};

const data = { entries, counts, kinds: KINDS, built: new Date().toISOString().slice(0, 10) };

const [template, css, js] = await Promise.all([
  fs.readFile(path.join(srcDir, "index.html"), "utf8"),
  fs.readFile(path.join(srcDir, "style.css"), "utf8"),
  fs.readFile(path.join(srcDir, "app.js"), "utf8"),
]);

const html = template
  .replace("/*{{CSS}}*/", () => css)
  .replace("/*{{DATA}}*/", () => JSON.stringify(data))
  .replace("/*{{JS}}*/", () => js);

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, "index.html"), html);
await fs.writeFile(path.join(outDir, ".nojekyll"), "");
await fs.writeFile(path.join(outDir, "ledger.json"), JSON.stringify(data, null, 2));

const years = entries.map((e) => e.year).filter(Boolean);
console.log(
  `${entries.length} entries (${counts.preserved} preserved, ${counts.atRisk} at risk, ${counts.gone} gone)` +
    (years.length ? ` spanning ${Math.min(...years)}–${Math.max(...years)}` : ""),
);
if (problems.length) {
  console.warn("\nproblems:");
  for (const p of problems) console.warn("  " + p);
}
