/* =============================================================
   with a WISH — C案 Digital Salon「接客ルックブック」 script.js
   依存: ../assets/data.js (WW)
   ============================================================= */
(function () {
  "use strict";
  if (typeof WW === "undefined") return; // データ未読込時は静的表示のまま

  document.documentElement.classList.add("js");

  /* ---------- helpers ---------- */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* プライベートモード等 */ } }
  };

  var products = WW.products;
  var byCode = {};
  products.forEach(function (p) { byCode[p.code] = p; });

  function prodName(p) { return p.colorName || WW.colorNames[p.color] || p.type; }
  var TYPE_JA = {
    "TUXEDO": "タキシード", "LONG TUXEDO": "ロングタキシード",
    "TUNIC TUXEDO": "タニックタキシード", "LONG TUNIC TUXEDO": "ロングタニックタキシード",
    "MORNING COAT": "モーニングコート", "FROCK COAT": "フロックコート",
    "SHORT FROCK COAT": "ショートフロックコート", "GENTLY COAT": "ジェントリーコート",
    "TAIL COAT": "燕尾服"
  };
  function garmentJa(p) { return TYPE_JA[p.type] || "タキシード"; }
  function prodAlt(p) { return "No." + p.code + " " + prodName(p) + "の" + garmentJa(p); }
  function lusterJa(v) { return { 1: "マット〜控えめな艶", 2: "ほどよい艶", 3: "艶やか" }[v] || ""; }

  /* =============================================================
     1) 色の特集 — 横スクロールの章
     ============================================================= */
  var CHAPTER_META = {
    1: { en: "Noir", lead: "夜の静けさをまとう、正統のブラック。" },
    2: { en: "Blanc", lead: "光を集めて、誓いの白をまとう。" },
    3: { en: "Champagne", lead: "祝杯のように、やわらかく煌めくベージュとゴールド。" },
    4: { en: "Orchid", lead: "甘さをひとさじ、大人の遊び心を胸元に。" },
    5: { en: "Midnight", lead: "群青の深みに、知性と誠実を宿して。" },
    6: { en: "Argent", lead: "静かな光沢が、横顔をいちばん美しく見せる。" },
    7: { en: "Olive", lead: "森の気配をまとう、成熟のグリーン。" },
    8: { en: "Terra", lead: "大地の温もりを、頼れる背中に。" },
    9: { en: "Soleil", lead: "陽だまりの色で、祝福の一日を。" }
  };
  var ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

  function chapterPicks(list) {
    var featured = list.filter(function (p) { return p.featured; });
    var rest = list.filter(function (p) { return !p.featured; });
    return featured.concat(rest).slice(0, 4);
  }

  function buildChapters() {
    var wrap = $("#chapters");
    if (!wrap) return;
    for (var c = 1; c <= 9; c++) {
      var list = products.filter(function (p) { return p.color === c; });
      if (!list.length) continue;
      var meta = CHAPTER_META[c];
      var looks = el("div", { class: "chapter-looks" });
      chapterPicks(list).forEach(function (p) {
        var btn = el("button", {
          type: "button", class: "look-thumb", "data-code": p.code, "data-context": "color:" + c,
          "aria-label": "No." + p.code + " " + prodName(p) + " をプレゼンモードで見る"
        }, [
          el("img", { src: WW.img(p), alt: "", width: "642", height: "900", loading: "lazy" }),
          el("span", { class: "thumb-code", "aria-hidden": "true", text: "No." + p.code })
        ]);
        looks.appendChild(btn);
      });
      wrap.appendChild(el("article", { class: "chapter", "aria-label": WW.colorNames[c] + "の章" }, [
        el("div", { class: "chapter-head" }, [
          el("p", { class: "chapter-roman", text: "CHAPTER " + ROMAN[c] + " — COLOR" }),
          el("h3", { class: "chapter-en", text: meta.en }),
          el("p", { class: "chapter-ja" }, [
            el("span", { class: "chapter-chip", style: "background:" + WW.colorChips[c], "aria-hidden": "true" }),
            el("span", { text: WW.colorNames[c] })
          ]),
          el("p", { class: "chapter-lead", text: meta.lead }),
          el("p", { class: "chapter-count", text: list.length + " STYLE" + (list.length > 1 ? "S" : "") }),
          el("button", {
            type: "button", class: "chapter-see-all no-print", "data-see-color": String(c),
            text: "この色の " + list.length + " 着をすべて見る →"
          })
        ]),
        looks
      ]));
    }
    var prev = $("[data-ch-prev]"), next = $("[data-ch-next]");
    function page(dir) { wrap.scrollBy({ left: dir * wrap.clientWidth * 0.85, behavior: reduceMotion ? "auto" : "smooth" }); }
    if (prev) prev.addEventListener("click", function () { page(-1); });
    if (next) next.addEventListener("click", function () { page(1); });
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); page(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); page(-1); }
    });
    function syncBtns() {
      if (!prev || !next) return;
      prev.disabled = wrap.scrollLeft <= 4;
      next.disabled = wrap.scrollLeft >= wrap.scrollWidth - wrap.clientWidth - 4;
    }
    wrap.addEventListener("scroll", function () { window.requestAnimationFrame(syncBtns); }, { passive: true });
    syncBtns();
  }

  /* =============================================================
     2) ルックブック本体 — 全125型グリッド + フィルタ
     ============================================================= */
  /* 種類の目次 — タイプ9種を接客で使う4グループに束ねる */
  var TYPE_GROUPS = [
    { ja: "タキシード", lead: "新郎の一着、正統のタキシード。", match: { "TUXEDO": 1, "LONG TUXEDO": 1 } },
    { ja: "タニックタキシード", lead: "詰襟がつくる、凛としたモダン。", match: { "TUNIC TUXEDO": 1, "LONG TUNIC TUXEDO": 1 } },
    { ja: "モーニング・フロック", note: "お父様の正礼装", lead: "お父様の正礼装。両家の格を静かに整える。", match: { "MORNING COAT": 1, "FROCK COAT": 1, "SHORT FROCK COAT": 1, "GENTLY COAT": 1 } },
    { ja: "燕尾服", lead: "夜の最上級、テールコート。", match: { "TAIL COAT": 1 } }
  ];
  var filterState = { type: 0, color: 0, line: 0 };
  var currentList = products.slice();
  var grid = $("#look-grid");

  function matchesState(p, state) {
    if (state.type && !TYPE_GROUPS[state.type - 1].match[p.type]) return false;
    if (state.color && p.color !== state.color) return false;
    if (state.line && p.line !== state.line) return false;
    return true;
  }
  /* 他の絞り込みと組み合わせた場合の件数（0件の選択肢は無効化して行き止まりを防ぐ） */
  function countWith(kind, v) {
    var s = { type: filterState.type, color: filterState.color, line: filterState.line };
    s[kind] = v;
    var n = 0;
    products.forEach(function (p) { if (matchesState(p, s)) n++; });
    return n;
  }

  function cardNode(p) {
    var fig = el("figure", { class: "look-card" + (p.featured ? " is-featured" : "") }, [
      el("button", {
        type: "button", class: "card-link", "data-code": p.code, "data-context": "grid",
        "aria-label": "No." + p.code + " " + prodName(p) + " をプレゼンモードで開く"
      }, [el("img", { src: WW.img(p), alt: prodAlt(p), width: "642", height: "900", loading: "lazy" })]),
      el("figcaption", {}, [
        el("span", { class: "card-code", text: "No." + p.code }),
        el("span", { class: "card-name", text: prodName(p) }),
        p.type !== "TUXEDO" ? el("span", { class: "card-type", text: garmentJa(p) }) : null
      ]),
      favStar(p.code, "fav-star")
    ]);
    return fig;
  }

  function favStar(code, cls) {
    return el("button", {
      type: "button", class: cls, "data-fav-code": code,
      "aria-pressed": favs.has(code) ? "true" : "false",
      "aria-label": "No." + code + " を取寄せメモに入れる", html: "&#9733;"
    });
  }

  function applyFilter() {
    currentList = products.filter(function (p) { return matchesState(p, filterState); });
    grid.textContent = "";
    var frag = document.createDocumentFragment();
    currentList.forEach(function (p) { frag.appendChild(cardNode(p)); });
    grid.appendChild(frag);
    var countEl = $("[data-grid-count]");
    if (countEl) countEl.textContent = String(currentList.length);
    var empty = $("[data-grid-empty]");
    if (empty) empty.hidden = currentList.length > 0;
    updateActiveUI();
  }

  /* 現在地バー（SELECTED）と誌面見出し */
  function updateActiveUI() {
    var bar = $("[data-active-bar]"), tags = $("[data-active-tags]"),
        count = $("[data-active-count]"), ctx = $("[data-context-head]");
    if (!bar) return;
    var parts = [];
    if (filterState.type) parts.push({ kind: "type", label: TYPE_GROUPS[filterState.type - 1].ja });
    if (filterState.color) parts.push({ kind: "color", label: WW.colorNames[filterState.color], chip: WW.colorChips[filterState.color] });
    if (filterState.line) parts.push({ kind: "line", label: WW.lineNames[filterState.line] });
    bar.hidden = parts.length === 0;
    if (tags) {
      tags.textContent = "";
      parts.forEach(function (part) {
        var tag = el("button", {
          type: "button", class: "active-tag",
          "aria-label": part.label + " の絞り込みを外す"
        }, [
          part.chip ? el("span", { class: "chip-dot", style: "background:" + part.chip, "aria-hidden": "true" }) : null,
          el("span", { text: part.label }),
          el("span", { class: "tag-x", "aria-hidden": "true", text: "×" })
        ]);
        tag.addEventListener("click", function () { filterState[part.kind] = 0; refreshFilters(); });
        tags.appendChild(tag);
      });
    }
    if (count) count.textContent = parts.length ? currentList.length + " 着" : "";
    if (ctx) {
      var meta = filterState.color ? CHAPTER_META[filterState.color] : null;
      var group = !meta && filterState.type ? TYPE_GROUPS[filterState.type - 1] : null;
      ctx.hidden = !meta && !group;
      ctx.textContent = "";
      if (meta) {
        ctx.appendChild(el("span", { class: "context-en", text: meta.en }));
        ctx.appendChild(el("span", { class: "context-lead", text: meta.lead }));
      } else if (group) {
        ctx.appendChild(el("span", { class: "context-en", text: group.ja }));
        ctx.appendChild(el("span", { class: "context-lead", text: group.lead }));
      }
    }
  }

  var refreshFilters = function () {};

  function buildFilters() {
    var filters = $("#filters");
    if (!filters) return;
    filters.hidden = false;
    var typeWrap = $("[data-filter-types]"), colorWrap = $("[data-filter-colors]"), lineWrap = $("[data-filter-lines]");

    function onPick(kind, v) {
      return function () { filterState[kind] = (filterState[kind] === v) ? 0 : v; renderAll(); };
    }
    function countEl2(n) {
      return el("span", { class: "opt-count", "aria-hidden": "true", text: String(n) });
    }

    function renderTypes() {
      typeWrap.textContent = "";
      var all = el("button", { type: "button", class: "type-tab", "aria-pressed": filterState.type === 0 ? "true" : "false" }, [
        el("span", { class: "t-ja", text: "すべて" }), countEl2(countWith("type", 0))
      ]);
      all.addEventListener("click", function () { filterState.type = 0; renderAll(); });
      typeWrap.appendChild(all);
      TYPE_GROUPS.forEach(function (g, i) {
        var v = i + 1, n = countWith("type", v);
        var tab = el("button", {
          type: "button", class: "type-tab", "aria-pressed": filterState.type === v ? "true" : "false"
        }, [
          el("span", { class: "t-ja", text: g.ja }),
          countEl2(n),
          g.note ? el("span", { class: "t-note", text: g.note }) : null
        ]);
        if (!n && filterState.type !== v) { tab.disabled = true; tab.setAttribute("aria-disabled", "true"); }
        else tab.addEventListener("click", onPick("type", v));
        typeWrap.appendChild(tab);
      });
    }

    function renderColors() {
      colorWrap.textContent = "";
      var all = el("button", { type: "button", class: "swatch", "aria-pressed": filterState.color === 0 ? "true" : "false" }, [
        el("span", { text: "すべて" }), countEl2(countWith("color", 0))
      ]);
      all.addEventListener("click", function () { filterState.color = 0; renderAll(); });
      colorWrap.appendChild(all);
      Object.keys(WW.colorNames).forEach(function (key) {
        var v = Number(key), n = countWith("color", v);
        var sw = el("button", { type: "button", class: "swatch", "aria-pressed": filterState.color === v ? "true" : "false" }, [
          el("span", { class: "swatch-dot", style: "background:" + WW.colorChips[key], "aria-hidden": "true" }),
          el("span", { text: WW.colorNames[key] }),
          countEl2(n)
        ]);
        if (!n && filterState.color !== v) { sw.disabled = true; sw.setAttribute("aria-disabled", "true"); }
        else sw.addEventListener("click", onPick("color", v));
        colorWrap.appendChild(sw);
      });
    }

    function renderLines() {
      lineWrap.textContent = "";
      var all = el("button", { type: "button", class: "f-chip", "aria-pressed": filterState.line === 0 ? "true" : "false" }, [
        el("span", { text: "すべて" }), countEl2(countWith("line", 0))
      ]);
      all.addEventListener("click", function () { filterState.line = 0; renderAll(); });
      lineWrap.appendChild(all);
      Object.keys(WW.lineNames).forEach(function (key) {
        var v = Number(key);
        var total = products.filter(function (p) { return p.line === v; }).length;
        if (!total) return; // 展開ゼロのライン(J-LINE)は目次に載せない
        var n = countWith("line", v);
        var chip = el("button", { type: "button", class: "f-chip", "aria-pressed": filterState.line === v ? "true" : "false" }, [
          el("span", { text: WW.lineNames[key] }), countEl2(n)
        ]);
        if (!n && filterState.line !== v) { chip.disabled = true; chip.setAttribute("aria-disabled", "true"); }
        else chip.addEventListener("click", onPick("line", v));
        lineWrap.appendChild(chip);
      });
    }

    function renderAll() { renderTypes(); renderColors(); renderLines(); applyFilter(); }
    refreshFilters = renderAll;
    renderAll();
    $$("[data-filter-reset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterState.type = 0; filterState.color = 0; filterState.line = 0; renderAll();
      });
    });

    /* 色の特集 → ルックブックへ絞り込みジャンプ */
    $$("[data-see-color]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterState.type = 0; filterState.line = 0;
        filterState.color = Number(btn.getAttribute("data-see-color"));
        renderAll();
        var heading = $("#lookbook-heading");
        if (heading) {
          heading.focus({ preventScroll: true });
          heading.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
      });
    });
  }

  /* =============================================================
     3) お気に入り → 取寄せメモ（localStorage）
     ============================================================= */
  var FAV_KEY = "ww-c-salon-favorites";
  var favs = new Set((store.get(FAV_KEY) || []).filter(function (c) { return byCode[c]; }));

  function toggleFav(code) {
    if (favs.has(code)) favs.delete(code); else favs.add(code);
    store.set(FAV_KEY, Array.from(favs));
    syncFavUI(code);
  }

  function syncFavUI(code) {
    $$("[data-fav-code]").forEach(function (btn) {
      if (!code || btn.getAttribute("data-fav-code") === code) {
        btn.setAttribute("aria-pressed", favs.has(btn.getAttribute("data-fav-code")) ? "true" : "false");
      }
    });
    var n = favs.size;
    $$("[data-fav-count]").forEach(function (elm) { elm.textContent = String(n); elm.hidden = n === 0; });
    var fab = $("[data-fab]");
    if (fab) fab.hidden = n === 0;
    if (fab) fab.setAttribute("aria-label", "取寄せメモを見る（" + n + "件）");
    renderMemo();
  }

  function renderMemo() {
    var list = $("[data-memo-list]"), emptyMsg = $("[data-memo-empty]"), actions = $("[data-memo-actions]");
    if (!list) return;
    list.textContent = "";
    var has = favs.size > 0;
    emptyMsg.hidden = has;
    actions.hidden = !has;
    if (!has) { $("[data-memo-form]").hidden = true; return; }
    favs.forEach(function (code) {
      var p = byCode[code];
      list.appendChild(el("li", {}, [
        el("button", {
          type: "button", class: "memo-thumb card-link", "data-code": code, "data-context": "memo",
          "aria-label": "No." + code + " をプレゼンモードで見る"
        }, [el("img", { src: WW.img(p), alt: "", width: "642", height: "900", loading: "lazy" })]),
        el("div", {}, [
          el("span", { class: "memo-item-code", text: "No." + code }),
          el("span", { class: "memo-item-name", text: prodName(p) }),
          el("span", { class: "memo-item-meta", text: p.type + (p.line ? " — " + WW.lineNames[p.line] : "") })
        ]),
        el("button", { type: "button", class: "memo-remove no-print", "data-fav-code": code, "aria-label": "No." + code + " をメモから外す", text: "外す" })
      ]));
    });
  }

  function initMemo() {
    var dateEl = $("[data-memo-date]");
    if (dateEl) {
      var d = new Date();
      dateEl.textContent = d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate();
    }
    var copied = $("[data-memo-copied]"), copiedTimer = null;
    $("[data-memo-copy]").addEventListener("click", function () {
      var text = Array.from(favs).map(function (c) { return "No." + c + " " + prodName(byCode[c]); }).join("\n");
      function done() {
        copied.hidden = false;
        if (copiedTimer) clearTimeout(copiedTimer);
        copiedTimer = setTimeout(function () { copied.hidden = true; }, 2600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
    function fallbackCopy(text) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) { /* no-op */ }
      document.body.removeChild(ta);
    }
    $("[data-memo-print]").addEventListener("click", function () { window.print(); });
    $("[data-memo-clear]").addEventListener("click", function () {
      favs.clear(); store.set(FAV_KEY, []); syncFavUI();
    });
    var form = $("[data-memo-form]"), doneBox = $("[data-memo-done]");
    $("[data-memo-consult]").addEventListener("click", function () {
      doneBox.hidden = true; form.hidden = false;
      $("#memo-shop").focus();
    });
    $("[data-memo-cancel]").addEventListener("click", function () { form.hidden = true; });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      ["memo-shop", "memo-person"].forEach(function (id) {
        var input = document.getElementById(id);
        var valid = input.value.trim().length > 0;
        setFieldError(input, !valid);
        if (!valid && ok) { input.focus(); ok = false; }
      });
      if (!ok) return;
      form.hidden = true; form.reset(); doneBox.hidden = false;
    });
  }

  function setFieldError(input, hasError) {
    var field = input.closest(".field");
    var msg = $('[data-error-for="' + input.id + '"]');
    if (field) field.classList.toggle("has-error", hasError);
    if (msg) msg.hidden = !hasError;
    input.setAttribute("aria-invalid", hasError ? "true" : "false");
  }

  /* =============================================================
     4) シグネチャー: プレゼンモード
     ============================================================= */
  var presenter = $("#presenter");
  var stage = $("[data-pres-stage]");
  var pres = { list: [], idx: 0, compare: false, lockIdx: 0, view: null, lastFocus: null, open: false };
  var inertTargets = ["#main", ".colophon", ".utility-bar", "[data-fab]"];

  function contextList(ctx) {
    if (!ctx) return currentList.slice();
    if (ctx === "grid") return currentList.slice();
    if (ctx === "memo") return Array.from(favs).map(function (c) { return byCode[c]; });
    var m = /^color:(\d)$/.exec(ctx);
    if (m) { var c = Number(m[1]); return products.filter(function (p) { return p.color === c; }); }
    return currentList.slice();
  }

  function openPresenter(list, idx, trigger) {
    if (!list.length) return;
    pres.list = list; pres.idx = idx < 0 ? 0 : idx;
    pres.compare = false; pres.view = null; pres.lastFocus = trigger || document.activeElement;
    pres.open = true;
    presenter.classList.remove("is-compare");
    $("[data-pres-compare]").setAttribute("aria-pressed", "false");
    presenter.hidden = false;
    document.body.style.overflow = "hidden";
    inertTargets.forEach(function (s) { var t = $(s); if (t) t.setAttribute("inert", ""); });
    if (!reduceMotion) {
      presenter.classList.add("is-opening");
      window.requestAnimationFrame(function () {
        presenter.classList.remove("is-opening");
        presenter.classList.add("is-open");
      });
    }
    renderPresenter(false);
    $("[data-pres-close]").focus();
  }

  function closePresenter() {
    pres.open = false;
    presenter.hidden = true;
    presenter.classList.remove("is-open", "is-compare");
    document.body.style.overflow = "";
    inertTargets.forEach(function (s) { var t = $(s); if (t) t.removeAttribute("inert"); });
    if (pres.lastFocus && document.contains(pres.lastFocus)) pres.lastFocus.focus();
  }

  function specRow(dt, dd, cls) {
    return el("div", { class: cls || "" }, [el("dt", { text: dt }), el("dd", { text: dd })]);
  }

  function slotNode(p, opts) {
    var slot = el("div", { class: "pres-slot" + (opts.anim && !reduceMotion ? " is-anim" : "") });
    var photo = el("div", { class: "pres-photo" }, [
      el("img", { src: WW.img(p, opts.locked ? null : pres.view), alt: prodAlt(p), width: "642", height: "900", loading: "lazy" })
    ]);
    if (!pres.compare && p.extras && p.extras.length) {
      var views = el("div", { class: "pres-views", role: "group", "aria-label": "別カットを見る" });
      [null].concat(p.extras).forEach(function (ex, i) {
        views.appendChild(el("button", {
          type: "button", class: "pres-view", "data-view": ex === null ? "" : ex,
          "aria-pressed": (pres.view || "") === (ex || "") ? "true" : "false",
          "aria-label": "カット" + (i + 1) + "を表示"
        }, [el("img", { src: WW.img(p, ex), alt: "", width: "642", height: "900", loading: "lazy" })]));
      });
      photo.appendChild(views);
    }
    var info = el("div", { class: "pres-info" });
    if (pres.compare) {
      info.appendChild(el("p", { class: "pres-lock", text: opts.locked ? "LOOK A — 基準の一着" : "LOOK B — ←→で入れ替え" }));
    } else {
      info.appendChild(el("p", { class: "pres-nombre", text: "LOOK " + (pres.idx + 1) + " — with a WISH LOOKBOOK" }));
    }
    info.appendChild(el("p", { class: "pres-code", text: "No." + p.code }));
    info.appendChild(el("p", { class: "pres-name", text: prodName(p) }));
    info.appendChild(el("p", { class: "pres-type", text: p.type }));
    info.appendChild(el("button", {
      type: "button", class: "pres-fav", "data-fav-code": p.code,
      "aria-pressed": favs.has(p.code) ? "true" : "false",
      "aria-label": "No." + p.code + " を取寄せメモに入れる"
    }, [
      el("span", { class: "star-inline", "aria-hidden": "true", html: "&#9733;" }),
      el("span", { text: "取寄せメモ" })
    ]));
    var specs = el("dl", { class: "pres-specs" });
    if (p.material) specs.appendChild(specRow("素材", p.material));
    if (p.size) specs.appendChild(specRow("サイズ", p.size));
    if (p.line) specs.appendChild(specRow("ライン", WW.lineNames[p.line]));
    if (!pres.compare) {
      if (p.luster) specs.appendChild(specRow("光沢", lusterJa(p.luster)));
      specs.appendChild(specRow("色系統", WW.colorNames[p.color]));
    }
    info.appendChild(specs);
    if (!pres.compare && p.desc) {
      var desc = el("div", { class: "pres-desc" });
      p.desc.split(/\n+/).slice(0, 2).forEach(function (t) { desc.appendChild(el("p", { text: t })); });
      info.appendChild(desc);
    }
    if (!pres.compare && p.brand) {
      info.appendChild(el("p", { class: "pres-brandnote", text: p.brand.split(/\n+/)[0] }));
    }
    slot.appendChild(photo);
    slot.appendChild(info);
    return slot;
  }

  function renderPresenter(anim) {
    var counter = $("[data-pres-counter]");
    stage.textContent = "";
    if (pres.compare) {
      var a = pres.list[pres.lockIdx], b = pres.list[pres.idx];
      counter.textContent = "COMPARE — No." + a.code + " × No." + b.code;
      stage.appendChild(slotNode(a, { locked: true }));
      stage.appendChild(slotNode(b, { anim: anim }));
    } else {
      counter.textContent = (pres.idx + 1) + " / " + pres.list.length;
      stage.appendChild(slotNode(pres.list[pres.idx], { anim: anim }));
    }
  }

  function presNav(dir) {
    var len = pres.list.length;
    if (len < 2) return;
    pres.idx = (pres.idx + dir + len) % len;
    if (pres.compare && pres.idx === pres.lockIdx) pres.idx = (pres.idx + dir + len) % len;
    pres.view = null;
    renderPresenter(true);
  }

  function initPresenter() {
    $("[data-pres-close]").addEventListener("click", closePresenter);
    $("[data-pres-prev]").addEventListener("click", function () { presNav(-1); });
    $("[data-pres-next]").addEventListener("click", function () { presNav(1); });
    $("[data-pres-compare]").addEventListener("click", function () {
      pres.compare = !pres.compare;
      this.setAttribute("aria-pressed", pres.compare ? "true" : "false");
      presenter.classList.toggle("is-compare", pres.compare);
      if (pres.compare) {
        pres.lockIdx = pres.idx;
        pres.idx = pres.list.length > 1 ? (pres.idx + 1) % pres.list.length : pres.idx;
      } else {
        pres.idx = pres.lockIdx;
      }
      pres.view = null;
      renderPresenter(false);
    });

    stage.addEventListener("click", function (e) {
      var viewBtn = e.target.closest("[data-view]");
      if (viewBtn) {
        pres.view = viewBtn.getAttribute("data-view") || null;
        var img = viewBtn.closest(".pres-photo").querySelector(":scope > img");
        img.src = WW.img(pres.list[pres.compare ? pres.idx : pres.idx], pres.view);
        $$("[data-view]", viewBtn.parentElement).forEach(function (b) {
          b.setAttribute("aria-pressed", b === viewBtn ? "true" : "false");
        });
      }
    });

    // スワイプ（横）
    var sw = null;
    stage.addEventListener("pointerdown", function (e) { sw = { x: e.clientX, y: e.clientY }; }, { passive: true });
    stage.addEventListener("pointerup", function (e) {
      if (!sw) return;
      var dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      sw = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) presNav(dx < 0 ? 1 : -1);
    }, { passive: true });

    document.addEventListener("keydown", function (e) {
      if (!pres.open) return;
      if (e.key === "Escape") { e.preventDefault(); closePresenter(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); presNav(1); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); presNav(-1); return; }
      if (e.key === "Tab") {
        var focusables = $$("button, [href]", presenter).filter(function (b) { return !b.disabled && b.offsetParent !== null; });
        if (!focusables.length) return;
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* =============================================================
     5) クリック委譲（カード / サムネ / お気に入り）
     ============================================================= */
  function initDelegation() {
    document.addEventListener("click", function (e) {
      var fav = e.target.closest("[data-fav-code]");
      if (fav) { toggleFav(fav.getAttribute("data-fav-code")); return; }

      var link = e.target.closest(".card-link, .look-thumb");
      if (!link || presenter.contains(link)) return;
      var code = link.getAttribute("data-code");
      if (!code) return;
      e.preventDefault();
      var ctx = link.getAttribute("data-context");
      var list;
      if (!ctx && link.closest(".pair-tux")) {
        list = $$("[data-code]", link.closest(".pair-tux")).map(function (a) {
          return byCode[a.getAttribute("data-code")];
        }).filter(Boolean);
      } else {
        list = contextList(ctx);
      }
      var idx = list.findIndex(function (p) { return p.code === code; });
      if (idx < 0) { list = [byCode[code]]; idx = 0; }
      openPresenter(list, idx, link);
    });
  }

  /* =============================================================
     6) 納期チェッカー / ご相談フォーム
     ============================================================= */
  function initSched() {
    var form = $("[data-sched-form]");
    if (!form) return;
    var result = $("[data-sched-result]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      result.textContent = "";
      var v = $("#sched-date").value;
      var r = v ? WW.schedule(v) : { ok: false, reason: "ご使用日を入力してください。" };
      if (!r.ok) { result.appendChild(el("p", { class: "sched-error", text: r.reason })); return; }
      var dl = el("dl", { class: "sched-table" }, [
        specRow("WEB予約締切", r.deadline, "sched-deadline"),
        specRow("出荷", r.ship),
        specRow("お届け", r.arrive),
        specRow("ご使用日", r.use),
        specRow("ご返送", r.ret)
      ]);
      result.appendChild(dl);
      result.appendChild(el("p", { class: "sched-note", text: r.note }));
    });
  }

  function initRecruit() {
    var form = $("[data-recruit-form]");
    if (!form) return;
    var done = $("[data-recruit-done]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var checks = [
        { id: "rc-type", valid: function (v) { return v !== ""; } },
        { id: "rc-company", valid: function (v) { return v.trim() !== ""; } },
        { id: "rc-name", valid: function (v) { return v.trim() !== ""; } },
        { id: "rc-mail", valid: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); } },
        { id: "rc-body", valid: function (v) { return v.trim() !== ""; } }
      ];
      var firstBad = null;
      checks.forEach(function (c) {
        var input = document.getElementById(c.id);
        var bad = !c.valid(input.value);
        setFieldError(input, bad);
        if (bad && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); done.hidden = true; return; }
      form.reset();
      done.hidden = false;
      done.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    });
  }

  /* =============================================================
     7) リビール & 微パララックス（transformのみ・reduced-motionで停止）
     ============================================================= */
  function initMotion() {
    var reveals = $$(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      reveals.forEach(function (r) { r.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
        });
      }, { rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (r) { io.observe(r); });
    }

    if (reduceMotion) return;
    var imgs = $$(".bleed-divider .parallax");
    if (!imgs.length) return;
    var ticking = false;
    function parallax() {
      ticking = false;
      var vh = window.innerHeight;
      imgs.forEach(function (img) {
        var rect = img.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        var progress = (rect.top + rect.height / 2 - vh / 2) / vh; // -0.5〜0.5程度
        img.style.transform = "translateY(" + (progress * -9).toFixed(2) + "%)";
      });
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(parallax); }
    }, { passive: true });
    parallax();
  }

  /* ---------- init ---------- */
  var note = $("[data-grid-note]");
  if (note) note.textContent = "写真に触れると、その一着だけの誌面（プレゼンモード）が開きます。★で取寄せメモに追加。";
  buildChapters();
  buildFilters();
  initMemo();
  initPresenter();
  initDelegation();
  initSched();
  initRecruit();
  initMotion();
  syncFavUI();
})();
