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

  var track = document.getElementById("cat-track");
  var thumbs = document.getElementById("cat-thumbs");
  var indexBtn = document.getElementById("cat-index");
  var prevBtn = document.getElementById("cat-prev");
  var nextBtn = document.getElementById("cat-next");
  var countEl = document.getElementById("cat-count");
  var range = document.getElementById("cat-range");

  var built = false;
  var current = 1;

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  /* 1画面に何ページ映っているか。CSSのブレークポイントと合わせる必要はなく、
     実測（トラック幅 ÷ ページ幅）で出すのでCSS側を変えても壊れない */
  function perView() {
    var first = track.firstElementChild;
    if (!first) return 1;
    var w = first.getBoundingClientRect().width;
    if (!w) return 1;
    return Math.max(1, Math.round(track.clientWidth / w));
  }

  function pageWidth() {
    var first = track.firstElementChild;
    return first ? first.getBoundingClientRect().width : track.clientWidth;
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

  window.WWCatalog = {
    open: function (page) {
      build();
      dialog.showModal();
      /* showModal 直後は レイアウト未確定でページ幅が取れない */
      requestAnimationFrame(function () {
        goTo(page || current, false);
        track.focus({ preventScroll: true });
      });
    }
  };
})();
