/* The Shelf — hash-routed, no framework, no build-time templating.
   Three views: boot (the way in), shelf (the way through), entry (the thing
   itself). Data is inlined by scripts/build.mjs, so this runs from a file://
   URL with no server. */
(function () {
  "use strict";

  var DATA = JSON.parse(document.getElementById("ledger").textContent);
  var app = document.getElementById("app");

  /* Platform liveries. The spine wears the colours the thing actually came
     in, which gives the shelf variety without inventing a palette. */
  var LIVERY = {
    "mega drive": ["#171717", "#e8dfcf", "#d2232a"],
    genesis: ["#171717", "#e8dfcf", "#d2232a"],
    dreamcast: ["#eceae4", "#1d1a16", "#f07f13"],
    "master system": ["#1b1b1f", "#e8dfcf", "#2a6ec4"],
    nes: ["#c9c5bb", "#22201c", "#b02020"],
    snes: ["#d5d2cc", "#22201c", "#7b62a8"],
    "game boy": ["#8d9c6b", "#1d2213", "#5a6b45"],
    ps1: ["#2b2f36", "#e8dfcf", "#9aa3ad"],
    ps2: ["#15161a", "#e8dfcf", "#2a4ec4"],
    dos: ["#cfc7b4", "#22201c", "#6d6454"],
    pc: ["#cfc7b4", "#22201c", "#6d6454"],
    arcade: ["#1a1420", "#f0d8a0", "#c9563c"],
    album: ["#2a1f2b", "#efe2d4", "#8e6ba0"],
    cassette: ["#2e2a20", "#e8dfcf", "#b99a57"],
    youtube: ["#1a1413", "#efe2d4", "#c4302b"],
    "cartoon network": ["#141414", "#f2f2f2", "#f2f2f2"],
  };

  function livery(platform) {
    return LIVERY[(platform || "").toLowerCase()] || ["#2a2521", "#e8dfcf", "#a8742a"];
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
    var lines = [
      "the shelf &mdash; personal archive",
      "reading ledger &hellip; " + c.total + " entries",
      "<b>" + c.preserved + " preserved elsewhere</b> &middot; " + c.atRisk + " at risk &middot; <i>" + c.gone + " gone</i>",
      c.gone > 0
        ? "<i>" + c.gone + " of these exist only as the note below</i>"
        : "nothing lost yet",
    ];

    var menu = Object.keys(DATA.kinds)
      .map(function (k) {
        var n = c.byKind[k] || 0;
        var goneN = DATA.entries.filter(function (e) { return e.kind === k && e.status === "gone"; }).length;
        return (
          '<a class="menu__item" href="#/' + k + '">' +
          '<span class="menu__caret">&#9656;</span>' +
          "<span>" + esc(DATA.kinds[k]).toUpperCase() + "</span>" +
          '<span class="menu__count">' + n + "</span>" +
          '<span class="menu__warn">' + (goneN ? goneN + " gone" : "") + "</span>" +
          "</a>"
        );
      })
      .join("");

    return (
      '<section class="boot">' +
      '<h1 class="boot__mark">THE SHELF</h1>' +
      '<p class="boot__sub">Things I grew up with, written down while I still remember them, kept for my kids.</p>' +
      '<div class="boot__lines" aria-live="off">' +
      lines
        .map(function (l, i) {
          return '<p class="boot__line" style="--i:' + i + '">&gt; ' + l + "</p>";
        })
        .join("") +
      "</div>" +
      (years.length ? yearsStrip(years) : "") +
      '<nav class="menu">' + menu + "</nav>" +
      '<a class="menu__item" href="#/all" style="border-top:1px solid var(--rule)">' +
      '<span class="menu__caret">&#9656;</span><span>EVERYTHING, BY YEAR</span>' +
      '<span class="menu__count">' + c.total + '</span><span class="menu__warn"></span></a>' +
      footer() +
      "</section>"
    );
  }

  function yearsStrip(years) {
    var lo = Math.min.apply(null, years);
    var hi = Math.max.apply(null, years);
    var per = {};
    years.forEach(function (y) { per[y] = (per[y] || 0) + 1; });
    var max = Math.max.apply(null, Object.keys(per).map(function (y) { return per[y]; }));
    var bars = "";
    for (var y = lo; y <= hi; y++) {
      var n = per[y] || 0;
      var h = n ? Math.max(6, Math.round((n / max) * 100)) : 0;
      bars +=
        '<span class="years__bar" data-n="' + n + '" style="height:' + h + '%" title="' +
        y + ": " + n + (n === 1 ? " entry" : " entries") + '"></span>';
    }
    return (
      '<div class="years" role="img" aria-label="Entries per year, ' + lo + " to " + hi + '">' +
      bars + "</div>" +
      '<div class="years__axis"><span>' + lo + "</span><span>" + hi + "</span></div>"
    );
  }

  /* ---- shelf ----------------------------------------------------------- */

  function viewShelf(kind) {
    var all = kind === "all" ? DATA.entries : DATA.entries.filter(function (e) { return e.kind === kind; });
    var title = kind === "all" ? "Everything" : DATA.kinds[kind] || kind;

    var years = {};
    all.forEach(function (e) {
      var y = e.year || "undated";
      (years[y] = years[y] || []).push(e);
    });
    var keys = Object.keys(years).sort();

    var nav =
      '<div class="bar"><a href="#/">&#8592; shelf</a>' +
      Object.keys(DATA.kinds)
        .map(function (k) {
          return '<a href="#/' + k + '"' + (k === kind ? ' aria-current="page"' : "") + ">" + esc(DATA.kinds[k]) + "</a>";
        })
        .join("") +
      '<a href="#/all"' + (kind === "all" ? ' aria-current="page"' : "") + ">everything</a>" +
      "<span>" + all.length + (all.length === 1 ? " entry" : " entries") + "</span></div>";

    if (!all.length) {
      return (
        "<section>" + nav +
        '<p class="shelf__empty">Nothing here yet. Add an entry to <code>ledger/' + esc(kind) + ".yml</code>.</p>" +
        footer() + "</section>"
      );
    }

    var body = keys
      .map(function (y) {
        return (
          '<div class="shelf__year">' +
          '<div class="shelf__label">' + esc(y) + "</div>" +
          '<div class="shelf__row">' + years[y].map(spine).join("") + "</div>" +
          "</div>"
        );
      })
      .join("");

    return (
      "<section>" + nav +
      '<h1 class="shelf__title">' + esc(title) + "</h1>" +
      body + footer() + "</section>"
    );
  }

  function spine(e) {
    var lv = livery(e.platform);
    var gone = e.status === "gone";
    return (
      '<a class="spine' + (gone ? " spine--gone" : "") + '" href="#/e/' + encodeURIComponent(e.id) + '"' +
      ' style="--spine-bg:' + lv[0] + ";--spine-fg:" + lv[1] + ";--spine-band:" + lv[2] + '"' +
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
    if (e.mineYear) rec.push(["Mine in", e.mineYear]);
    if (e.region) rec.push(["Region", e.region]);

    var blocks = "";
    blocks += block("What it is", e.what);
    blocks += block("What is great about it", e.great);
    blocks += block("Mine", e.mine, "mine");

    if (e.mentions.length) {
      blocks +=
        '<div class="block"><p class="block__label">Connects to</p><div class="mentions">' +
        e.mentions
          .map(function (m) {
            var t = byId(m);
            return t ? '<a class="chip" href="#/e/' + encodeURIComponent(m) + '">' + esc(t.title) + "</a>" : "";
          })
          .join("") +
        "</div></div>";
    }

    blocks +=
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
      "</div>";

    return (
      '<article class="entry"><a class="back" href="#/' + esc(e.kind) + '">&#8592; ' + esc(e.kindLabel).toLowerCase() + " shelf</a>" +
      '<div class="entry__head"><h1 class="entry__title">' + esc(e.title) + "</h1>" +
      '<dl class="entry__record">' +
      rec.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") +
      "</dl></div>" +
      '<div class="entry__body">' + blocks + "</div>" +
      footer() + "</article>"
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
    var focus = app.querySelector("h1");
    if (focus) {
      focus.setAttribute("tabindex", "-1");
      focus.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", render);
  render();
})();
