/* =========================================================
   with a WISH — A案 Maison Formal「格式のメゾン」
   依存: assets/data.js (WW)
   ========================================================= */
(function () {
  "use strict";
  if (typeof WW === "undefined") return;

  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var BODY_ORDER = ["Y", "A", "AB", "B", "O", "E", "K"];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. ゆったりフェードイン ---------- */
  (function initReveal() {
    var targets = $$(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- 2. 全型グリッド生成 ---------- */
  var grid = $("#product-grid");
  var statusEl = $("#finder-status");
  var noResults = $("#no-results");
  var cards = []; // { p, el }

  function productName(p) {
    return p.colorName || WW.colorNames[p.color] || p.type || "";
  }

  function makePlaceholder(p) {
    var ph = document.createElement("span");
    ph.className = "p-ph";
    var dot = document.createElement("span");
    dot.className = "chip-dot";
    dot.style.background = WW.colorChips[p.color] || "#555";
    var code = document.createElement("span");
    code.textContent = "No. " + p.code;
    ph.appendChild(dot);
    ph.appendChild(code);
    return ph;
  }

  function buildGrid() {
    if (!grid) return;
    var frag = document.createDocumentFragment();
    WW.products.forEach(function (p) {
      /* button の入れ子は不正なので、セルで包んで比較トグルを兄弟に置く */
      var cell = document.createElement("div");
      cell.className = "p-cell";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "p-card";
      btn.setAttribute("data-code", p.code);

      var figure = document.createElement("figure");
      var frame = document.createElement("span");
      frame.className = "p-frame";
      var img = document.createElement("img");
      img.src = WW.img(p);
      img.alt = "品番" + p.code + " " + productName(p);
      img.width = 600;
      img.height = 900;
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", function () {
        frame.replaceChildren(makePlaceholder(p));
      });
      frame.appendChild(img);

      var cap = document.createElement("figcaption");
      var code = document.createElement("span");
      code.className = "p-code";
      code.textContent = "No. " + p.code;
      var name = document.createElement("span");
      name.className = "p-name";
      name.textContent = productName(p);
      cap.appendChild(code);
      cap.appendChild(name);

      figure.appendChild(frame);
      figure.appendChild(cap);
      btn.appendChild(figure);

      var cmp = document.createElement("button");
      cmp.type = "button";
      cmp.className = "cmp-toggle";
      cmp.setAttribute("data-cmp-code", p.code);
      cmp.setAttribute("aria-pressed", "false");
      cmp.setAttribute("aria-label", "品番" + p.code + " を比較に加える");
      cmp.textContent = "比較";

      cell.appendChild(btn);
      cell.appendChild(cmp);
      frag.appendChild(cell);
      cards.push({ p: p, el: cell, cmp: cmp });
    });
    grid.appendChild(frag);
  }

  /* ---------- 3. 即時絞り込み ---------- */
  var state = { code: "", color: 0, line: 0, body: "" };
  var codeInput = $("#f-code");
  var lineSelect = $("#f-line");
  var bodySelect = $("#f-body");
  var chips = $$(".chip[data-color]");
  var fabBadge = $("#fab-badge");
  var sheetCount = $("#sheet-count");
  var compare = [];
  var MAX_COMPARE = 4;

  function findProduct(code) {
    for (var i = 0; i < WW.products.length; i++) {
      if (WW.products[i].code === code) return WW.products[i];
    }
    return null;
  }

  function parseBodies(sizeStr) {
    if (!sizeStr) return [];
    var m = sizeStr.match(/([YABOEK]{1,2})\s*(?:[～〜~\-ー]\s*([YABOEK]{1,2}))?体/);
    if (!m) return [];
    var start = BODY_ORDER.indexOf(m[1]);
    var end = m[2] ? BODY_ORDER.indexOf(m[2]) : start;
    if (start < 0 || end < 0) return [];
    return BODY_ORDER.slice(Math.min(start, end), Math.max(start, end) + 1);
  }

  function matches(p) {
    if (state.code && p.code.indexOf(state.code) === -1) return false;
    if (state.color && p.color !== state.color) return false;
    if (state.line && p.line !== state.line) return false;
    if (state.body && parseBodies(p.size).indexOf(state.body) === -1) return false;
    return true;
  }

  /* 適用中の条件数。FABバッジと「条件をクリア」の出し分けに使う */
  function activeCount() {
    var n = 0;
    if (state.code) n += 1;
    if (state.color) n += 1;
    if (state.line) n += 1;
    if (state.body) n += 1;
    return n;
  }

  /* 条件と比較リストをURLに残す。
     衣裳店さまが絞り込み結果のURLをそのまま新郎さまへ送れるようにするための要件 */
  function syncUrl() {
    if (!window.history || !window.history.replaceState) return;
    var q = [];
    if (state.code) q.push("code=" + encodeURIComponent(state.code));
    if (state.color) q.push("color=" + state.color);
    if (state.line) q.push("line=" + state.line);
    if (state.body) q.push("body=" + encodeURIComponent(state.body));
    if (compare.length) q.push("cmp=" + compare.join(","));
    var qs = q.join("&");
    window.history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  }

  function readUrl() {
    if (!window.URLSearchParams) return;
    var q = new URLSearchParams(location.search);
    state.code = (q.get("code") || "").replace(/[^0-9]/g, "").slice(0, 5);
    state.color = parseInt(q.get("color"), 10) || 0;
    state.line = parseInt(q.get("line"), 10) || 0;
    var body = q.get("body") || "";
    state.body = BODY_ORDER.indexOf(body) === -1 ? "" : body;
    (q.get("cmp") || "").split(",").forEach(function (code) {
      var c = code.replace(/[^0-9]/g, "");
      if (c && compare.length < MAX_COMPARE && compare.indexOf(c) === -1 && findProduct(c)) {
        compare.push(c);
      }
    });
    if (codeInput) codeInput.value = state.code;
    if (lineSelect) lineSelect.value = String(state.line);
    if (bodySelect) bodySelect.value = state.body;
    chips.forEach(function (chip) {
      var on = parseInt(chip.getAttribute("data-color"), 10) === state.color;
      chip.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function applyFilter() {
    var shown = 0;
    cards.forEach(function (c) {
      var ok = matches(c.p);
      c.el.hidden = !ok;
      if (ok) shown += 1;
    });
    if (statusEl) {
      statusEl.replaceChildren();
      statusEl.appendChild(document.createTextNode("全" + WW.products.length + "型中 "));
      var strong = document.createElement("strong");
      strong.textContent = shown + "型";
      statusEl.appendChild(strong);
      statusEl.appendChild(document.createTextNode("を表示しています"));
    }
    if (noResults) noResults.hidden = shown !== 0;
    if (grid) grid.hidden = shown === 0;

    var act = activeCount();
    if (fabBadge) {
      fabBadge.hidden = act === 0;
      fabBadge.textContent = act;
    }
    if (sheetCount) sheetCount.textContent = shown;
    syncUrl();
  }

  function clearFilters() {
    state = { code: "", color: 0, line: 0, body: "" };
    if (codeInput) codeInput.value = "";
    if (lineSelect) lineSelect.value = "0";
    if (bodySelect) bodySelect.value = "";
    chips.forEach(function (chip) { chip.setAttribute("aria-pressed", "false"); });
    applyFilter();
  }

  if (codeInput) {
    codeInput.addEventListener("input", function () {
      state.code = codeInput.value.replace(/[^0-9]/g, "");
      applyFilter();
    });
  }
  if (lineSelect) {
    lineSelect.addEventListener("change", function () {
      state.line = parseInt(lineSelect.value, 10) || 0;
      applyFilter();
    });
  }
  if (bodySelect) {
    bodySelect.addEventListener("change", function () {
      state.body = bodySelect.value;
      applyFilter();
    });
  }
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var value = parseInt(chip.getAttribute("data-color"), 10);
      var isActive = state.color === value;
      state.color = isActive ? 0 : value;
      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", c === chip && !isActive ? "true" : "false");
      });
      applyFilter();
    });
  });
  var clearBtn = $("#f-clear");
  var nrClearBtn = $("#nr-clear");
  if (clearBtn) clearBtn.addEventListener("click", clearFilters);
  if (nrClearBtn) nrClearBtn.addEventListener("click", function () {
    clearFilters();
    if (codeInput) codeInput.focus();
  });

  /* ---------- 4. サイズ簡易診断 ---------- */
  var szRun = $("#sz-run");
  if (szRun) {
    szRun.addEventListener("click", function () {
      var result = $("#sz-result");
      var h = parseFloat($("#sz-h").value);
      var c = parseFloat($("#sz-c").value);
      var w = parseFloat($("#sz-w").value);
      var r = WW.suggestSize(h, c, w);
      if (!r.ok) {
        result.classList.add("is-error");
        result.textContent = r.reason;
        return;
      }
      result.classList.remove("is-error");
      result.replaceChildren();
      var strong = document.createElement("strong");
      strong.textContent = "推定サイズ: " + r.label;
      result.appendChild(strong);
      /* 入力値の復唱と誤読されやすいので、寸法表の値であることを明示する */
      result.appendChild(document.createTextNode(
        "（このサイズの標準寸法: 身長" + r.spec.height + " / 胸囲" + r.spec.chest + " / ウエスト" + r.spec.waist + "）"
      ));
      var note = document.createElement("span");
      note.className = "size-note";
      note.textContent = "検索条件に「" + r.body + "体」を適用しました。正確なサイズは衣裳店での採寸をご利用ください。";
      result.appendChild(note);
      if (bodySelect) {
        bodySelect.value = r.body;
        state.body = r.body;
        applyFilter();
      }
    });
  }

  /* ---------- 5. 商品詳細ダイアログ ---------- */
  var pDialog = $("#product-dialog");
  var pdImg = $("#pd-img");
  var pdThumbs = $("#pd-thumbs");
  var pdCmp = $("#pd-cmp");
  var openCode = null; // 詳細を開いている品番。比較ボタンの状態同期に使う

  /* 比較ボタンの見た目は「トレイの中身」が唯一の正。
     グリッドのトグル・トレイの×・URL復元、どこから変わっても renderTray 経由でここに来る */
  function syncDialogCompare() {
    if (!pdCmp || !openCode) return;
    var on = compare.indexOf(openCode) !== -1;
    pdCmp.setAttribute("aria-pressed", on ? "true" : "false");
    pdCmp.textContent = on ? "比較から外す" : "比較に追加";
  }

  function setDialogImage(p, extra) {
    pdImg.src = WW.img(p, extra);
    pdImg.alt = "品番" + p.code + " " + productName(p) + (extra ? " 別カット" : "");
    $$(".pd-thumb", pdThumbs).forEach(function (t) {
      t.setAttribute("aria-current", t.getAttribute("data-extra") === (extra || "") ? "true" : "false");
    });
  }

  function addDlRow(dl, label, value) {
    if (!value) return;
    var row = document.createElement("div");
    var dt = document.createElement("dt");
    dt.textContent = label;
    var dd = document.createElement("dd");
    dd.textContent = value.replace(/\n+/g, " ／ ");
    row.appendChild(dt);
    row.appendChild(dd);
    dl.appendChild(row);
  }

  function fillParagraphs(container, text) {
    container.replaceChildren();
    (text || "").split(/\n+/).forEach(function (line) {
      var s = line.trim();
      if (!s) return;
      var para = document.createElement("p");
      para.textContent = s;
      container.appendChild(para);
    });
  }

  function openProduct(code) {
    var p = findProduct(code);
    if (!p || !pDialog) return;

    $("#pd-type").textContent = p.type || "TUXEDO";
    $("#pd-title").textContent = productName(p);
    $("#pd-code").textContent = "No. " + p.code;
    $("#pd-copy-done").textContent = "";

    var dl = $("#pd-dl");
    dl.replaceChildren();
    addDlRow(dl, "色系統", WW.colorNames[p.color]);
    addDlRow(dl, "素材", p.material);
    addDlRow(dl, "サイズ展開", p.size);
    addDlRow(dl, "ライン", WW.lineNames[p.line]);
    addDlRow(dl, "仕様", p.other);

    fillParagraphs($("#pd-desc"), p.desc);

    var brandBox = $("#pd-brand");
    if (p.brand) {
      var brandText = p.brand;
      if (/確固たる地$/.test(brandText)) brandText += "位を築いています。";
      brandBox.hidden = false;
      brandBox.replaceChildren();
      var label = document.createElement("span");
      label.className = "pd-brand-label";
      label.textContent = "The Fabric — 生地ブランド";
      brandBox.appendChild(label);
      var body = document.createElement("div");
      fillParagraphs(body, brandText);
      brandBox.appendChild(body);
    } else {
      brandBox.hidden = true;
    }

    // サムネイル（メイン + extras）
    pdThumbs.replaceChildren();
    var views = [""].concat(p.extras || []);
    if (views.length > 1) {
      views.forEach(function (extra, idx) {
        var thumb = document.createElement("button");
        thumb.type = "button";
        thumb.className = "pd-thumb";
        thumb.setAttribute("data-extra", extra);
        thumb.setAttribute("aria-label", "写真" + (idx + 1) + "を表示");
        var img = document.createElement("img");
        img.src = WW.img(p, extra || undefined);
        img.alt = "";
        img.width = 52;
        img.height = 73;
        img.loading = "lazy";
        img.decoding = "async";
        thumb.appendChild(img);
        thumb.addEventListener("click", function () {
          setDialogImage(p, extra || undefined);
        });
        pdThumbs.appendChild(thumb);
      });
    }
    setDialogImage(p);

    var copyBtn = $("#pd-copy");
    copyBtn.onclick = function () { copyCode(p.code); };

    openCode = p.code;
    syncDialogCompare();

    pDialog.showModal();
    $(".dialog-inner", pDialog).scrollTop = 0;
  }

  function copyCode(code) {
    var done = $("#pd-copy-done");
    function ok() { done.textContent = "品番「" + code + "」をコピーしました"; }
    function fail() { done.textContent = "コピーできませんでした。品番: " + code; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(ok, fail);
    } else {
      fail();
    }
  }

  document.addEventListener("click", function (event) {
    var card = event.target.closest("[data-code]");
    if (card && card.classList.contains("p-card")) {
      openProduct(card.getAttribute("data-code"));
    }
  });

  /* ---------- 6. デジタルカタログの入口 ---------- */
  $$("[data-catalog]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (window.WWCatalog) window.WWCatalog.open();
    });
  });

  /* ---------- ダイアログ共通（閉じる・背景クリック） ---------- */
  $$("dialog").forEach(function (dialog) {
    var closeBtn = $(".dialog-close", dialog);
    if (closeBtn) closeBtn.addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
  });

  /* ---------- 7. 納期チェッカー ---------- */
  var schedRun = $("#sched-run");
  if (schedRun) {
    schedRun.addEventListener("click", function () {
      var box = $("#sched-result");
      var value = $("#sched-date").value;
      box.replaceChildren();
      var r = WW.schedule(value);
      if (!r.ok) {
        var err = document.createElement("p");
        err.className = "sched-error";
        err.textContent = r.reason;
        box.appendChild(err);
        return;
      }
      var dl = document.createElement("dl");
      dl.className = "sched-dl";
      [
        ["WEB予約締切", r.deadline, true],
        ["出荷日", r.ship, false],
        ["お届け日", r.arrive, false],
        ["ご使用日", r.use, false],
        ["ご返送日", r.ret, false]
      ].forEach(function (row) {
        var div = document.createElement("div");
        if (row[2]) div.className = "is-strong";
        var dt = document.createElement("dt");
        dt.textContent = row[0];
        var dd = document.createElement("dd");
        dd.textContent = row[1];
        div.appendChild(dt);
        div.appendChild(dd);
        dl.appendChild(div);
      });
      box.appendChild(dl);
      var note = document.createElement("p");
      note.className = "sched-note";
      note.textContent = r.note;
      box.appendChild(note);
    });
  }

  /* ---------- 8. ご利用の流れ タブ ---------- */
  (function initTabs() {
    var tabs = $$('[role="tab"]');
    if (!tabs.length) return;
    function select(tab) {
      tabs.forEach(function (t) {
        var isActive = t === tab;
        t.setAttribute("aria-selected", isActive ? "true" : "false");
        t.tabIndex = isActive ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !isActive;
      });
      tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (event) {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          var dir = event.key === "ArrowRight" ? 1 : -1;
          select(tabs[(i + dir + tabs.length) % tabs.length]);
        }
      });
    });
  })();

  /* ---------- 9. 招待状フォーム（デモ） ---------- */
  var contactForm = $("#contact-form");
  if (contactForm) {
    var fields = [
      { id: "c-type", err: "err-type" },
      { id: "c-company", err: "err-company" },
      { id: "c-name", err: "err-name" },
      { id: "c-email", err: "err-email", email: true },
      { id: "c-body", err: "err-body" }
    ];
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var firstInvalid = null;
      fields.forEach(function (f) {
        var input = document.getElementById(f.id);
        var errEl = document.getElementById(f.err);
        var value = input.value.trim();
        var bad = !value || (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
        errEl.hidden = !bad;
        input.setAttribute("aria-invalid", bad ? "true" : "false");
        if (bad) {
          input.setAttribute("aria-describedby", f.err);
          if (!firstInvalid) firstInvalid = input;
        }
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      $$(".invite-field, .btn-ink, .invite-lead, .invite-note", contactForm).forEach(function (el) {
        el.hidden = true;
      });
      $("#invite-done").hidden = false;
    });
  }

  /* ---------- 16. ページ先頭へ戻る ---------- */
  (function initToTop() {
    var btn = $("#to-top");
    if (!btn) return;
    var SHOW_AT = 700; // ヒーローを抜けたあたりから出す
    var ticking = false;
    function update() {
      btn.hidden = window.scrollY < SHOW_AT;
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    btn.addEventListener("click", function () {
      /* behavior:"auto" は CSS の scroll-behavior:smooth に従ってしまう。
         全長2万px近く戻りきるまで待たされるので "instant" で明示的に飛ばす */
      try {
        window.scrollTo({ top: 0, behavior: "instant" });
      } catch (e) {
        window.scrollTo(0, 0);
      }
    });
    update();
  })();

  /* ---------- 10. 検索ドック（章の中で吸着し1行に畳む） ---------- */
  (function initDock() {
    var dock = $("#finder-dock");
    if (!dock || !("IntersectionObserver" in window)) return;
    /* 番兵を1つ上に置き、それが画面上端を抜けたら吸着中とみなす */
    var sentinel = document.createElement("div");
    sentinel.className = "dock-sentinel";
    sentinel.setAttribute("aria-hidden", "true");
    dock.parentNode.insertBefore(sentinel, dock);

    /* SPは CSS 側で position:static にして吸着させていない（操作はシート経由）。
       そこで高さを配ると、実際には固定されていないのに scroll-margin-top だけが
       効いてしまい、scrollIntoView の着地がドック高ぶん下へずれる。
       実際に sticky で組まれているときだけ吸着として扱う。 */
    function isSticky() {
      return window.getComputedStyle(dock).position === "sticky";
    }

    var passedTop = false;

    /* 吸着中の実高を CSS へ返す。これが無いと scrollIntoView した要素が
       ドックの下に潜り込み、クリックできなくなる */
    function sync() {
      var stuck = passedTop && isSticky();
      dock.classList.toggle("is-stuck", stuck);
      var h = stuck ? Math.round(dock.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty("--dock-h", h + "px");
    }

    new IntersectionObserver(function (entries) {
      /* 番兵が「画面より上」に出たときだけ吸着。単に !isIntersecting とすると
         まだ番兵に到達していない（画面より下）状態も拾ってしまう */
      var e = entries[0];
      passedTop = !e.isIntersecting && e.boundingClientRect.top < 0;
      sync();
    }, { threshold: 0 }).observe(sentinel);

    if ("ResizeObserver" in window) new ResizeObserver(sync).observe(dock);
    /* SP↔PC をまたぐと position が変わる。ドックの寸法が変わらない場合でも拾う */
    window.addEventListener("resize", sync);
    sync();
  })();

  /* ---------- 11. 絞り込みシート（SP） ---------- */
  var sheet = $("#filter-sheet");
  var sheetBack = $("#sheet-back");
  var sheetBody = $("#sheet-body");
  var fab = $("#fab");
  var controls = $("#finder-controls");
  var finderPanel = $("#finder-panel");
  var sheetOpener = null;

  function closeSheet(refocus) {
    if (!sheet || sheet.hidden) return;
    sheet.classList.remove("is-open");
    sheetBack.classList.remove("is-open");
    fab.setAttribute("aria-expanded", "false");
    window.setTimeout(function () {
      sheet.hidden = true;
      sheetBack.hidden = true;
    }, 260);
    if (refocus !== false && sheetOpener) sheetOpener.focus();
  }

  function openSheet() {
    if (!sheet) return;
    sheetOpener = document.activeElement;
    sheet.hidden = false;
    sheetBack.hidden = false;
    void sheet.offsetWidth;
    sheet.classList.add("is-open");
    sheetBack.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    $("#sheet-x").focus();
  }

  if (sheet && controls) {
    var mqSp = window.matchMedia("(max-width: 760px)");
    /* 検索UIのDOMは1つだけ。SPではシートへ、PCではパネルへ「移動」させる。
       複製すると状態の二重管理になり、ずれるため */
    var sizeAid = $("#size-aid");
    var sizeAidHome = $("#size-aid-home");
    var placeControls = function () {
      if (mqSp.matches) {
        sheetBody.appendChild(controls);
        if (sizeAid) sheetBody.appendChild(sizeAid);
        fab.hidden = false;
      } else {
        finderPanel.appendChild(controls);
        if (sizeAid && sizeAidHome) sizeAidHome.appendChild(sizeAid);
        fab.hidden = true;
        closeSheet(false);
      }
    };
    if (mqSp.addEventListener) mqSp.addEventListener("change", placeControls);
    else if (mqSp.addListener) mqSp.addListener(placeControls);
    placeControls();

    fab.addEventListener("click", openSheet);
    $("#sheet-x").addEventListener("click", function () { closeSheet(); });
    sheetBack.addEventListener("click", function () { closeSheet(); });
    $("#sheet-apply").addEventListener("click", function () {
      closeSheet();
      var target = $("#product-grid");
      if (target) target.scrollIntoView({ block: "start" });
    });
    sheet.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { event.stopPropagation(); closeSheet(); return; }
      if (event.key !== "Tab") return;
      var focusable = $$('a[href], button:not([disabled]), input, select, textarea, summary, [tabindex]:not([tabindex="-1"])', sheet)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  /* ---------- 12. 比較トレイ ---------- */
  var tray = $("#tray");
  var trayItems = $("#tray-items");
  var trayOpen = $("#tray-open");
  var cmpDialog = $("#compare-dialog");

  function renderTray() {
    if (!tray) return;
    $("#tray-n").textContent = compare.length;
    trayItems.replaceChildren();
    compare.forEach(function (code) {
      var p = findProduct(code);
      if (!p) return;
      var li = document.createElement("li");
      var thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = "tray-thumb";
      thumb.setAttribute("data-code", code);
      thumb.setAttribute("aria-label", "品番" + code + " の詳細を見る");
      var img = document.createElement("img");
      img.src = WW.img(p);
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      thumb.appendChild(img);
      thumb.addEventListener("click", function () { openProduct(code); });

      var x = document.createElement("button");
      x.type = "button";
      x.className = "tray-x";
      x.setAttribute("aria-label", "品番" + code + " を比較から外す");
      x.textContent = "×";
      x.addEventListener("click", function () { toggleCompare(code); });

      li.appendChild(thumb);
      li.appendChild(x);
      trayItems.appendChild(li);
    });
    tray.hidden = compare.length === 0;
    trayOpen.disabled = compare.length < 2;
    /* SPで右下に FAB・トップへ戻る・トレイが重ならないよう、まとめて持ち上げる */
    var lift = !tray.hidden && window.matchMedia("(max-width: 760px)").matches;
    if (fab) fab.classList.toggle("is-lifted", lift);
    var toTop = $("#to-top");
    if (toTop) toTop.classList.toggle("is-lifted", lift);
    cards.forEach(function (c) {
      if (!c.cmp) return;
      var on = compare.indexOf(c.p.code) !== -1;
      c.cmp.setAttribute("aria-pressed", on ? "true" : "false");
      c.cmp.setAttribute("aria-label", "品番" + c.p.code + (on ? " を比較から外す" : " を比較に加える"));
    });
    syncDialogCompare();
    syncUrl();
  }

  /* 追加/削除/上限 のどれが起きたかを返す。呼び出し側で文言を出し分けるため */
  function toggleCompare(code) {
    if (compare.indexOf(code) !== -1) {
      compare = compare.filter(function (c) { return c !== code; });
      renderTray();
      return "removed";
    }
    if (compare.length >= MAX_COMPARE) return "full";
    compare = compare.concat([code]);
    renderTray();
    return "added";
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-cmp-code]");
    if (btn) toggleCompare(btn.getAttribute("data-cmp-code"));
  });

  if (pdCmp) {
    pdCmp.addEventListener("click", function () {
      if (!openCode) return;
      var result = toggleCompare(openCode);
      var note = $("#pd-copy-done");
      if (result === "full") {
        note.textContent = "比較は最大" + MAX_COMPARE + "着までです。どれかを外してからお試しください。";
      } else if (result === "added") {
        note.textContent = "比較に追加しました（" + compare.length + "／" + MAX_COMPARE + "着）";
      } else {
        note.textContent = "比較から外しました";
      }
    });
  }

  if (tray) {
    $("#tray-clear").addEventListener("click", function () {
      compare = [];
      renderTray();
    });
    trayOpen.addEventListener("click", function () {
      var gridEl = $("#cmp-grid");
      gridEl.replaceChildren();
      compare.forEach(function (code) {
        var p = findProduct(code);
        if (!p) return;
        var col = document.createElement("div");
        col.className = "cmp-col";
        var fig = document.createElement("figure");
        var frame = document.createElement("span");
        frame.className = "p-frame";
        var img = document.createElement("img");
        img.src = WW.img(p);
        img.alt = "品番" + p.code + " " + productName(p);
        img.width = 600;
        img.height = 900;
        img.loading = "lazy";
        img.decoding = "async";
        img.addEventListener("error", function () { frame.replaceChildren(makePlaceholder(p)); });
        frame.appendChild(img);
        var cap = document.createElement("figcaption");
        var codeEl = document.createElement("span");
        codeEl.className = "p-code";
        codeEl.textContent = "No. " + p.code;
        var nameEl = document.createElement("span");
        nameEl.className = "p-name";
        nameEl.textContent = productName(p);
        cap.appendChild(codeEl);
        cap.appendChild(nameEl);
        fig.appendChild(frame);
        fig.appendChild(cap);
        col.appendChild(fig);

        var dl = document.createElement("dl");
        dl.className = "cmp-dl";
        addDlRow(dl, "色系統", WW.colorNames[p.color]);
        addDlRow(dl, "ライン", WW.lineNames[p.line]);
        addDlRow(dl, "素材", p.material);
        addDlRow(dl, "サイズ", p.size);
        col.appendChild(dl);
        gridEl.appendChild(col);
      });
      cmpDialog.showModal();
    });
  }

  /* ---------- 初期化 ---------- */
  buildGrid();
  readUrl();
  applyFilter();
  renderTray();
})();
