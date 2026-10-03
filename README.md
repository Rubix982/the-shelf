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

## Pictures

```bash
npm run pictures
```

Finds each new entry on Wikipedia and writes the match to
`ledger/pictures.yml`: the page it came from, Wikipedia's one-line
description of that page, and the picture's address. The site links to the
picture rather than storing it — cover art is not ours to redistribute — so
offline, or once a link rots, the entry simply shows its spine instead.

Check every new line before trusting it. Wikipedia is only used for the
picture, but the search guesses wrong often enough to matter: the first run
matched *Dark* to *His Dark Materials* and Strings to an American bluegrass
player. Fix a line by setting `page` and `picture` (or `picture: none`) and
keep `pinned: true` on it, so a re-run never touches it again.

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

## Artists, genres, and lyrics

A captured track list is thin on its own: YouTube gives you a title and an
uploader, and the uploader is frequently a lyric-video channel rather than the
band. So each collection has a companion file under `ledger/notes/`, keyed by
video id, holding the corrected artist, the song, a genre, one or two lines of
lyric, and your note on them. The entry page rolls that up into who is on it
and what kinds of music are on it, which is what you actually want to see
before a hundred rows of titles.

Full lyrics are deliberately not stored — they are not ours to redistribute,
and each track links out for the rest. One line you chose plus a sentence on
why is worth more here than the complete text, which is a search away forever.

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
