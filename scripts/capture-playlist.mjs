#!/usr/bin/env node
/**
 * Captures a YouTube playlist's track list into ledger/tracks/<name>.yml.
 *
 *   node scripts/capture-playlist.mjs <playlist url or id> <name>
 *
 * A playlist's membership decays quietly: videos go private or get removed and
 * the list just gets shorter. Because this writes a plain file, `git diff`
 * after a re-capture tells you exactly which tracks disappeared — which is the
 * whole reason to keep the list as text rather than trusting the link.
 *
 * Re-run it every so often and commit the result even when nothing changed;
 * the unchanged commits are what make a later loss legible.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);

/**
 * Fetched through curl rather than node's fetch: on some networks YouTube
 * refuses node's client outright while curl gets a 200, and curl is present
 * wherever this is likely to run.
 */
async function getHtml(url) {
  const { stdout } = await run(
    "curl",
    ["-sSL", "--compressed", "--max-time", "45", "-A", "Mozilla/5.0",
     "-H", "accept-language: en-US,en;q=0.9", url],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  return stdout;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const argv = process.argv.slice(2);
/* --from <file> re-parses a page saved earlier. YouTube rate-limits repeat
   requests, so a saved page is often the only copy you get on a given day. */
const fromIdx = argv.indexOf("--from");
const fromFile = fromIdx === -1 ? null : argv[fromIdx + 1];
const rest = argv.filter((_, i) => i !== fromIdx && i !== fromIdx + 1);
const [arg, nameArg] = rest;
if (!arg) {
  console.error(
    "usage: node scripts/capture-playlist.mjs <playlist url or id> [name] [--from saved.html]",
  );
  process.exit(1);
}

const id = /^PL|^UU|^LL/.test(arg) ? arg : new URL(arg).searchParams.get("list");
if (!id) {
  console.error("could not find a playlist id in: " + arg);
  process.exit(1);
}

let html;
if (fromFile) {
  html = await fs.readFile(fromFile, "utf8");
} else {
  try {
    html = await getHtml("https://www.youtube.com/playlist?list=" + id);
  } catch (err) {
    console.error("fetch failed: " + (err.stderr || err.message).trim());
    console.error(
      "YouTube rate-limits repeated requests. Save the page in a browser and pass --from <file>.",
    );
    process.exit(1);
  }
}

const m = /var ytInitialData = (\{.*?\});<\/script>/s.exec(html);
if (!m) {
  console.error("no ytInitialData — YouTube changed its markup, or served a consent wall");
  process.exit(1);
}
const data = JSON.parse(m[1]);

const tracks = [];
(function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === "object") {
    if (o.playlistVideoRenderer) {
      const v = o.playlistVideoRenderer;
      tracks.push({
        title: v.title?.runs?.[0]?.text ?? v.title?.simpleText ?? "",
        by: v.shortBylineText?.runs?.[0]?.text ?? "",
        id: v.videoId ?? "",
      });
    }
    Object.values(o).forEach(walk);
  }
})(data);

/* The header's own count. When it exceeds what the page renders, the
   difference is videos YouTube will not serve anonymously — normally private
   or deleted — and that gap is worth recording rather than smoothing over. */
const stated = (() => {
  const s = /"text":\s*"(\d[\d,]*)"\s*\},\s*\{\s*"text":\s*" videos?"/.exec(JSON.stringify(data));
  return s ? Number(s[1].replace(/,/g, "")) : null;
})();

const title =
  data.metadata?.playlistMetadataRenderer?.title ??
  data.header?.playlistHeaderRenderer?.title?.simpleText ??
  id;

const name = nameArg ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const out = path.join(root, "ledger", "tracks", name + ".yml");

const q = (s) => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
const body =
  "# Captured by scripts/capture-playlist.mjs. Re-run it and commit the result;\n" +
  "# `git diff` on this file is the record of what the playlist lost.\n" +
  `playlist: ${q(id)}\n` +
  `title: ${q(title)}\n` +
  `source: "https://www.youtube.com/playlist?list=${id}"\n` +
  `captured: ${new Date().toISOString().slice(0, 10)}\n` +
  `visible: ${tracks.length}\n` +
  (stated != null ? `stated: ${stated}\n` : "") +
  (stated != null && stated > tracks.length
    ? `unaccounted: ${stated - tracks.length} # counted by YouTube but not served anonymously\n`
    : "") +
  "tracks:\n" +
  tracks
    .map((t) => `  - title: ${q(t.title)}\n    by: ${q(t.by)}\n    id: ${q(t.id)}\n`)
    .join("");

let before = null;
try {
  before = await fs.readFile(out, "utf8");
} catch {}

await fs.writeFile(out, body);

console.log(`${title}`);
console.log(`  ${tracks.length} visible${stated != null ? ` of ${stated} stated` : ""}`);
if (stated != null && stated > tracks.length) {
  console.log(`  ${stated - tracks.length} counted but not served anonymously (private or removed)`);
}
console.log(`  -> ledger/tracks/${name}.yml`);

if (before) {
  const ids = (s) => new Set([...s.matchAll(/^    id: "(.*)"$/gm)].map((x) => x[1]));
  const a = ids(before);
  const b = ids(body);
  const lost = [...a].filter((x) => !b.has(x));
  const gained = [...b].filter((x) => !a.has(x));
  const titleOf = (vid) => tracks.find((t) => t.id === vid)?.title ?? vid;
  if (!lost.length && !gained.length) console.log("  no change since the last capture");
  for (const g of gained) console.log("  + " + titleOf(g));
  for (const l of lost) console.log("  - GONE since last capture: " + l);
}
