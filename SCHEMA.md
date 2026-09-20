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
