/* =========================================================
   with a WISH — Maison Formal
   catalog.js: デジタルカタログ（冊子ビューア）

   ページ送りは CSS の scroll-snap に任せる。SPのスワイプはブラウザ標準の
   慣性がそのまま使えて、JSでドラッグを実装するより滑らかで軽い。
   JSがやるのは「開く／位置を読む／位置へ飛ぶ」の3つだけ。

   公開: window.WWCatalog.open()
   ========================================================= */
(function () {
  "use strict";

  var PAGES = 58;
  var DIR = "assets/catalog/";
  var W = 1200;
  var H = 1683;
  /* 開いた直後に見える範囲だけ先に読む。残りは lazy に任せる */
  var EAGER = 4;

  var dialog = document.getElementById("catalog-dialog");
  if (!dialog) return;

  var stage = dialog.querySelector(".cat-stage");
  var track = document.getElementById("cat-track");
  var thumbs = document.getElementById("cat-thumbs");
  var indexBtn = document.getElementById("cat-index");
  var prevBtn = document.getElementById("cat-prev");
  var nextBtn = document.getElementById("cat-next");
  var countEl = document.getElementById("cat-count");
  var range = document.getElementById("cat-range");
  var zoomInBtn = document.getElementById("cat-zoom-in");
  var zoomOutBtn = document.getElementById("cat-zoom-out");
  var zoomResetBtn = document.getElementById("cat-zoom-reset");
  var zoomVal = document.getElementById("cat-zoom-val");
  var hint = document.getElementById("cat-hint");

  var built = false;
  var current = 1;

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  /* 1画面に何ページ映っているか。CSSのブレークポイントと合わせる必要はなく、
     実測（トラック幅 ÷ ページ幅）で出すのでCSS側を変えても壊れない */
  function perView() {
    var w = pageWidth();
    if (!w) return 1;
    return Math.max(1, Math.round(track.clientWidth / w));
  }

  /* getBoundingClientRect は祖先の transform を含む。拡大中にそのまま使うと
     ページ幅が zoom 倍で返り、ページ送りの計算が全部ずれる */
  function pageWidth() {
    var first = track.firstElementChild;
    if (!first) return track.clientWidth;
    return first.getBoundingClientRect().width / zoom;
  }

  function build() {
    if (built) return;
    var pageFrag = document.createDocumentFragment();
    var thumbFrag = document.createDocumentFragment();

    for (var n = 1; n <= PAGES; n++) {
      var fig = document.createElement("div");
      fig.className = "cat-page";

      var img = document.createElement("img");
      img.src = DIR + "pages/" + pad(n) + ".webp";
      img.alt = "カタログ " + n + "ページ";
      img.width = W;
      img.height = H;
      img.decoding = "async";
      if (n > EAGER) img.loading = "lazy";
      fig.appendChild(img);
      pageFrag.appendChild(fig);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cat-thumb";
      btn.setAttribute("data-page", String(n));
      var timg = document.createElement("img");
      timg.src = DIR + "thumbs/" + pad(n) + ".webp";
      timg.alt = "";
      timg.width = 220;
      timg.height = 309;
      timg.loading = "lazy";
      timg.decoding = "async";
      var label = document.createElement("span");
      label.textContent = String(n);
      btn.appendChild(timg);
      btn.appendChild(label);
      btn.setAttribute("aria-label", n + "ページへ移動");
      thumbFrag.appendChild(btn);
    }

    track.appendChild(pageFrag);
    thumbs.appendChild(thumbFrag);
    built = true;
  }

  function syncLabel() {
    var per = perView();
    var last = Math.min(current + per - 1, PAGES);
    countEl.textContent = per > 1 && last > current
      ? current + "–" + last + " / " + PAGES + " ページ"
      : current + " / " + PAGES + " ページ";

    if (String(range.value) !== String(current)) range.value = String(current);
    prevBtn.disabled = current <= 1;
    nextBtn.disabled = last >= PAGES;

    var marked = thumbs.querySelector('[aria-current="true"]');
    if (marked) marked.removeAttribute("aria-current");
    var now = thumbs.children[current - 1];
    if (now) now.setAttribute("aria-current", "true");
  }

  function readPosition() {
    var w = pageWidth();
    if (!w) return;
    current = Math.min(PAGES, Math.max(1, Math.round(track.scrollLeft / w) + 1));
    syncLabel();
  }

  /* 見開き表示では偶数ページ単独にスナップ位置がない。奇数側へ丸める */
  function normalize(n) {
    var per = perView();
    if (per > 1) n = n - ((n - 1) % per);
    return Math.min(PAGES, Math.max(1, n));
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function goTo(n, smooth) {
    /* 拡大したままページを送ると、次の誌面がいきなり切り取られた状態で出る */
    resetZoom();
    var target = normalize(n);
    track.scrollTo({
      left: pageWidth() * (target - 1),
      behavior: (smooth === false || reduceMotion) ? "auto" : "smooth"
    });
    current = target;
    syncLabel();
  }

  function step(dir) {
    goTo(current + dir * perView());
  }

  /* =======================================================
     拡大・移動
     誌面ごとではなくトラックごと拡大する。SPの1ページでもPCの見開きでも
     「いま見えている画面をそのまま虫眼鏡で覗く」挙動になり、綴じ側で
     切れることもない。はみ出しは .cat-stage の overflow:hidden で切る。
     ======================================================= */
  var MIN_Z = 1;
  var MAX_Z = 4;
  var STEP = 0.5;
  var zoom = 1;
  var panX = 0;
  var panY = 0;

  function clampPan() {
    /* 拡大ぶんの余白の半分までしか動かせない（＝誌面の外は見せない） */
    var maxX = track.clientWidth * (zoom - 1) / 2;
    var maxY = track.clientHeight * (zoom - 1) / 2;
    panX = Math.min(maxX, Math.max(-maxX, panX));
    panY = Math.min(maxY, Math.max(-maxY, panY));
  }

  function applyZoom() {
    clampPan();
    var zoomed = zoom > MIN_Z;
    track.style.transform = zoomed
      ? "translate(" + panX + "px, " + panY + "px) scale(" + zoom + ")"
      : "";
    stage.classList.toggle("is-zoomed", zoomed);
    hint.hidden = !zoomed;
    zoomVal.textContent = Math.round(zoom * 100) + "%";
    zoomOutBtn.disabled = zoom <= MIN_Z;
    zoomInBtn.disabled = zoom >= MAX_Z;
    zoomResetBtn.disabled = !zoomed;
    /* overflow を切り替えるとスクロール位置が飛ぶことがある。今のページに戻す */
    if (built) track.scrollLeft = pageWidth() * (current - 1);
  }

  function resetZoom() {
    if (zoom === MIN_Z && !panX && !panY) return;
    zoom = MIN_Z;
    panX = 0;
    panY = 0;
    applyZoom();
  }

  /* 指定した画面座標を動かさずに倍率だけ変える（つまんだ点が逃げない）。
     基準は transform のかかっていない .cat-stage 側から取る。トラックの
     rect は移動ぶんを含んでしまい、pan を二重に引くことになる */
  function zoomAt(clientX, clientY, next) {
    var z = Math.min(MAX_Z, Math.max(MIN_Z, next));
    var r = stage.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var contentX = (clientX - cx - panX) / zoom;
    var contentY = (clientY - cy - panY) / zoom;
    panX = clientX - cx - contentX * z;
    panY = clientY - cy - contentY * z;
    zoom = z;
    if (zoom === MIN_Z) { panX = 0; panY = 0; }
    applyZoom();
  }

  function zoomFromCenter(next) {
    var r = stage.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, next);
  }

  zoomInBtn.addEventListener("click", function () { zoomFromCenter(zoom + STEP); });
  zoomOutBtn.addEventListener("click", function () { zoomFromCenter(zoom - STEP); });
  zoomResetBtn.addEventListener("click", resetZoom);

  /* ダブルクリック／ダブルタップで等倍↔2倍 */
  track.addEventListener("dblclick", function (event) {
    zoomAt(event.clientX, event.clientY, zoom > MIN_Z ? MIN_Z : 2);
  });

  /* PCの慣習に合わせ、Ctrl(⌘)+ホイールを拡大に割り当てる。
     素のホイールを奪うとページ内スクロールの感覚が壊れる */
  track.addEventListener("wheel", function (event) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, zoom - Math.sign(event.deltaY) * 0.25);
  }, { passive: false });

  /* ---------- ドラッグで移動 / 2本指でつまんで拡大 ---------- */
  /* CSS の -webkit-user-drag だけでは Firefox 等で画像ドラッグが残る */
  track.addEventListener("dragstart", function (event) { event.preventDefault(); });

  var pointers = new Map();
  var dragFrom = null;
  var pinchFrom = null;

  function pointerList() {
    return Array.from(pointers.values());
  }

  track.addEventListener("pointerdown", function (event) {
    pointers.set(event.pointerId, event);
    if (pointers.size === 2) {
      dragFrom = null;
      var p = pointerList();
      pinchFrom = {
        dist: Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY),
        zoom: zoom
      };
      return;
    }
    if (zoom <= MIN_Z) return;
    /* 捕捉できなくても移動自体は成立させる（枠外で指を離すと止まるだけ） */
    try { track.setPointerCapture(event.pointerId); } catch (e) {}
    track.classList.add("is-grabbing");
    dragFrom = { x: event.clientX, y: event.clientY, panX: panX, panY: panY };
  });

  track.addEventListener("pointermove", function (event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, event);

    if (pinchFrom && pointers.size === 2) {
      var p = pointerList();
      var dist = Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY);
      if (!pinchFrom.dist) return;
      zoomAt(
        (p[0].clientX + p[1].clientX) / 2,
        (p[0].clientY + p[1].clientY) / 2,
        pinchFrom.zoom * (dist / pinchFrom.dist)
      );
      return;
    }

    if (!dragFrom) return;
    panX = dragFrom.panX + (event.clientX - dragFrom.x);
    panY = dragFrom.panY + (event.clientY - dragFrom.y);
    applyZoom();
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchFrom = null;
    if (pointers.size === 0) {
      dragFrom = null;
      track.classList.remove("is-grabbing");
    }
  }
  track.addEventListener("pointerup", endPointer);
  track.addEventListener("pointercancel", endPointer);

  /* スクロール中に毎フレーム読むと重い。落ち着いてから1回だけ読む */
  var settleTimer = null;
  track.addEventListener("scroll", function () {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(readPosition, 90);
  }, { passive: true });

  prevBtn.addEventListener("click", function () { step(-1); });
  nextBtn.addEventListener("click", function () { step(1); });

  range.addEventListener("input", function () {
    goTo(parseInt(range.value, 10) || 1, false);
  });

  indexBtn.addEventListener("click", function () {
    var open = thumbs.hidden;
    thumbs.hidden = !open;
    indexBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      var now = thumbs.children[current - 1];
      if (now) now.scrollIntoView({ block: "nearest" });
    }
  });

  thumbs.addEventListener("click", function (event) {
    var btn = event.target.closest(".cat-thumb");
    if (!btn) return;
    goTo(parseInt(btn.getAttribute("data-page"), 10), false);
  });

  dialog.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
    if (event.key === "+" || event.key === "=") { event.preventDefault(); zoomFromCenter(zoom + STEP); }
    if (event.key === "-") { event.preventDefault(); zoomFromCenter(zoom - STEP); }
    if (event.key === "0") { event.preventDefault(); resetZoom(); }
  });

  /* SP↔PC をまたぐと1画面のページ数が変わる。今のページを先頭にして開き直す */
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (!dialog.open) return;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { goTo(current, false); }, 150);
  });

  dialog.addEventListener("click", function (event) {
    if (event.target.closest("[data-close]")) dialog.close();
  });

  /* 次に開いたとき前回の倍率が残っていると、いきなり誌面の一部が出る */
  dialog.addEventListener("close", resetZoom);

  window.WWCatalog = {
    open: function (page) {
      build();
      dialog.showModal();
      /* showModal 直後は レイアウト未確定でページ幅が取れない */
      requestAnimationFrame(function () {
        goTo(page || current, false);
        applyZoom();
        track.focus({ preventScroll: true });
      });
    }
  };
})();
