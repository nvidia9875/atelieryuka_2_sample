/* ============================================================
   with a WISH — B案 Working Desk
   script.js: finder / grid / filter / URL state / size diag /
              bottom sheet / shared utilities (window.WWB)
   ============================================================ */
(() => {
  "use strict";

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  /* ---- product preprocessing ---- */
  const BODY_ORDER = WW.bodyTypes; // ["Y","A","AB","B","O","E","K"]

  /** size文字列 → 対応体型の配列（"Y～O体"の範囲表記・"E体・K体"の単独表記に対応） */
  function parseBodies(sizeStr) {
    if (!sizeStr) return [];
    const s = sizeStr.replace(/Ｙ/g, "Y").replace(/[～〜]/g, "~");
    const found = new Set();
    const rangeRe = /(AB|[YABOEK])\s*~\s*(AB|[YABOEK])体/g;
    let m;
    while ((m = rangeRe.exec(s))) {
      const i = BODY_ORDER.indexOf(m[1]);
      const j = BODY_ORDER.indexOf(m[2]);
      if (i > -1 && j > -1) {
        for (let k = Math.min(i, j); k <= Math.max(i, j); k++) found.add(BODY_ORDER[k]);
      }
    }
    if (!found.size) {
      const singleRe = /(AB|[YABOEK])体/g;
      while ((m = singleRe.exec(s))) {
        if (BODY_ORDER.includes(m[1])) found.add(m[1]);
      }
    }
    return BODY_ORDER.filter((b) => found.has(b));
  }

  const lineTag = (line) =>
    line ? WW.lineNames[line].split(" ").slice(0, -1).join(" ") : "";

  const PRODUCTS = WW.products.map((p) => ({
    ...p,
    bodies: parseBodies(p.size),
    name: p.colorName || WW.colorNames[p.color] || "",
    lineTag: lineTag(p.line),
  }));
  const byCode = new Map(PRODUCTS.map((p) => [p.code, p]));
  const TOTAL = PRODUCTS.length;

  /* ---- state ---- */
  const state = { q: "", color: 0, line: 0, body: "" };

  /* ---- dom ---- */
  const grid = $("#grid");
  const gridEmpty = $("#grid-empty");
  const countEl = $("#f-count");
  const sheetCountEl = $("#sheet-count");
  const clearBtn = $("#f-clear");
  const codeInput = $("#f-code");
  const lineSel = $("#f-line");
  const bodySel = $("#f-body");
  const chips = $$(".chip");
  const fab = $("#fab");
  const fabBadge = $("#fab-badge");

  /* ---- grid build (JSで全125型を生成、静的HTMLのfeatured 13型を置換) ---- */
  function cardHTML(p) {
    const chip = WW.colorChips[p.color] || "#ccc";
    const tag = p.lineTag ? `<span class="card-tag">${p.lineTag}</span>` : "";
    return `<article class="card" data-code="${p.code}">
<button type="button" class="card-open" data-open="${p.code}"><span class="card-media"><img src="${WW.img(p)}" alt="品番${p.code} ${p.name}（${p.type}）" width="642" height="900" loading="lazy"></span><span class="card-info"><span class="card-code num">${p.code}</span><span class="card-name">${p.name}</span><span class="card-meta"><span class="dot" style="background:${chip}"></span>${p.type}</span>${tag}</span></button>
<button type="button" class="card-cmp" data-cmp="${p.code}" aria-pressed="false" aria-label="品番${p.code}を比較リストに追加">比較</button>
</article>`;
  }

  const cardEls = new Map();
  function buildGrid() {
    grid.innerHTML = PRODUCTS.map(cardHTML).join("");
    $$(".card", grid).forEach((el) => cardEls.set(el.dataset.code, el));
  }

  /* ---- filtering ---- */
  function matches(p) {
    if (state.q && !p.code.includes(state.q)) return false;
    if (state.color && p.color !== state.color) return false;
    if (state.line && p.line !== state.line) return false;
    if (state.body && !p.bodies.includes(state.body)) return false;
    return true;
  }

  function activeCount() {
    return (state.q ? 1 : 0) + (state.color ? 1 : 0) + (state.line ? 1 : 0) + (state.body ? 1 : 0);
  }

  function applyFilter(opts = {}) {
    let n = 0;
    for (const p of PRODUCTS) {
      const el = cardEls.get(p.code);
      if (!el) continue;
      const show = matches(p);
      el.hidden = !show;
      if (show) n++;
    }
    countEl.textContent = n;
    if (sheetCountEl) sheetCountEl.textContent = n;
    gridEmpty.hidden = n !== 0;
    const act = activeCount();
    clearBtn.hidden = act === 0;
    fabBadge.hidden = act === 0;
    fabBadge.textContent = act;
    if (opts.flash !== false) {
      grid.classList.remove("is-flash");
      void grid.offsetWidth;
      grid.classList.add("is-flash");
    }
    syncURL();
  }

  /* ---- URL state（接客中の共有・ブックマーク用） ---- */
  function syncURL() {
    try {
      const u = new URL(location.href);
      const set = (k, v) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
      set("q", state.q);
      set("color", state.color || "");
      set("line", state.line || "");
      set("body", state.body);
      history.replaceState(null, "", u);
    } catch {
      /* file:// 直開きなど replaceState 不可の環境では黙ってスキップ */
    }
  }

  function restoreURL() {
    const u = new URL(location.href);
    state.q = (u.searchParams.get("q") || "").replace(/\D/g, "").slice(0, 5);
    state.color = Math.min(9, Math.max(0, parseInt(u.searchParams.get("color") || "0", 10) || 0));
    state.line = Math.min(5, Math.max(0, parseInt(u.searchParams.get("line") || "0", 10) || 0));
    const b = u.searchParams.get("body") || "";
    state.body = BODY_ORDER.includes(b) ? b : "";
    codeInput.value = state.q;
    lineSel.value = state.line ? String(state.line) : "";
    bodySel.value = state.body;
    chips.forEach((c) =>
      c.setAttribute("aria-pressed", String(Number(c.dataset.color) === state.color))
    );
  }

  function clearAll() {
    state.q = "";
    state.color = 0;
    state.line = 0;
    state.body = "";
    codeInput.value = "";
    lineSel.value = "";
    bodySel.value = "";
    chips.forEach((c) => c.setAttribute("aria-pressed", "false"));
    applyFilter();
  }

  /* ---- finder wiring ---- */
  let qTimer = 0;
  codeInput.addEventListener("input", () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      state.q = codeInput.value.trim().replace(/[０-９]/g, (d) => "０１２３４５６７８９".indexOf(d));
      applyFilter();
    }, 120);
  });
  codeInput.addEventListener("search", () => {
    state.q = codeInput.value.trim();
    applyFilter();
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const c = Number(chip.dataset.color);
      state.color = state.color === c ? 0 : c;
      chips.forEach((el) =>
        el.setAttribute("aria-pressed", String(Number(el.dataset.color) === state.color))
      );
      applyFilter();
    });
  });

  lineSel.addEventListener("change", () => {
    state.line = parseInt(lineSel.value || "0", 10) || 0;
    applyFilter();
  });
  bodySel.addEventListener("change", () => {
    state.body = bodySel.value;
    applyFilter();
  });
  clearBtn.addEventListener("click", clearAll);
  $("#empty-clear").addEventListener("click", () => {
    clearAll();
    $("#collection").scrollIntoView();
  });

  /* ---- size diagnosis popover ---- */
  const diagBtn = $("#diag-btn");
  const diagPop = $("#diag-pop");
  const dgErr = $("#dg-err");
  const dgRes = $("#dg-res");
  let lastDiag = null;

  function openDiag() {
    diagPop.hidden = false;
    diagBtn.setAttribute("aria-expanded", "true");
    $("#dg-h").focus();
    document.addEventListener("pointerdown", onDiagOutside, true);
  }
  function closeDiag(refocus) {
    if (diagPop.hidden) return;
    diagPop.hidden = true;
    diagBtn.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", onDiagOutside, true);
    if (refocus) diagBtn.focus();
  }
  function onDiagOutside(e) {
    if (!diagPop.contains(e.target) && e.target !== diagBtn) closeDiag(false);
  }
  diagBtn.addEventListener("click", () => (diagPop.hidden ? openDiag() : closeDiag(true)));
  diagPop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeDiag(true);
    }
  });

  $("#dg-run").addEventListener("click", () => {
    const h = parseFloat($("#dg-h").value);
    const c = parseFloat($("#dg-c").value);
    const w = parseFloat($("#dg-w").value);
    const r = WW.suggestSize(h, c, w);
    if (!r.ok) {
      lastDiag = null;
      dgRes.hidden = true;
      dgErr.textContent = r.reason;
      dgErr.hidden = false;
      return;
    }
    lastDiag = r;
    dgErr.hidden = true;
    $("#dg-label").textContent = r.label;
    $("#dg-spec").textContent =
      `規格の目安：身長${r.spec.height} / 胸囲${r.spec.chest} / ウエスト${r.spec.waist} (cm)`;
    $("#dg-apply").textContent = `この体型（${r.body}体）で絞り込む`;
    dgRes.hidden = false;
  });

  $("#dg-apply").addEventListener("click", () => {
    if (!lastDiag) return;
    state.body = lastDiag.body;
    bodySel.value = lastDiag.body;
    applyFilter();
    closeDiag(true);
    WWB.toast(`${lastDiag.label} — ${lastDiag.body}体で絞り込みました`);
  });

  /* ---- mobile bottom sheet（ファインダーバーの変形） ---- */
  const sheet = $("#sheet");
  const sheetBack = $("#sheet-back");
  const sheetBody = $("#sheet-body");
  const controls = $("#finder-controls");
  const fbar = $("#fbar");
  const mq = matchMedia("(max-width: 760px)");

  function placeControls() {
    if (mq.matches) {
      sheetBody.appendChild(controls);
      fab.hidden = false;
    } else {
      fbar.appendChild(controls);
      fab.hidden = true;
      closeSheet(false);
    }
  }
  mq.addEventListener("change", placeControls);

  let sheetOpener = null;
  function openSheet() {
    sheetOpener = document.activeElement;
    sheet.hidden = false;
    sheetBack.hidden = false;
    void sheet.offsetWidth;
    sheet.classList.add("is-open");
    sheetBack.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    $("#sheet-x").focus();
  }
  function closeSheet(refocus = true) {
    if (sheet.hidden) return;
    closeDiag(false);
    sheet.classList.remove("is-open");
    sheetBack.classList.remove("is-open");
    fab.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      sheet.hidden = true;
      sheetBack.hidden = true;
    }, 240);
    if (refocus && sheetOpener) sheetOpener.focus();
  }
  fab.addEventListener("click", openSheet);
  $("#sheet-x").addEventListener("click", () => closeSheet());
  $("#sheet-apply").addEventListener("click", () => {
    closeSheet();
    $("#collection").scrollIntoView();
  });
  sheetBack.addEventListener("click", () => closeSheet());
  sheet.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeSheet();
    }
    if (e.key === "Tab") WWB.trapTab(sheet, e);
  });

  /* ---- shared: toast / focus trap ---- */
  const toastEl = $("#toast");
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-show"), 2400);
  }

  function trapTab(container, e) {
    const focusables = $$(
      'a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea',
      container
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---- init ---- */
  buildGrid();
  restoreURL();
  applyFilter({ flash: false });
  placeControls();

  /* shared namespace for script-b.js */
  window.WWB = { PRODUCTS, byCode, toast, trapTab, clearAll, state };
})();
