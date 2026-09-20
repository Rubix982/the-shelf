# Ledger fields

One YAML file per kind under `ledger/`. Every entry is a list item. Only
`title` and `year` are required — an entry with nothing but a title and a
memory is worth more than a complete record with no memory in it.

```yaml
- id: shenmue                 # optional; derived from the title if absent
  title: Shenmue
  year: 1999                  # when it reached you, if that differs, use `mine_year`
  mine_year: 2003             # when *you* encountered it
  platform: Dreamcast         # console, label, channel, network — the carrier
  by: Sega AM2                # studio, artist, creator, host
  region: PAL                 # optional

  # What it is. Factual, the part a database could also tell you.
  what: >
    An open-world adventure set in 1986 Yokosuka, built around a revenge plot
    that mostly gets out of the way of its own daily routine.

  # Why it was good. Your judgement, but arguable — this is criticism.
  great: >
    Shops closed at night and you had to come back tomorrow. The world kept
    its own schedule instead of waiting for you, and almost nothing since has
    been willing to be that patient.

  # Your memory. Nobody else can write this one. It is the reason the ledger
  # exists; everything above is recoverable without you.
  mine: >
    Played it on a borrowed console over one winter.

  # Other things it connects to — sequels, contemporaries, what it led you to.
  mentions: [sonic-2, jet-set-radio]

  # Where it lives now, so the entry stays useful when the link rots.
  where:
    - label: redump.org
      url: https://redump.org
  status: preserved           # preserved | at-risk | gone
  status_note: >
    Widely dumped and emulated; no action needed from me.

  tags: [adventure, open-world, formative]
```

## Living collections

A playlist or a channel you still add to has no single year. Mark it `ongoing`
and it sorts onto its own shelf after everything dated.

```yaml
- title: Music For Good Times ... A Playlist
  platform: YouTube playlist
  ongoing: true
  tracks_file: tracks/music-for-good-times.yml
```

## `tracks_file`

Points at a file under `ledger/tracks/` holding a captured track list. Keep it
separate from the entry for one reason: a re-capture overwrites the whole file,
so `git diff` on it is the record of what the collection lost.

```bash
npm run capture -- "<playlist url>" music-for-good-times
```

Re-run it every so often and **commit the result even when nothing changed** —
the unchanged commits are what make a later loss legible. If YouTube starts
refusing requests, save the page from a browser and pass `--from saved.html`.

The generated file records `visible` against YouTube's own `stated` count. When
they differ, the gap is videos YouTube will not serve anonymously — normally
private or deleted — and it is written down as `unaccounted` rather than
smoothed over.

## `notes_file`

The human half of a collection, keyed by video id, under `ledger/notes/`. The
capture script never touches it, so a re-capture can lose a track without
losing what you wrote about it.

```yaml
ghb6eDopW8I:
  artist: Of Monsters and Men
  song: Little Talks
  genre: indie folk
  lyric: |
    the line that actually gets you
  note: >
    What it is attached to.
```

`artist` and `song` live here rather than being taken from YouTube because
YouTube's data is wrong a third of the time: the uploader is often a
lyric-video reposter, not the band, and the real artist is buried in the video
title. Everything in this file was corrected by hand.

`genre` is a rough bucket for grouping, not a taxonomy. The entry page rolls
these up into "who is on it" and "kinds of music", counting the primary act so
a featured guest or a named cast member does not split one artist across
several rows.

**On lyrics.** `lyric` is for one or two lines, not the whole song. Full
lyrics are not ours to redistribute and a repo full of them is a takedown
waiting to happen, so each track links out instead. The line you choose plus
your `note` on it is the part worth keeping anyway — the full text is a search
away forever, and why it stuck to you is not.

## `status`

The only field that decides what you should actually *do*.

| value | meaning | your job |
| --- | --- | --- |
| `preserved` | Safely held by someone better equipped than you | Record where. Nothing else. |
| `at-risk` | One copy, one uploader, no mirror | Capture it yourself, soon |
| `gone` | No known copy survives | Write the memory down. It is all that is left. |

Default is `at-risk` when omitted, because assuming something is safe is how
it gets lost.

## Notes

- Write the mediocre things down too. An archive of only favourites preserves
  the survivors, not the era, and reads as a complaint about the present.
- `mine` can be one sentence. It does not need to be good. It needs to exist.
