# The Shelf

A ledger of the games, music, television and channels I grew up with, written
down while I still remember them, and kept for my kids.

The point is not the files. Most of the media is already looked after by people
better equipped than me — the Internet Archive, No-Intro, TOSEC, redump. What
is not preserved anywhere, by anyone, is **why any of it mattered to me**. A
database can tell my kids that Shenmue came out in 1999. Only I can tell them
what it felt like that a game gave you a phone number and expected you to call
it.

So this repo holds the annotations, and records where the media lives rather
than holding the media itself.

## Adding something

Open the file for its kind under `ledger/` and add an entry. Only `title` and
`year` are really needed — see [SCHEMA.md](SCHEMA.md) for every field.

```yaml
- title: Shenmue
  year: 1999
  platform: Dreamcast
  what: >
    An open-world adventure set in 1986 Yokosuka.
  great: >
    Shops closed at night and you had to come back tomorrow.
  mine: >
    Played it on a borrowed console over one winter.
  status: preserved
```

Then:

```bash
npm install     # once
npm run build   # regenerates docs/index.html
open docs/index.html
```

An entry with nothing but a title and a `mine` is worth more than a complete
record with no memory in it. Write the memory first; the release year can be
looked up forever, and your memory cannot.

## Capturing a playlist

```bash
npm run capture -- "https://www.youtube.com/playlist?list=..." a-short-name
npm run build
```

That writes `ledger/tracks/a-short-name.yml`, which an entry points at with
`tracks_file:`. Re-run it now and then and commit the result even when nothing
changed — a playlist loses entries quietly, and the diff on that file is the
only way to find out which ones. The first capture of my own music playlist
already showed YouTube counting 100 videos while serving 99.

## Why the site is one file

`npm run build` renders the whole thing — markup, styles, script and data — into
a single `docs/index.html`. No server, no fetch, no runtime dependencies. Open
it from a disk in 2050 and it still works. That is deliberate, so please don't
split it back into separate assets.

The YAML stays the source of truth: if Node ever stops running, `ledger/` is
still plain readable text.

## Conventions worth keeping

- **Write the mediocre things down too.** An archive of only favourites
  preserves the survivors, not the era — and it reads as a complaint about the
  present rather than a record of the past.
- **`status` is the only field that tells you to do something.** `preserved`
  means note where it lives and move on. `at-risk` means capture it yourself,
  soon. `gone` means the entry is now the only thing left, so make it good.
  Omitting it defaults to `at-risk`, because assuming a thing is safe is how it
  gets lost.
- **YouTube is the urgent category.** Games have dedicated communities and will
  be fine without you. Channels vanish permanently and usually without notice.
  If you only do one capture pass, do that one — `yt-dlp` into cold storage.

## Layout

```
ledger/          the archive, one YAML file per kind — the real artifact
src/             template, styles, script
scripts/build.mjs   ledger + src -> docs/index.html
docs/            built output; GitHub Pages serves this
```
