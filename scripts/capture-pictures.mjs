#!/usr/bin/env node
/**
 * Finds a picture for each ledger entry on Wikipedia and records it in
 * ledger/pictures.yml, keyed by entry id.
 *
 *   npm run pictures            # fill in entries that have no line yet
 *   npm run pictures -- --all   # re-search everything not pinned
 *
 * The site links to these pictures rather than holding them: cover art is not
 * ours to redistribute, the same reason full lyrics are kept out. The cost is
 * that a picture can rot; the page falls back to the spine when one does.
 *
 * Wikipedia is used for the picture and a link back, never for facts. The
 * real risk is a wrong match — "Dark" landing on a disambiguation page, "Up"
 * on the word — so every match is written down with the page it came from
 * and Wikipedia's own one-line description, for a person to check. To fix
 * one by hand, set `page:` and add `pinned: true`; to say there is no good
 * picture, set `picture: none` and pin it. Pinned lines are never touched.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml, dump as dumpYaml } from "js-yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledgerDir = path.join(root, "ledger");
const outPath = path.join(ledgerDir, "pictures.yml");
const all = process.argv.includes("--all");

const UA = "the-shelf/1.0 (personal archive; https://github.com/Rubix982/the-shelf)";
const API = "https://en.wikipedia.org/w/api.php";

/* What to add to the search, and words a right answer's description tends
   to contain. */
const HINT = {
  games: ["video game", /video game|game|mmo|series/i],
  movies: ["film", /film|movie|series/i],
  television: ["television series", /series|television|tv|drama|sitcom|cartoon|anime|show|cup|tournament|cricket|wrestling|advert|cricketer/i],
  music: ["", /band|singer|rapper|musician|duo|group|composer|qawwal|show|series/i],
  books: ["", /novel|book|series|character|writer|author|stories|fiction/i],
  youtube: ["YouTube", /youtube|youtuber|channel|web series|comedian|internet|video|personality|company/i],
  internet: ["", /website|service|software|messaging|network|social|platform/i],
};

const STOP = new Set(["the", "a", "an", "of", "and", "to", "in", "on", "for"]);
const words = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));

async function api(params) {
  const url = API + "?" + new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw new Error("Wikipedia did not answer: " + url);
}

/* Search, then score the top few: shares the entry's words, is not a
   disambiguation page, has a picture, and describes the right kind of thing
   or the right year. */
async function find(e) {
  const bare = e.title.replace(/\s*\(.*?\)\s*/g, " ").trim();
  const [hint, kindRe] = HINT[e.kind] || ["", /./];
  const queries = [`${bare} ${hint}`.trim(), e.year ? `${bare} ${e.year}` : null, bare].filter(Boolean);
  const want = words(bare);
  let best = null;

  for (const q of [...new Set(queries)]) {
    const r = await api({
      action: "query",
      generator: "search",
      gsrsearch: q,
      gsrlimit: "6",
      prop: "pageimages|description|pageprops",
      piprop: "thumbnail",
      pilicense: "any",
      pithumbsize: "400",
      ppprop: "disambiguation",
    });
    for (const p of r.query?.pages ?? []) {
      if (p.pageprops && "disambiguation" in p.pageprops) continue;
      const have = new Set(words(p.title));
      const overlap = want.filter((w) => have.has(w)).length / Math.max(1, want.length);
      if (overlap < 0.6) continue;
      const desc = p.description || "";
      let score = overlap * 4 - (p.index ?? 0) * 0.3;
      if (kindRe.test(desc)) score += 2;
      if (e.year && desc.includes(String(e.year))) score += 2;
      if (!p.thumbnail) score -= 3;
      if (!best || score > best.score) best = { score, page: p.title, desc, picture: p.thumbnail?.source ?? null };
    }
    if (best && best.score >= 5 && best.picture) break;
  }
  return best;
}

const entries = [];
for (const f of (await fs.readdir(ledgerDir)).filter((f) => /\.ya?ml$/.test(f) && f !== "pictures.yml")) {
  const doc = parseYaml(await fs.readFile(path.join(ledgerDir, f), "utf8"));
  if (!Array.isArray(doc)) continue;
  const kind = f.replace(/\.ya?ml$/, "");
  for (const e of doc) {
    if (!e?.title) continue;
    const id = e.id ?? e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    entries.push({ ...e, id, kind });
  }
}

let existing = {};
try {
  existing = parseYaml(await fs.readFile(outPath, "utf8")) ?? {};
} catch {}

const out = { ...existing };
let found = 0, weak = 0, none = 0;
for (const e of entries) {
  const cur = existing[e.id];
  if (cur?.pinned) continue;
  if (cur && !all) continue;
  const hit = await find(e);
  if (hit?.picture && hit.score >= 5) {
    out[e.id] = { page: hit.page, about: hit.desc || null, picture: hit.picture };
    found++;
  } else if (hit?.picture) {
    /* Written down, but marked: a person should look before it is trusted. */
    out[e.id] = { page: hit.page, about: hit.desc || null, picture: hit.picture, check: true };
    weak++;
  } else {
    out[e.id] = { page: hit?.page ?? null, picture: "none" };
    none++;
  }
  process.stdout.write(".");
  await new Promise((r) => setTimeout(r, 120));
}

const ordered = Object.fromEntries(entries.filter((e) => out[e.id]).map((e) => [e.id, out[e.id]]));
const header =
  "# Pictures for ledger entries, linked from Wikipedia — not stored here.\n" +
  "# Written by `npm run pictures`; check `page` and `about` before trusting a line.\n" +
  "# `check: true` means the match was weak. Fix one by hand by setting `page` and\n" +
  "# `picture`, or `picture: none`, and adding `pinned: true` so a re-run leaves it.\n\n";
await fs.writeFile(outPath, header + dumpYaml(ordered, { lineWidth: 120 }));
console.log(`\n${found} matched, ${weak} weak (marked check), ${none} without a picture`);
