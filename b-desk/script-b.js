/* ============================================================
   with a WISH — B案 Working Desk
   script-b.js: 商品詳細パネル / 空き状況(デモ) / 予約ウィザード(デモ) /
                比較トレイ / 納期チェッカー / FAQ / フォーム(デモ)
   ============================================================ */
(() => {
  "use strict";

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const { byCode, toast, trapTab } = window.WWB;

  /* ---- date utils ---- */
  const DAY = 86400000;
  const pad = (n) => String(n).padStart(2, "0");
  const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => new Date(d.getTime() + n * DAY);
  const fmtJa = (d) => `${d.getMonth() + 1}/${d.getDate()}(${"日月火水木金土"[d.getDay()]})`;

  /* ---- scroll lock ---- */
  let locks = 0;
  const lock = () => { if (++locks === 1) document.documentElement.style.overflow = "hidden"; };
  const unlock = () => { if (locks > 0 && --locks === 0) document.documentElement.style.overflow = ""; };

  /* ============================================================
     商品詳細パネル
     ============================================================ */
  const panel = $("#panel");
  const panelBack = $("#panel-back");
  let panelOpener = null;
  let current = null;

  const stars = (l) =>
    l > 0
      ? `<span class="sp-star" aria-hidden="true">${"★".repeat(l)}${"☆".repeat(3 - l)}</span><span class="vh">光沢 ${l}／3</span>`
      : "—";

  function populatePanel(p) {
    current = p;
    $("#panel-title").textContent = `品番 ${p.code}`;
    $("#panel-type").textContent = p.type;
    $("#panel-name").textContent = p.name;
    const desc = $("#panel-desc");
    desc.textContent = p.desc || "";
    desc.hidden = !p.desc;
    const img = $("#panel-img");
    img.src = WW.img(p);
    img.alt = `品番${p.code} ${p.name}（${p.type}）`;
    // 追加ビュー
    const thumbs = $("#panel-thumbs");
    thumbs.innerHTML = "";
    thumbs.hidden = !p.extras.length;
    if (p.extras.length) {
      const views = ["", ...p.extras];
      views.forEach((ex, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-pressed", String(i === 0));
        b.setAttribute("aria-label", i === 0 ? "メイン写真" : `追加写真${i}`);
        const t = document.createElement("img");
        t.src = ex ? WW.img(p, ex) : WW.img(p);
        t.alt = "";
        t.width = 642;
        t.height = 900;
        t.loading = "lazy";
        b.appendChild(t);
        b.addEventListener("click", () => {
          img.src = t.src;
          $$("button", thumbs).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        });
        thumbs.appendChild(b);
      });
    }
    // スペック表
    $("#sp-code").textContent = p.code;
    $("#sp-type").textContent = p.type;
    $("#sp-color").innerHTML =
      `<span class="dot" style="background:${WW.colorChips[p.color]};display:inline-block;vertical-align:-1px;margin-right:6px"></span>` +
      `${WW.colorNames[p.color] || "—"}${p.colorName ? `（${p.colorName}）` : ""}`;
    $("#sp-material").textContent = p.material || "—";
    $("#sp-size").textContent = p.size || "—";
    $("#sp-line").textContent = p.line ? WW.lineNames[p.line] : "—";
    $("#sp-luster").innerHTML = stars(p.luster);
    $("#sp-other").textContent = p.other || "—";
    $("#sp-caution").textContent = p.caution || "—";
    const brand = $("#panel-brand");
    brand.hidden = !p.brand;
    $("#panel-brand-t").textContent = p.brand || "";
    buildCalendar(p.code);
    resetWizard();
  }

  function openPanel(code) {
    const p = byCode.get(code);
    if (!p) return;
    panelOpener = document.activeElement;
    populatePanel(p);
    panel.hidden = false;
    panelBack.hidden = false;
    void panel.offsetWidth;
    panel.classList.add("is-open");
    panelBack.classList.add("is-open");
    lock();
    $("#panel-x").focus();
    $(".panel-bd").scrollTop = 0;
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.classList.remove("is-open");
    panelBack.classList.remove("is-open");
    unlock();
    setTimeout(() => {
      panel.hidden = true;
      panelBack.hidden = true;
    }, 260);
    if (panelOpener) panelOpener.focus();
  }
  $("#panel-x").addEventListener("click", closePanel);
  panelBack.addEventListener("click", closePanel);
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
    if (e.key === "Tab") trapTab(panel, e);
  });

  /* 品番コピー */
  $("#panel-copy").addEventListener("click", async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.code);
      toast(`品番「${current.code}」をコピーしました`);
    } catch {
      toast("コピーできませんでした。品番を直接お控えください。");
    }
  });

  /* ---- 空き状況カレンダー(デモ): 品番+日付から決定的に生成 ---- */
  function availMark(code, d) {
    let s = 0;
    for (const ch of code) s += ch.charCodeAt(0);
    const v = (s * 31 + d.getFullYear() * 372 + (d.getMonth() + 1) * 37 + d.getDate() * 7) % 11;
    if (v < 6) return ["○", "st-ok", "空きあり"];
    if (v < 9) return ["△", "st-few", "残りわずか"];
    return ["×", "st-no", "貸出不可"];
  }

  function buildCalendar(code) {
    const body = $("#cal-body");
    body.innerHTML = "";
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const start = addDays(today, -((today.getDay() + 6) % 7)); // 今週の月曜
    for (let w = 0; w < 4; w++) {
      const tr = document.createElement("tr");
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, w * 7 + i);
        const td = document.createElement("td");
        const past = d.getTime() < today.getTime();
        if (past) td.className = "is-past";
        const label = d.getDate() === 1 || (w === 0 && i === 0) ? `${d.getMonth() + 1}/${d.getDate()}` : String(d.getDate());
        if (past) {
          td.innerHTML = `<span class="cal-d">${label}</span><span class="cal-s" aria-hidden="true">−</span><span class="vh">${fmtJa(d)} 受付終了</span>`;
        } else {
          const [mark, cls, sr] = availMark(code, d);
          td.innerHTML = `<span class="cal-d">${label}</span><span class="cal-s ${cls}" aria-hidden="true">${mark}</span><span class="vh">${fmtJa(d)} ${sr}</span>`;
        }
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
  }

  /* ============================================================
     予約ウィザード(デモ) 3ステップ
     ============================================================ */
  const wiz = $("#wiz");
  const wzDate = $("#wz-date");
  const wzDateErr = $("#wz-date-err");
  const wzSched = $("#wz-sched");
  let wizSched = null;

  function goStep(n) {
    $$(".wiz-pane", wiz).forEach((p) => (p.hidden = p.dataset.wp !== String(n)));
    $("#wz-done").hidden = true;
    $$("#wiz-steps li").forEach((li) => {
      const s = Number(li.dataset.ws);
      if (s === n) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
      li.classList.toggle("is-done", s < n);
    });
  }

  function resetWizard() {
    wizSched = null;
    wzDate.value = "";
    wzDate.min = isoLocal(addDays(new Date(), 2));
    wzSched.hidden = true;
    wzDateErr.hidden = true;
    ["#wz-shop", "#wz-staff", "#wz-tel"].forEach((s) => ($(s).value = ""));
    $$(".field.is-error", wiz).forEach((f) => f.classList.remove("is-error"));
    $$(".field .field-err", wiz).forEach((e) => (e.hidden = true));
    goStep(1);
  }

  wzDate.addEventListener("change", () => {
    const r = WW.schedule(wzDate.value);
    if (r.ok) {
      wizSched = r;
      wzDateErr.hidden = true;
      $$("[data-ws-out]", wzSched).forEach((dd) => (dd.textContent = r[dd.dataset.wsOut]));
      wzSched.hidden = false;
    } else {
      wizSched = null;
      wzSched.hidden = true;
      wzDateErr.textContent = r.reason;
      wzDateErr.hidden = false;
    }
  });

  function fieldError(input, show) {
    const field = input.closest(".field");
    field.classList.toggle("is-error", show);
    const err = $(".field-err", field);
    if (err) err.hidden = !show;
    return !show;
  }

  function validStep1() {
    if (!wzDate.value || !wizSched) {
      const r = WW.schedule(wzDate.value || "");
      wzDateErr.textContent = r.reason || "ご使用日を入力してください。";
      wzDateErr.hidden = false;
      wzDate.focus();
      return false;
    }
    return true;
  }
  function validStep2() {
    const shop = $("#wz-shop");
    const staff = $("#wz-staff");
    const tel = $("#wz-tel");
    const okShop = fieldError(shop, !shop.value.trim());
    const okStaff = fieldError(staff, !staff.value.trim());
    const okTel = fieldError(tel, tel.value.replace(/\D/g, "").length < 10);
    if (!okShop) shop.focus();
    else if (!okStaff) staff.focus();
    else if (!okTel) tel.focus();
    return okShop && okStaff && okTel;
  }

  wiz.addEventListener("click", (e) => {
    const next = e.target.closest("[data-wnext]");
    if (next) {
      const to = Number(next.dataset.wnext);
      if (to === 2 && !validStep1()) return;
      if (to === 3) {
        if (!validStep2()) return;
        $("#wz-confirm").innerHTML = [
          ["商品", `品番${current.code} ${current.name}（${current.type}）`],
          ["ご使用日", `${wizSched.use}（お届け ${wizSched.arrive} ／ ご返送 ${wizSched.ret}）`],
          ["予約締切", wizSched.deadline],
          ["店舗名", $("#wz-shop").value],
          ["ご担当者", $("#wz-staff").value],
          ["お電話", $("#wz-tel").value],
        ]
          .map(([t, d]) => `<div><dt>${t}</dt><dd class="num"></dd></div>`)
          .join("");
        // textContentで安全に流し込む
        const dds = $$("#wz-confirm dd");
        [
          `品番${current.code} ${current.name}（${current.type}）`,
          `${wizSched.use}（お届け ${wizSched.arrive} ／ ご返送 ${wizSched.ret}）`,
          wizSched.deadline,
          $("#wz-shop").value,
          $("#wz-staff").value,
          $("#wz-tel").value,
        ].forEach((v, i) => (dds[i].textContent = v));
      }
      goStep(to);
      return;
    }
    const back = e.target.closest("[data-wback]");
    if (back) goStep(Number(back.dataset.wback));
  });

  $("#wz-send").addEventListener("click", () => {
    $$(".wiz-pane", wiz).forEach((p) => (p.hidden = true));
    $$("#wiz-steps li").forEach((li) => {
      li.removeAttribute("aria-current");
      li.classList.add("is-done");
    });
    $("#wz-done-t").textContent =
      `品番${current.code}／ご使用日 ${wizSched.use}／${$("#wz-shop").value} ${$("#wz-staff").value}様`;
    const done = $("#wz-done");
    done.hidden = false;
    done.focus();
  });

  /* ============================================================
     比較トレイ（最大3着）
     ============================================================ */
  const MAX_CMP = 3;
  const selected = [];
  const tray = $("#tray");
  const trayItems = $("#tray-items");
  const trayOpen = $("#tray-open");

  function setPressed(code, on) {
    const btn = $(`.card-cmp[data-cmp="${code}"]`);
    if (btn) {
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute(
        "aria-label",
        on ? `品番${code}を比較リストから外す` : `品番${code}を比較リストに追加`
      );
    }
  }

  function renderTray() {
    $("#tray-n").textContent = selected.length;
    trayItems.innerHTML = "";
    selected.forEach((code) => {
      const p = byCode.get(code);
      const li = document.createElement("li");
      const im = document.createElement("img");
      im.src = WW.img(p);
      im.alt = "";
      im.width = 34;
      im.height = 46;
      im.loading = "lazy";
      const rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "×";
      rm.setAttribute("aria-label", `品番${code}を比較から外す`);
      rm.addEventListener("click", () => toggleCompare(code));
      li.append(im, rm);
      trayItems.appendChild(li);
    });
    tray.hidden = selected.length === 0;
    trayOpen.disabled = selected.length < 2;
    $("#fab").classList.toggle("is-lifted", !tray.hidden && matchMedia("(max-width: 760px)").matches);
  }

  function toggleCompare(code) {
    const i = selected.indexOf(code);
    if (i > -1) {
      selected.splice(i, 1);
      setPressed(code, false);
    } else {
      if (selected.length >= MAX_CMP) {
        toast("比較できるのは3着までです。どれかを外してから追加してください。");
        return;
      }
      selected.push(code);
      setPressed(code, true);
    }
    renderTray();
  }

  $("#tray-clear").addEventListener("click", () => {
    selected.slice().forEach((c) => setPressed(c, false));
    selected.length = 0;
    renderTray();
  });

  /* 比較ビュー */
  const cmpv = $("#cmpv");
  let cmpOpener = null;

  function cmpRow(label, cells) {
    return `<tr><th scope="row">${label}</th>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function openCompare() {
    const ps = selected.map((c) => byCode.get(c));
    const rows = [
      cmpRow("写真", ps.map((p) => `<img class="cmp-img" src="${WW.img(p)}" alt="品番${p.code} ${esc(p.name)}" width="642" height="900" loading="lazy">`)),
      cmpRow("品番", ps.map((p) => `<span class="cmp-code num">${p.code}</span><br><button type="button" class="btn btn-ghost cmp-open" data-open="${p.code}">詳細を見る</button>`)),
      cmpRow("カラー", ps.map((p) => `<span class="dot" style="background:${WW.colorChips[p.color]};display:inline-block;vertical-align:-1px;margin-right:6px"></span>${esc(p.name)}`)),
      cmpRow("タイプ", ps.map((p) => esc(p.type))),
      cmpRow("ライン", ps.map((p) => (p.line ? esc(WW.lineNames[p.line]) : "—"))),
      cmpRow("サイズ", ps.map((p) => esc(p.size || "—"))),
      cmpRow("素材", ps.map((p) => esc(p.material || "—"))),
      cmpRow("光沢", ps.map((p) => stars(p.luster))),
      cmpRow("その他", ps.map((p) => esc(p.other || "—"))),
    ];
    $("#cmp-table").innerHTML = `<tbody>${rows.join("")}</tbody>`;
    cmpOpener = document.activeElement;
    cmpv.hidden = false;
    lock();
    $("#cmpv-x").focus();
  }
  function closeCompare() {
    if (cmpv.hidden) return;
    cmpv.hidden = true;
    unlock();
    if (cmpOpener) cmpOpener.focus();
  }
  trayOpen.addEventListener("click", openCompare);
  $("#cmpv-x").addEventListener("click", closeCompare);
  cmpv.addEventListener("click", (e) => {
    if (e.target === cmpv) closeCompare();
    const open = e.target.closest("[data-open]");
    if (open) {
      closeCompare();
      openPanel(open.dataset.open);
    }
  });
  cmpv.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCompare();
    if (e.key === "Tab") trapTab(cmpv, e);
  });

  /* ---- グリッドのイベント委任 ---- */
  $("#grid").addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]");
    if (open) {
      openPanel(open.dataset.open);
      return;
    }
    const cmp = e.target.closest("[data-cmp]");
    if (cmp) toggleCompare(cmp.dataset.cmp);
  });

  /* ============================================================
     納期チェッカー
     ============================================================ */
  const dvErr = $("#dv-err");
  const dvTl = $("#dv-tl");

  $("#dv-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const r = WW.schedule($("#dv-date").value || "");
    if (!r.ok) {
      dvTl.hidden = true;
      dvErr.textContent = r.reason;
      dvErr.hidden = false;
      return;
    }
    dvErr.hidden = true;
    $$("[data-dv]", dvTl).forEach((b) => (b.textContent = r[b.dataset.dv]));
    dvTl.hidden = false;
    $("#dv-note").textContent = `出荷前日24:00まで予約受付（翌日が平日の場合）。${r.note}`;
  });

  /* 最短お届けカウンター（今日+3日を起点にWW.scheduleで算出） */
  (() => {
    const today = new Date();
    for (let d = 3; d <= 10; d++) {
      const r = WW.schedule(isoLocal(addDays(today, d)));
      if (r.ok) {
        $("#dv-fast").textContent = r.arrive;
        return;
      }
    }
    $("#dv-fast").textContent = "—";
  })();

  /* ============================================================
     FAQ / フォーム(デモ) / デスク
     ============================================================ */
  $$(".faq-q").forEach((q) => {
    q.addEventListener("click", () => {
      const on = q.getAttribute("aria-expanded") === "true";
      q.setAttribute("aria-expanded", String(!on));
      q.closest(".faq-item").querySelector(".faq-a").hidden = on;
    });
  });

  $("#dc-assets").addEventListener("click", () =>
    toast("販促素材ダウンロードはデモのため省略しています。")
  );

  const rcForm = $("#rc-form");
  rcForm.addEventListener("submit", (e) => {
    e.preventDefault();
    let firstBad = null;
    $$("[required]", rcForm).forEach((input) => {
      let bad = !input.value.trim();
      if (!bad && input.type === "email") bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
      fieldError(input, bad);
      if (bad && !firstBad) firstBad = input;
    });
    if (firstBad) {
      firstBad.focus();
      return;
    }
    rcForm.hidden = true;
    const done = $("#rc-done");
    done.hidden = false;
    done.focus();
  });
})();
