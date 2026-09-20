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

/* Track lists live in their own files so a re-capture can overwrite one
   wholesale and `git diff` shows exactly what the playlist lost. */
async function loadTracks(rel) {
  try {
    const doc = parseYaml(await fs.readFile(path.join(ledgerDir, rel), "utf8"));
    return {
      captured: doc.captured
        ? new Date(doc.captured).toISOString().slice(0, 10)
        : null,
      visible: doc.visible ?? (doc.tracks || []).length,
      stated: doc.stated ?? null,
      unaccounted: doc.unaccounted ?? 0,
      list: doc.tracks ?? [],
    };
  } catch (err) {
    problems.push(`tracks_file "${rel}" could not be read: ${err.message}`);
    return null;
  }
}

/* The human half: artist, song, genre, lyric and note, keyed by video id.
   Kept apart from the captured list so a re-capture cannot overwrite it. */
async function loadNotes(rel) {
  try {
    return parseYaml(await fs.readFile(path.join(ledgerDir, rel), "utf8")) ?? {};
  } catch (err) {
    problems.push(`notes_file "${rel}" could not be read: ${err.message}`);
    return {};
  }
}

/*
 * Joins captured tracks to hand-written notes. YouTube's uploader is often a
 * lyric-video reposter rather than the band, so the note's artist wins and the
 * uploader is kept only as provenance.
 */
function joinTracks(tracks, notes) {
  if (!tracks) return null;
  const list = tracks.list.map((t) => {
    const n = notes[t.id] ?? {};
    const artist = n.artist ?? null;
    const song = n.song ?? t.title;
    return {
      id: t.id,
      song,
      artist,
      uploader: t.by || "",
      genre: n.genre ?? null,
      lyric: (n.lyric ?? "").trim(),
      note: (n.note ?? "").trim(),
      // Link out rather than reproduce: full lyrics are not ours to ship.
      lyricsUrl:
        "https://genius.com/search?q=" +
        encodeURIComponent([artist, song].filter(Boolean).join(" ")),
      raw: t.title,
    };
  });

  /* "Who is on it" should count the act, not each credit variant: a featured
     guest, a remixer or a named cast member would otherwise split one artist
     across several rows. The full credit still shows on the track itself. */
  const primary = (a) =>
    a
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s+(ft\.|feat\.)\s+.*$/i, "")
      .replace(/\s+&\s+.*$/, "")
      .trim();

  const tally = (key) => {
    const m = new Map();
    for (const t of list) {
      let v = t[key];
      if (!v) continue;
      if (key === "artist") v = primary(v);
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, n]) => ({ name, n }))
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  };

  const artists = tally("artist");
  const genreOf = new Map();
  for (const t of list) {
    if (!t.artist || !t.genre) continue;
    const k = primary(t.artist);
    if (!genreOf.has(k)) genreOf.set(k, t.genre);
  }

  return {
    ...tracks,
    list,
    artists: artists.map((a) => ({ ...a, genre: genreOf.get(a.name) ?? null })),
    genres: tally("genre"),
    unattributed: list.filter((t) => !t.artist).length,
    withLyric: list.filter((t) => t.lyric).length,
  };
}

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
      // A living collection has no single year; it sorts after everything dated.
      ongoing: Boolean(e.ongoing),
      tracks: e.tracks_file
        ? joinTracks(
            await loadTracks(e.tracks_file),
            e.notes_file ? await loadNotes(e.notes_file) : {},
          )
        : null,
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

entries.sort(
  (a, b) =>
    Number(a.ongoing) - Number(b.ongoing) ||
    (a.year ?? 9999) - (b.year ?? 9999) ||
    a.title.localeCompare(b.title),
);

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
