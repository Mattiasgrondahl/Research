/* ============================================================
   NOCTURNE deck engine — zero dependencies.
   Slides: <section class="slide" data-time="2" data-notes optional via <aside class="notes">>
   Interactions: .quiz[data-answer] / .poll / [data-widget="name"] handled by
   window.DeckWidgets registry (decks register their own).
   Keys: ←→ Space PgUp/Dn Home End O S F T ?  | swipe supported.
   ============================================================ */
(function () {
  "use strict";

  var meta = {
    brand: document.body.dataset.brand || "NOCTURNE",
    title: document.body.dataset.title || document.title,
    duration: parseInt(document.body.dataset.duration || "30", 10) // minutes
  };

  /* ---------- chrome ---------- */
  function el(tag, id, cls, html) {
    var n = document.createElement(tag);
    if (id) n.id = id;
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  var gridTex = el("div", "grid-tex");
  var progress = el("div", "progress");
  var wrap = el("div", "stage-wrap"); wrap.id = "stage-wrap";
  var stage = document.getElementById("stage") || el("div", "stage");
  wrap.appendChild(stage);

  var hud = el("div", "hud");
  hud.innerHTML =
    '<b class="d-title"></b><span class="sep">│</span>' +
    '<span class="slide-no">–</span><span class="sep">│</span>' +
    '<span class="sec-name"></span><span class="sep">│</span>' +
    '<span class="timer" title="T to start/pause, R to reset">–:––</span>';
  var navPrev = el("div", "nav-prev", "nav-btn", "←");
  var navNext = el("div", "nav-next", "nav-btn", "→");

  var notes = el("div", "notes"); notes.id = "notes";
  var overview = el("div", "overview"); overview.id = "overview";
  overview.innerHTML = '<h4>Overview — click a slide to jump · Esc to close</h4><div id="ov-grid"></div>';
  var help = el("div", "help"); help.id = "help";
  help.innerHTML =
    '<div class="sheet"><h4>⌨ Deck controls</h4>' +
    '<table class="t"><tbody>' +
    '<tr><td><kbd>→</kbd> <kbd>Space</kbd> <kbd>PageDown</kbd></td><td>next fragment / slide</td></tr>' +
    '<tr><td><kbd>←</kbd> <kbd>PageUp</kbd></td><td>previous (hides fragments first)</td></tr>' +
    '<tr><td><kbd>Home</kbd> / <kbd>End</kbd></td><td>first / last slide</td></tr>' +
    '<tr><td><kbd>O</kbd></td><td>overview grid</td></tr>' +
    '<tr><td><kbd>S</kbd></td><td>speaker notes + time budget</td></tr>' +
    '<tr><td><kbd>T</kbd> / <kbd>R</kbd></td><td>start-pause 30-min timer / reset</td></tr>' +
    '<tr><td><kbd>F</kbd></td><td>fullscreen</td></tr>' +
    '<tr><td><kbd>?</kbd></td><td>this help</td></tr>' +
    '</tbody></table></div>';

  document.body.appendChild(gridTex);
  document.body.appendChild(progress);
  document.body.appendChild(wrap);
  document.body.appendChild(hud);
  document.body.appendChild(navPrev);
  document.body.appendChild(navNext);
  document.body.appendChild(notes);
  document.body.appendChild(overview);
  document.body.appendChild(help);

  /* ---------- slides ---------- */
  var slides = Array.prototype.slice.call(stage.querySelectorAll(":scope > .slide"));
  if (!slides.length) return;
  slides.forEach(function (s, i) {
    if (!s.dataset.brand) s.dataset.brand = meta.brand;
    var pn = el("div", null, "pageno");
    pn.textContent = (i + 1) + " / " + slides.length;
    s.appendChild(pn);
  });

  var cur = -1, fragIdx = 0;
  var sections = []; // {startIdx, name, minutes}
  slides.forEach(function (s, i) {
    if (s.classList.contains("s-section") || s.dataset.section) {
      sections.push({ start: i, name: s.dataset.section || (s.querySelector("h2") || {}).textContent || "Section", minutes: parseFloat(s.dataset.time || "0") });
    }
  });

  function sectionOf(i) {
    var name = "";
    for (var k = 0; k < sections.length; k++) if (sections[k].start <= i) name = sections[k].name;
    return name;
  }
  function budgetTo(i) { // cumulative minutes up to slide i
    var t = 0;
    for (var k = 0; k < i; k++) t += parseFloat(slides[k].dataset.time || "0");
    return t;
  }

  /* ---------- scaling ---------- */
  function fit() {
    var pad = 34;
    var s = Math.min((window.innerWidth - pad) / 1280, (window.innerHeight - pad) / 720);
    s = Math.min(s, 1.35);
    stage.style.transform = "scale(" + s.toFixed(4) + ")";
  }
  window.addEventListener("resize", fit);

  /* ---------- state ---------- */
  function renderNotes() {
    var s = slides[cur];
    var n = s.querySelector("aside.notes");
    var budget = parseFloat(s.dataset.time || "0");
    var total = budgetTo(slides.length);
    var to = budgetTo(cur);
    notes.innerHTML = '<div class="nlabel">Speaker notes · slide ' + (cur + 1) +
      (budget ? ' · this slide ≈ <span class="timebudget">' + budget + " min</span>" : "") +
      (total ? ' · position <span class="timebudget">' + to.toFixed(1) + "–" + (to + budget).toFixed(1) + " / " + total.toFixed(1) + " min</span>" : "") +
      "</div>" + (n ? n.innerHTML : "<i>No notes for this slide.</i>");
  }

  function updateHud() {
    hud.querySelector(".d-title").textContent = meta.title;
    hud.querySelector(".slide-no").textContent = (cur + 1) + "/" + slides.length;
    hud.querySelector(".sec-name").textContent = sectionOf(cur);
    progress.style.width = ((cur + 1) / slides.length * 100) + "%";
  }

  function go(i, noHash) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === cur && slides[cur].classList.contains("active")) return;
    var prev = slides[cur];
    if (prev) { prev.classList.remove("active"); prev.querySelectorAll(".frag.on").forEach(function (f) { f.classList.remove("on"); }); }
    cur = i; fragIdx = 0;
    slides[cur].classList.add("active");
    if (!noHash) location.hash = "s" + (cur + 1);
    updateHud(); renderNotes();
    if (window.DECK && typeof window.DECK.onSlide === "function") {
      try { window.DECK.onSlide(cur, slides[cur]); } catch (e) { console.warn("onSlide widget error", e); }
    }
    for (var hk = 0; hk < slideHooks.length; hk++) {
      try { slideHooks[hk](cur, slides[cur]); } catch (e) { console.warn("slideHook error", e); }
    }
  }

  function next() {
    var frags = slides[cur].querySelectorAll(".frag");
    if (fragIdx < frags.length) { frags[fragIdx].classList.add("on"); fragIdx++; return; }
    if (cur < slides.length - 1) go(cur + 1);
  }
  function prev() {
    var frags = slides[cur].querySelectorAll(".frag");
    if (fragIdx > 0) { fragIdx--; frags[fragIdx].classList.remove("on"); return; }
    if (cur > 0) {
      go(cur - 1);
      var pf = slides[cur].querySelectorAll(".frag");
      pf.forEach(function (f) { f.classList.add("on"); });
      fragIdx = pf.length;
    }
  }

  /* ---------- quiz ---------- */
  var state = { answered: {}, total: 0 };
  window.DeckState = state;
  function bindQuizzes(root) {
    root.querySelectorAll(".quiz").forEach(function (qz, qi) {
      if (qz.__qbound) return; qz.__qbound = true;
      var answer = (qz.dataset.answer || "a").trim().toLowerCase();
      var opts = Array.prototype.slice.call(qz.querySelectorAll(".q-opt"));
      state.total++;
      var id = qz.dataset.qid || ("q" + qi);
      opts.forEach(function (o, oi) {
        var letter = String.fromCharCode(97 + oi); // a,b,c...
        if (!o.querySelector(".key")) o.insertAdjacentHTML("afterbegin", '<span class="key">' + letter.toUpperCase() + "</span>");
        o.addEventListener("click", function () {
          if (qz.classList.contains("answered")) return;
          if (letter === answer || String(oi) === answer) {
            o.classList.add("correct");
            opts.forEach(function (x) { if (x !== o) x.classList.add("dimmed"); });
            qz.classList.add("answered");
            if (!state.answered[id]) { state.answered[id] = true; }
          } else {
            o.classList.add("wrong");
            state.answered[id] = state.answered[id] === true ? state.answered[id] : false;
            setTimeout(function () { o.classList.remove("wrong"); }, 500);
          }
        });
      });
    });
  }

  function refreshScores() {
    var right = Object.keys(state.answered).filter(function (k) { return state.answered[k] === true; }).length;
    stage.querySelectorAll("[data-score]").forEach(function (n) {
      n.textContent = right + " / " + state.total;
    });
    stage.querySelectorAll("[data-score-pct]").forEach(function (n) {
      n.textContent = (state.total ? Math.round(right / state.total * 100) : 0) + "%";
    });
  }

  /* ---------- poll ---------- */
  function bindPolls(root) {
    root.querySelectorAll(".poll").forEach(function (pl) {
      if (pl.__pbound) return; pl.__pbound = true;
      var opts = Array.prototype.slice.call(pl.querySelectorAll(".p-opt"));
      var votes = opts.map(function (o) { return parseFloat(o.dataset.weight || "1"); });
      var voted = -1;
      function render() {
        var sum = votes.reduce(function (a, b) { return a + b; }, 0);
        opts.forEach(function (o, i) {
          var pc = Math.max(2, Math.round(votes[i] / sum * 100));
          o.querySelector(".p-fill").style.width = pc + "%";
          o.querySelector(".pc").textContent = Math.round(votes[i] / sum * 100) + "%";
          o.classList.toggle("voted", voted === i);
        });
      }
      opts.forEach(function (o, i) {
        o.addEventListener("click", function () {
          if (voted >= 0) return;
          voted = i; votes[i] += Math.max(1, sum0());
          render();
        });
      });
      function sum0() { return Math.max(1, Math.round(votes.reduce(function (a, b) { return a + b; }, 0) * 0.08)); }
      render();
    });
  }

  /* ---------- widgets registry ---------- */
  window.DeckWidgets = window.DeckWidgets || {};

  /* slide-change hooks: widgets use these to stop timers/animations when the
     presenter leaves the slide. Returns an unsubscribe function.             */
  var slideHooks = [];
  window.DeckHooks = {
    onSlideChange: function (fn) {
      slideHooks.push(fn);
      return function () {
        var k = slideHooks.indexOf(fn);
        if (k >= 0) slideHooks.splice(k, 1);
      };
    }
  };

  function initWidgets() {
    stage.querySelectorAll("[data-widget]").forEach(function (w) {
      var name = w.dataset.widget;
      var impl = window.DeckWidgets[name];
      if (typeof impl === "function") {
        try { impl(w, window.DECK); } catch (e) { console.warn("widget " + name + " failed:", e); w.innerHTML = '<div class="mut">[widget ' + name + ' failed to init]</div>'; }
      } else {
        console.warn("[deck] no implementation registered for widget \"" + name + "\" — load template/widgets.js before deck.js");
      }
    });
  }

  /* ---------- overview ---------- */
  function buildOverview() {
    var g = overview.querySelector("#ov-grid");
    if (g.childElementCount) return;
    slides.forEach(function (s, i) {
      var card = el("div", null, "ov-card" + (i === cur ? " cur" : ""));
      var mini = el("div", null, "mini");
      var clone = s.cloneNode(true);
      clone.classList.add("active");
      clone.querySelectorAll(".frag").forEach(function (f) { f.classList.add("on"); });
      mini.appendChild(clone);
      var t = (s.querySelector("h1,h2,h3") || {}).textContent || "slide";
      var cap = el("div", null, "cap");
      cap.innerHTML = "<span>" + t.slice(0, 28) + "</span><span>" + (i + 1) + "</span>";
      card.appendChild(mini); card.appendChild(cap);
      card.addEventListener("click", function () { toggleOverview(false); go(i); });
      g.appendChild(card);
    });
  }
  function toggleOverview(force) {
    var open = force !== undefined ? force : !overview.classList.contains("open");
    if (open) buildOverview();
    overview.classList.toggle("open", open);
    overview.querySelectorAll(".ov-card.cur").forEach(function (c) { c.classList.remove("cur"); });
    if (open) {
      var cards = overview.querySelectorAll(".ov-card");
      if (cards[cur]) cards[cur].classList.add("cur");
    }
  }

  /* ---------- timer ---------- */
  var timer = { left: meta.duration * 60, on: false, h: null };
  var tEl = hud.querySelector(".timer");
  function fmt(s) {
    var over = s < 0; s = Math.abs(s);
    var m = Math.floor(s / 60), r = s % 60;
    return (over ? "+" : "") + m + ":" + (r < 10 ? "0" : "") + r;
  }
  function tick() {
    timer.left--;
    tEl.textContent = (timer.left > 0 ? "⏳ " : "⏰ ") + fmt(timer.left);
    tEl.classList.toggle("warn", timer.left <= 300 && timer.left > 0);
    tEl.classList.toggle("over", timer.left <= 0);
  }
  function timerToggle() {
    timer.on = !timer.on;
    if (timer.on) { timer.h = setInterval(tick, 1000); }
    else { clearInterval(timer.h); }
    tEl.textContent = timer.on ? "⏳ " + fmt(timer.left) : fmt(timer.left);
  }
  function timerReset() {
    clearInterval(timer.h); timer.on = false; timer.left = meta.duration * 60;
    tEl.textContent = "–:––"; tEl.classList.remove("warn", "over");
  }
  tEl.textContent = fmt(timer.left);
  tEl.style.cursor = "pointer";
  tEl.addEventListener("click", timerToggle);

  /* ---------- keyboard / pointer ---------- */
  document.addEventListener("keydown", function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    switch (e.key) {
      case "ArrowRight": case " ": case "PageDown": case "l": e.preventDefault(); next(); break;
      case "ArrowLeft": case "PageUp": case "h": e.preventDefault(); prev(); break;
      case "Home": e.preventDefault(); go(0); break;
      case "End": e.preventDefault(); go(slides.length - 1); break;
      case "o": case "O": toggleOverview(); break;
      case "Escape": toggleOverview(false); help.classList.remove("open"); break;
      case "s": case "S": notes.classList.toggle("open"); break;
      case "f": case "F":
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(function () {});
        break;
      case "t": case "T": timerToggle(); break;
      case "r": case "R": timerReset(); break;
      case "?": case "h ": help.classList.toggle("open"); break;
    }
  });
  navNext.addEventListener("click", next);
  navPrev.addEventListener("click", prev);
  help.addEventListener("click", function () { help.classList.remove("open"); });

  var tx = null;
  stage.addEventListener("touchstart", function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 48) (dx < 0 ? next : prev)();
    tx = null;
  }, { passive: true });

  /* generic data hooks: <button data-next> <a data-goto="12"> */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-next],[data-goto]");
    if (!t) return;
    if (t.hasAttribute("data-next")) next();
    else if (t.dataset.goto) go(parseInt(t.dataset.goto, 10) - 1);
  });

  /* ---------- public API ---------- */
  window.DECK = {
    go: go, next: next, prev: prev,
    slideIndex: function () { return cur; },
    slides: slides,
    state: state,
    refreshScores: refreshScores,
    afterContentChanged: function () { bindQuizzes(stage); bindPolls(stage); }
  };

  /* ---------- boot ---------- */
  bindQuizzes(stage);
  bindPolls(stage);
  initWidgets();
  fit();
  var m = /^#s(\d+)$/.exec(location.hash || "");
  go(m ? parseInt(m[1], 10) - 1 : 0, true);
  window.addEventListener("hashchange", function () {
    var mm = /^#s(\d+)$/.exec(location.hash || "");
    if (mm) go(parseInt(mm[1], 10) - 1, true);
  });
  setInterval(refreshScores, 1200);
  document.addEventListener("fullscreenchange", fit);
})();
