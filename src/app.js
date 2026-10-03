/* The Shelf — hash-routed, no framework, no build-time templating.
   Three views: boot (the way in), shelf (the way through), entry (the thing
   itself). Data is inlined by scripts/build.mjs, so this runs from a file://
   URL with no server. */
(function () {
  "use strict";

  var DATA = JSON.parse(document.getElementById("ledger").textContent);
  var app = document.getElementById("app");

  /* Platform liveries. The spine wears the colours the thing actually came
     in, which gives the shelf variety without inventing a palette. A platform
     with no livery of its own takes a bookcloth colour picked from its id, so
     the same entry always gets the same spine. */
  var LIVERY = {
    "mega drive": ["#171717", "#e8dfcf", "#d2232a"],
    genesis: ["#171717", "#e8dfcf", "#d2232a"],
    dreamcast: ["#eceae4", "#1d1a16", "#f07f13"],
    "master system": ["#1b1b1f", "#e8dfcf", "#2a6ec4"],
    nes: ["#c9c5bb", "#22201c", "#b02020"],
    snes: ["#d5d2cc", "#22201c", "#7b62a8"],
    "game boy": ["#8d9c6b", "#1d2213", "#5a6b45"],
    "nintendo ds": ["#d9d7d1", "#1d1a16", "#c8102e"],
    psp: ["#101114", "#e8dfcf", "#4a6fa5"],
    ps1: ["#2b2f36", "#e8dfcf", "#9aa3ad"],
    ps2: ["#15161a", "#e8dfcf", "#2a4ec4"],
    dos: ["#cfc7b4", "#22201c", "#6d6454"],
    arcade: ["#1a1420", "#f0d8a0", "#c9563c"],
    album: ["#2a1f2b", "#efe2d4", "#8e6ba0"],
    cassette: ["#2e2a20", "#e8dfcf", "#b99a57"],
    youtube: ["#1a1413", "#efe2d4", "#c4302b"],
    "cartoon network": ["#141414", "#f2f2f2", "#f2f2f2"],
    nickelodeon: ["#e8701a", "#1d1a16", "#fbe3c8"],
    "disney channel": ["#1d3d8f", "#eef1fa", "#8fb4ff"],
    ptv: ["#123d2b", "#eae3cf", "#d4b24c"],
    "hum tv": ["#4e1640", "#f2e4ec", "#e0a33a"],
    "ary digital": ["#6e1518", "#f4e3dc", "#e6b04a"],
    "geo tv": ["#1f232b", "#eceae4", "#e43b2c"],
    netflix: ["#141414", "#efe2d4", "#e50914"],
    hbo: ["#161616", "#ecebe6", "#b9b9b9"],
    "hbo max": ["#1a1240", "#ece8fb", "#7b5cff"],
    facebook: ["#2d4373", "#f2f4f8", "#8b9dc3"],
    "web browser (flash)": ["#3a1414", "#f2e2d4", "#e8452c"],
    "nokia phones": ["#1e2a3a", "#dfe7ef", "#5d87b5"],
  };

  var CLOTH = [
    ["#2a2521", "#e8dfcf", "#a8742a"],
    ["#4a2622", "#f0e0d6", "#d9a441"],
    ["#1f2f33", "#e3ebe6", "#6fae8f"],
    ["#2f2638", "#ece2f0", "#a58cc8"],
    ["#e2d6bf", "#22201c", "#8a5a2b"],
    ["#22344a", "#e6edf2", "#7ea6cf"],
    ["#4a3020", "#f0dfd2", "#e08a4b"],
    ["#2c3524", "#e8eedf", "#a3b96f"],
    ["#d9cdb5", "#2a2219", "#a8432f"],
    ["#3a2a2e", "#f1e3e6", "#c98a95"],
  ];

  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function livery(e) {
    var p = (e.platform || "").toLowerCase();
    if (LIVERY[p]) return LIVERY[p];
    /* "Disney Channel / ABC" wears Disney's colours. */
    var first = p.split(/\s*[\/,]\s*/)[0];
    if (LIVERY[first]) return LIVERY[first];
    return CLOTH[hash(e.id) % CLOTH.length];
  }

  /* A picture linked from Wikipedia. If the link has rotted, or the page is
     opened offline, the image removes itself and the spine stands alone. */
  function picture(e, cls) {
    if (!e.picture) return "";
    return (
      '<img class="' + cls + '" src="' + esc(e.picture.src) + '" alt="" loading="lazy" ' +
      'referrerpolicy="no-referrer" onerror="this.remove()">'
    );
  }

  function wikiUrl(page) {
    return "https://en.wikipedia.org/wiki/" + encodeURIComponent(page.replace(/ /g, "_"));
  }

  /* A memory counts once it is more than the placeholder prompt, which always
     opens with a dash. */
  function written(e) {
    var m = (e.mine || "").trim();
    return !!m && m.charAt(0) !== "—";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function byId(id) {
    for (var i = 0; i < DATA.entries.length; i++) {
      if (DATA.entries[i].id === id) return DATA.entries[i];
    }
    return null;
  }

  var STATUS_WORD = { preserved: "preserved elsewhere", "at-risk": "at risk", gone: "gone" };

  /* ---- boot ------------------------------------------------------------ */

  function viewBoot() {
    var c = DATA.counts;
    var years = DATA.entries.map(function (e) { return e.year; }).filter(Boolean);
    var nWritten = DATA.entries.filter(written).length;
    var lines = [
      "the shelf &mdash; personal archive",
      "reading ledger &hellip; " + c.total + " entries, " + nWritten + " with a memory written down",
      "<b>" + c.preserved + " preserved elsewhere</b> &middot; " + c.atRisk + " at risk &middot; <i>" + c.gone + " gone</i>",
      c.gone > 0
        ? "<i>" + c.gone + " of these exist only as the note below</i>"
        : "nothing lost yet",
    ];

    var menu = Object.keys(DATA.kinds)
      .map(function (k) {
        var list = DATA.entries.filter(function (e) { return e.kind === k; });
        var goneN = list.filter(function (e) { return e.status === "gone"; }).length;
        return menuItem("#/" + k, DATA.kinds[k].toUpperCase(), list, goneN ? goneN + " gone" : "");
      })
      .join("");

    return (
      '<section class="boot">' +
      '<div class="boot__top"><div>' +
      '<h1 class="boot__mark">THE SHELF</h1>' +
      '<p class="boot__sub">Things I grew up with, written down while I still remember them, kept for my kids.</p>' +
      '<div class="boot__lines" aria-live="off">' +
      lines
        .map(function (l, i) {
          return '<p class="boot__line" style="--i:' + i + '">&gt; ' + l + "</p>";
        })
        .join("") +
      "</div></div>" +
      '<div class="memories" id="memories">' + memories() + "</div>" +
      "</div>" +
      (years.length ? yearsStrip(years) : "") +
      '<nav class="menu">' + menu +
      menuItem("#/all", "EVERYTHING", DATA.entries, "by year") +
      "</nav>" +
      footer() +
      "</section>"
    );
  }

  /* Each shelf on the menu shows its own spines in miniature, so the way in
     already looks like what it leads to. */
  function menuItem(href, label, list, warn) {
    var sorted = list.slice().sort(function (a, b) { return (a.year || 9999) - (b.year || 9999); });
    var cap = 34;
    var minis = sorted
      .slice(0, cap)
      .map(function (e) {
        var lv = livery(e);
        var h = 55 + (hash(e.id) % 45);
        return (
          '<span class="mini' + (e.status === "gone" ? " mini--gone" : "") + '" style="--spine-bg:' + lv[0] +
          ";--spine-band:" + lv[2] + ";height:" + h + '%"></span>'
        );
      })
      .join("");
    return (
      '<a class="menu__item" href="' + href + '">' +
      '<span class="menu__caret">&#9656;</span>' +
      '<span class="menu__label">' + esc(label) + "</span>" +
      '<span class="menu__minis" aria-hidden="true">' + minis +
      (list.length > cap ? '<span class="menu__more">+' + (list.length - cap) + "</span>" : "") +
      "</span>" +
      '<span class="menu__count">' + list.length + "</span>" +
      '<span class="menu__warn">' + esc(warn) + "</span>" +
      "</a>"
    );
  }

  /* Three memories, pulled at random. The ledger exists for these, so the
     front page should show some instead of only counting them. */
  function memories() {
    /* Prefer memories with something in them over the one-liners, and never
       show the same sentence twice — several entries share "Watched it on TV." */
    var seen = {};
    var all = DATA.entries.filter(function (e) {
      if (!written(e) || seen[e.mine]) return false;
      seen[e.mine] = true;
      return true;
    });
    var rich = all.filter(function (e) { return e.mine.length >= 70; });
    var pool = rich.length >= 6 ? rich : all;
    if (!pool.length) return "";
    var pick = [];
    while (pick.length < Math.min(3, pool.length)) {
      var e = pool[Math.floor(Math.random() * pool.length)];
      if (pick.indexOf(e) === -1) pick.push(e);
    }
    return (
      '<p class="memories__label">from the ledger <button type="button" class="memories__again" data-again>another three &#8635;</button></p>' +
      pick
        .map(function (e) {
          var lv = livery(e);
          return (
            '<a class="memory" href="#/e/' + encodeURIComponent(e.id) + '" style="--spine-band:' + lv[2] + '">' +
            picture(e, "memory__pic") +
            '<span class="memory__text">' + esc(e.mine) + "</span>" +
            '<span class="memory__src">' + esc(e.title) + (e.year ? " &middot; " + e.year : "") +
            " &middot; " + esc(e.kindLabel.toLowerCase()) + "</span>" +
            "</a>"
          );
        })
        .join("")
    );
  }

  function yearsStrip(years) {
    /* A few very old things (a dastan from 1883, Holmes from 1887) would
       stretch the axis until the decades that hold almost everything are a
       sliver. Start where the run of years becomes continuous and mention the
       outliers instead. */
    var sorted = years.slice().sort(function (a, b) { return a - b; });
    var start = 0;
    for (var i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] > 12) start = i + 1;
    }
    if (start > sorted.length / 4) start = 0;
    var early = sorted.slice(0, start);
    var lo = sorted[start];
    var hi = sorted[sorted.length - 1];
    var per = {};
    sorted.slice(start).forEach(function (y) { per[y] = (per[y] || 0) + 1; });
    var max = Math.max.apply(null, Object.keys(per).map(function (y) { return per[y]; }));
    var bars = "";
    for (var y = lo; y <= hi; y++) {
      var n = per[y] || 0;
      var h = n ? Math.max(8, Math.round((n / max) * 100)) : 0;
      bars +=
        '<span class="years__bar" data-n="' + n + '" style="height:' + h + '%" title="' +
        y + ": " + n + (n === 1 ? " entry" : " entries") + '"></span>';
    }
    var span = hi - lo + 1;
    var ticks = "";
    for (var d = Math.ceil(lo / 10) * 10; d <= hi; d += 10) {
      ticks += '<span style="left:' + ((d - lo + 0.5) / span) * 100 + '%">' + d + "</span>";
    }
    return (
      '<div class="years" role="img" aria-label="Entries per year, ' + lo + " to " + hi + '">' +
      bars + "</div>" +
      '<div class="years__axis">' + ticks + "</div>" +
      (early.length
        ? '<p class="years__early">+ ' + early.length + " older, " + early[0] + "&ndash;" + early[early.length - 1] + "</p>"
        : '<p class="years__early"></p>')
    );
  }

  /* ---- shelf ----------------------------------------------------------- */

  function viewShelf(kind) {
    var all = kind === "all" ? DATA.entries : DATA.entries.filter(function (e) { return e.kind === kind; });
    var title = kind === "all" ? "Everything" : DATA.kinds[kind] || kind;

    var years = {};
    all.forEach(function (e) {
      var y = e.ongoing ? "ongoing" : e.year || "undated";
      (years[y] = years[y] || []).push(e);
    });
    /* Dated shelves in order, then the things still being added to. */
    var keys = Object.keys(years).sort(function (a, b) {
      var rank = function (k) { return k === "ongoing" ? 2 : k === "undated" ? 1 : 0; };
      return rank(a) - rank(b) || String(a).localeCompare(String(b));
    });

    var nav =
      '<div class="bar"><a href="#/">&#8592; shelf</a>' +
      Object.keys(DATA.kinds)
        .map(function (k) {
          return '<a href="#/' + k + '"' + (k === kind ? ' aria-current="page"' : "") + ">" + esc(DATA.kinds[k]) + "</a>";
        })
        .join("") +
      '<a href="#/all"' + (kind === "all" ? ' aria-current="page"' : "") + ">everything</a></div>";

    if (!all.length) {
      return (
        "<section>" + nav +
        '<p class="shelf__empty">Nothing here yet. Add an entry to <code>ledger/' + esc(kind) + ".yml</code>.</p>" +
        footer() + "</section>"
      );
    }

    var n = { preserved: 0, "at-risk": 0, gone: 0 };
    all.forEach(function (e) { n[e.status] = (n[e.status] || 0) + 1; });
    var nWritten = all.filter(written).length;

    /* Years flow along one continuous run of shelving instead of taking a
       full-width row each, so a year with two things on it costs two spines
       of space, not a screen. */
    var run = keys
      .map(function (y) {
        return (
          '<div class="group">' +
          '<div class="group__books">' + years[y].map(spine).join("") + "</div>" +
          '<div class="group__plate">' + esc(y) + "</div>" +
          "</div>"
        );
      })
      .join("");

    return (
      '<section class="shelf">' + nav +
      '<div class="shelf__head"><h1 class="shelf__title">' + esc(title) + "</h1>" +
      '<p class="shelf__stats">' +
      "<span>" + all.length + (all.length === 1 ? " entry" : " entries") + "</span>" +
      '<span class="k k--preserved">' + n.preserved + " preserved elsewhere</span>" +
      '<span class="k k--at-risk">' + n["at-risk"] + " at risk</span>" +
      (n.gone ? '<span class="k k--gone">' + n.gone + " gone</span>" : "") +
      "<span>" + nWritten + " remembered</span>" +
      "</p></div>" +
      '<div class="run">' + run + "</div>" +
      '<div class="readout" id="readout" aria-live="polite">' + readoutIdle(all.length, nWritten) + "</div>" +
      footer() + "</section>"
    );
  }

  function readoutIdle(total, nWritten) {
    return (
      '<p class="readout__idle">&gt; point at a spine to read it &middot; dashed spines are gone, ' +
      "an amber mark means at risk &middot; " + nWritten + " of " + total + " remembered</p>"
    );
  }

  function readout(e) {
    var mine = written(e) ? e.mine : "";
    if (mine.length > 220) mine = mine.slice(0, 217).replace(/\s+\S*$/, "") + "…";
    return (
      picture(e, "readout__pic") +
      '<div class="readout__words">' +
      '<p class="readout__title"><b>' + esc(e.title) + "</b>" +
      (e.year ? " &middot; " + e.year : "") +
      (e.platform ? " &middot; " + esc(e.platform) : "") +
      ' <span class="k k--' + esc(e.status) + '">' + esc(STATUS_WORD[e.status] || e.status) + "</span></p>" +
      (mine
        ? '<p class="readout__mine">' + esc(mine) + "</p>"
        : '<p class="readout__mine readout__mine--empty">not remembered yet</p>') +
      "</div>"
    );
  }

  function spine(e) {
    var lv = livery(e);
    var gone = e.status === "gone";
    var risk = e.status === "at-risk";
    /* Height follows the title, so fewer of them are cut off, and the width
       varies a little, as real spines do. */
    var h = Math.min(13.5, Math.max(8.5, 3.2 + e.title.length * 0.42));
    var w = [2.25, 2.5, 2.75][hash(e.id) % 3];
    return (
      '<a class="spine' + (gone ? " spine--gone" : "") + (risk ? " spine--risk" : "") +
      '" href="#/e/' + encodeURIComponent(e.id) + '" data-id="' + esc(e.id) + '"' +
      ' style="--spine-bg:' + lv[0] + ";--spine-fg:" + lv[1] + ";--spine-band:" + lv[2] +
      ";height:" + h.toFixed(2) + "rem;width:" + w + 'rem"' +
      ' title="' + esc(e.title) + (e.year ? " (" + e.year + ")" : "") + (gone ? " — gone" : "") + '">' +
      '<span class="spine__text">' + esc(e.title) + "</span>" +
      (e.year ? '<span class="spine__year">' + e.year + "</span>" : "") +
      "</a>"
    );
  }

  /* ---- entry ----------------------------------------------------------- */

  function viewEntry(id) {
    var e = byId(id);
    if (!e) {
      return '<section><a class="back" href="#/">&#8592; the shelf</a><p class="shelf__empty">No entry "' + esc(id) + '".</p></section>';
    }

    var rec = [["Kind", e.kindLabel]];
    if (e.platform) rec.push(["On", e.platform]);
    if (e.by) rec.push(["By", e.by]);
    if (e.year) rec.push(["Released", e.year]);
    if (e.ongoing) rec.push(["Status", "still adding to it"]);
    if (e.mineYear) rec.push(["Mine in", e.mineYear]);
    if (e.region) rec.push(["Region", e.region]);

    var blocks = "";
    blocks += block("What it is", e.what);
    blocks += block("What is great about it", e.great);
    blocks += block("Mine", e.mine, "mine");
    blocks += tracksBlock(e);

    /* The side column: the thing itself as a spine, how safe it is, and what
       sits near it — so the page reads as one object pulled off a shelf of
       others, not a column of text beside an empty margin. */
    var spineBox =
      (e.picture
        ? '<figure class="pic">' + picture(e, "pic__img") +
          '<figcaption>picture via <a href="' + esc(wikiUrl(e.picture.page || e.title)) +
          '" target="_blank" rel="noreferrer">Wikipedia</a></figcaption></figure>'
        : "") +
      '<div class="entry__spine" aria-hidden="true">' + spine(e) + "</div>";
    var side = "";

    if (e.mentions.length) {
      side +=
        '<div class="block"><p class="block__label">Connects to</p><div class="mentions">' +
        e.mentions
          .map(function (m) {
            var t = byId(m);
            return t ? '<a class="chip" href="#/e/' + encodeURIComponent(m) + '">' + esc(t.title) + "</a>" : "";
          })
          .join("") +
        "</div></div>";
    }

    var sameYear = e.year
      ? DATA.entries
          .filter(function (x) { return x.year === e.year && x.id !== e.id; })
          /* Same kind first: another game from 2005 is the closer neighbour. */
          .sort(function (a, b) { return (a.kind !== e.kind) - (b.kind !== e.kind); })
          .slice(0, 10)
      : [];
    if (sameYear.length) {
      side +=
        '<div class="block"><p class="block__label">Also from ' + e.year + "</p><div class=\"mentions\">" +
        sameYear
          .map(function (x) {
            return '<a class="chip" href="#/e/' + encodeURIComponent(x.id) + '">' + esc(x.title) + "</a>";
          })
          .join("") +
        "</div></div>";
    }

    side =
      '<div class="block"><p class="block__label">Preservation</p>' +
      '<p class="status status--' + esc(e.status) + '">' + esc(STATUS_WORD[e.status] || e.status) + "</p>" +
      (e.statusNote ? "<p>" + esc(e.statusNote) + "</p>" : "") +
      (e.where.length
        ? '<ul class="where">' +
          e.where
            .map(function (w) {
              return "<li>" + (w.url ? '<a href="' + esc(w.url) + '" target="_blank" rel="noreferrer">' + esc(w.label || w.url) + "</a>" : esc(w.label)) + "</li>";
            })
            .join("") +
          "</ul>"
        : "") +
      "</div>" + side;
    side = spineBox + side;

    return (
      '<article class="entry"><a class="back" href="#/' + esc(e.kind) + '">&#8592; ' + esc(e.kindLabel).toLowerCase() + " shelf</a>" +
      '<div class="entry__head"><h1 class="entry__title">' + esc(e.title) + "</h1>" +
      '<dl class="entry__record">' +
      rec.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") +
      "</dl></div>" +
      '<div class="entry__layout"><div class="entry__body">' + blocks + "</div>" +
      '<aside class="entry__side">' + side + "</aside></div>" +
      footer() + "</article>"
    );
  }

  /* The captured track list. Long on purpose — it is the preservation
     artifact, not a nicety — so it is folded behind a summary that carries the
     numbers that matter. */
  function tracksBlock(e) {
    var t = e.tracks;
    if (!t || !t.list.length) return "";
    var missing = t.stated && t.stated > t.visible ? t.stated - t.visible : 0;

    /* Who is on it, before what is on it. A hundred rows of titles tells you
       nothing about the shape of a playlist; a dozen acts and their genres
       tells you most of it at a glance. */
    var acts = t.artists
      .map(function (a) {
        return (
          '<li class="act"><span class="act__n">' + a.n + "</span>" +
          '<span class="act__name">' + esc(a.name) + "</span>" +
          '<span class="act__genre">' + esc(a.genre || "") + "</span></li>"
        );
      })
      .join("");

    var genres = t.genres
      .map(function (g) {
        return '<li class="gen"><span class="gen__n">' + g.n + "</span>" + esc(g.name) + "</li>";
      })
      .join("");

    var rows = t.list
      .map(function (x, i) {
        var head =
          '<span class="track__t">' +
          '<a href="https://www.youtube.com/watch?v=' + esc(x.id) + '" target="_blank" rel="noreferrer">' +
          esc(x.song) + "</a></span>";
        var meta =
          '<span class="track__by">' +
          (x.artist ? esc(x.artist) : '<i class="track__unknown">artist not identified</i>') +
          (x.genre ? ' <span class="track__genre">' + esc(x.genre) + "</span>" : "") +
          "</span>";
        var words = "";
        if (x.lyric) {
          words += '<blockquote class="track__lyric">' + esc(x.lyric) + "</blockquote>";
        }
        if (x.note) {
          words += '<p class="track__note">' + esc(x.note) + "</p>";
        }
        if (!x.lyric && !x.note) {
          words +=
            '<p class="track__todo"><a href="' + esc(x.lyricsUrl) +
            '" target="_blank" rel="noreferrer">lyrics</a></p>';
        }
        return (
          '<li class="track"><span class="track__n">' + (i + 1) + "</span>" +
          "<span>" + head + meta + words + "</span></li>"
        );
      })
      .join("");

    return (
      '<div class="block"><p class="block__label">Who is on it</p>' +
      '<ul class="acts">' + acts + "</ul>" +
      '<p class="block__label" style="margin-top:2rem">Kinds of music</p>' +
      '<ul class="gens">' + genres + "</ul>" +
      (t.unattributed
        ? '<p class="tracks__missing">' + t.unattributed +
          " track(s) whose artist I could not identify &mdash; they are marked in the list.</p>"
        : "") +
      "</div>" +
      '<div class="block"><p class="block__label">Track list</p>' +
      '<details class="tracks"><summary class="tracks__sum">' +
      t.visible + " tracks &middot; " + t.withLyric + " with a line written down &middot; captured " +
      esc(t.captured || "") +
      (missing
        ? ' <span class="tracks__missing">&middot; ' + missing +
          " counted by YouTube but not shown, so already private or removed</span>"
        : "") +
      "</summary>" +
      '<ol class="tracks__list">' + rows + "</ol>" +
      "</details></div>"
    );
  }

  function block(label, text, kind) {
    var empty = !text;
    var cls = "block" + (kind ? " block--" + kind : "") + (empty ? " block--empty" : "");
    var body = empty
      ? kind === "mine"
        ? "Not written yet. This is the part nobody else can add."
        : "&mdash;"
      : esc(text);
    return '<div class="' + cls + '"><p class="block__label">' + esc(label) + "</p><p>" + body + "</p></div>";
  }

  function footer() {
    return (
      '<p class="foot">' + DATA.counts.total + " entries &middot; last built " + esc(DATA.built) +
      " &middot; the ledger is plain text in <code>ledger/</code></p>"
    );
  }

  /* ---- router ---------------------------------------------------------- */

  function render() {
    var h = (location.hash || "#/").replace(/^#\/?/, "");
    var out;
    if (!h) out = viewBoot();
    else if (h.indexOf("e/") === 0) out = viewEntry(decodeURIComponent(h.slice(2)));
    else if (h === "all" || DATA.kinds[h]) out = viewShelf(h);
    else out = viewBoot();
    app.innerHTML = out;
    wire();
    var focus = app.querySelector("h1");
    if (focus) {
      focus.setAttribute("tabindex", "-1");
      focus.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }

  /* Behaviour for the freshly rendered view: the shelf's readout line and
     the front page's reshuffle. Delegated, so it survives re-renders. */
  function wire() {
    var out = document.getElementById("readout");
    if (out) {
      var idle = out.innerHTML;
      var show = function (ev) {
        var s = ev.target.closest && ev.target.closest(".spine");
        if (!s) return;
        var e = byId(s.getAttribute("data-id"));
        if (e) out.innerHTML = readout(e);
      };
      var run = app.querySelector(".run");
      run.addEventListener("mouseover", show);
      run.addEventListener("focusin", show);
      run.addEventListener("mouseleave", function () { out.innerHTML = idle; });
    }
    var again = app.querySelector("[data-again]");
    if (again) {
      again.addEventListener("click", function () {
        document.getElementById("memories").innerHTML = memories();
        wire();
      });
    }
  }

  window.addEventListener("hashchange", render);
  render();
})();
