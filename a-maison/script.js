/* =========================================================
   with a WISH — A案 Maison Formal「格式のメゾン」
   依存: ../assets/data.js (WW)
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
      img.width = 642;
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
      frag.appendChild(btn);
      cards.push({ p: p, el: btn });
    });
    grid.appendChild(frag);
  }

  /* ---------- 3. 即時絞り込み ---------- */
  var state = { code: "", color: 0, line: 0, body: "" };
  var codeInput = $("#f-code");
  var lineSelect = $("#f-line");
  var bodySelect = $("#f-body");
  var chips = $$(".chip[data-color]");

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

  function applyFilter() {
    var shown = 0;
    cards.forEach(function (c) {
      var ok = matches(c.p);
      c.el.hidden = !ok;
      if (ok) shown += 1;
    });
    if (statusEl) {
      statusEl.textContent = "全" + WW.products.length + "型中 " + shown + "型を表示しています";
    }
    if (noResults) noResults.hidden = shown !== 0;
    if (grid) grid.hidden = shown === 0;
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
      result.appendChild(document.createTextNode(
        "（参考: 身長" + r.spec.height + " / 胸囲" + r.spec.chest + " / ウエスト" + r.spec.waist + "）"
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
    var p = null;
    for (var i = 0; i < WW.products.length; i++) {
      if (WW.products[i].code === code) { p = WW.products[i]; break; }
    }
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
    if (card && (card.classList.contains("p-card") || card.classList.contains("portrait-card"))) {
      openProduct(card.getAttribute("data-code"));
    }
  });

  /* ---------- 6. 統合ログイン（デモ） ---------- */
  var loginDialog = $("#login-dialog");
  var loginForm = $("#login-form");
  var loginDone = $("#login-done");
  var loginErr = $("#err-login");

  $$("[data-open-login]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!loginDialog) return;
      loginForm.hidden = false;
      loginDone.hidden = true;
      loginErr.hidden = true;
      loginDialog.showModal();
    });
  });
  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var id = $("#l-id").value.trim();
      var pw = $("#l-pw").value.trim();
      if (!id || !pw) {
        loginErr.hidden = false;
        $("#l-id").setAttribute("aria-invalid", id ? "false" : "true");
        $("#l-pw").setAttribute("aria-invalid", pw ? "false" : "true");
        return;
      }
      loginErr.hidden = true;
      loginForm.hidden = true;
      loginDone.hidden = false;
    });
  }

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

  /* ---------- 初期化 ---------- */
  buildGrid();
  applyFilter();
})();
