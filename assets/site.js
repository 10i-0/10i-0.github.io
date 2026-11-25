// zero@404 writeups: small enhancements for the static pages.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Copy buttons on terminal blocks: copy only the commands, never the prompt or output
  $$(".term .cp").forEach((b) => b.addEventListener("click", async () => {
    const text = $$(".cmdtext", b.closest(".term")).map((s) => s.innerText).join("\n");
    try { await navigator.clipboard.writeText(text); } catch (_) {}
    const l = $("span", b); l.textContent = "Copied"; b.classList.add("done");
    setTimeout(() => { l.textContent = "Copy"; b.classList.toggle("done", false); }, 1400);
  }));

  // Click a screenshot to see it larger
  const box = document.createElement("div");
  box.className = "lightbox"; document.body.appendChild(box);
  $$("[data-zoom]").forEach((s) => s.addEventListener("click", () => {
    box.innerHTML = ""; box.appendChild($("img", s).cloneNode()); box.classList.add("on");
  }));
  box.addEventListener("click", () => box.classList.toggle("on", false));
  $$("[data-zoom]").forEach((s) => s.addEventListener("click", () => requestAnimationFrame(() => box.classList.add("on"))));
  addEventListener("keydown", (e) => { if (e.key === "Escape") box.classList.toggle("on", false); });

  // Back button: return to the list where you were, if you came from it
  const back = $(".back");
  if (back && document.referrer.startsWith(location.origin) && history.length > 1) {
    back.addEventListener("click", (e) => { e.preventDefault(); history.back(); });
  }

  // Reading progress + "On this page" highlight
  const art = $("article"), bar = $(".progress");
  const onScroll = () => {
    if (!art || !bar) return;
    const r = art.getBoundingClientRect(), total = art.offsetHeight - innerHeight;
    bar.style.width = Math.max(0, Math.min(100, (-r.top + 60) / Math.max(1, total) * 100)) + "%";
    let cur = null; $$("article h2[id]").forEach((h) => { if (h.getBoundingClientRect().top < 120) cur = h.id; });
    $$(".toc a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + cur));
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const hdr = $("header");
  const onHdr = () => hdr && hdr.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onHdr, { passive: true }); onHdr();

  // Home: search and platform filter
  const q = $("#q");
  if (q) {
    let plat = new URLSearchParams(location.search).get("p") || "All";
    const apply = () => {
      const s = q.value.trim().toLowerCase(); let shown = 0;
      $$(".item").forEach((li) => {
        const ok = (plat === "All" || li.dataset.platform === plat) && li.dataset.search.includes(s);
        li.hidden = !ok; if (ok) shown++;
      });
      $$(".year-group").forEach((g) => (g.hidden = !$$(".item", g).some((li) => !li.hidden)));
      $("#empty").hidden = shown > 0;
    };
    q.addEventListener("input", apply); apply();
    const sub = document.querySelector(".intro .plat"); if (sub && plat !== "All") sub.textContent = plat;
    addEventListener("keydown", (e) => { if (e.key === "/" && document.activeElement !== q) { e.preventDefault(); q.focus(); } });
  }
  // CTF menu: open on click (hover opens it too, see CSS); close on outside click / Escape
  const dd = $(".dd");
  if (dd) {
    $(".ddb", dd).addEventListener("click", (e) => { e.stopPropagation(); dd.classList.toggle("open"); });
    addEventListener("click", () => dd.classList.remove("open"));
    addEventListener("keydown", (e) => { if (e.key === "Escape") dd.classList.remove("open"); });
  }
  // home: type the prompt command
  const ty = $(".typed");
  if (ty) {
    const s = ty.dataset.text; let i = 0;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) ty.textContent = s;
    else { const tick = () => { ty.textContent = s.slice(0, ++i); if (i < s.length) setTimeout(tick, 55); }; setTimeout(tick, 250); }
  }
  // ---------- motion ----------
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // attack path hops light up one after another
  $$(".path li").forEach((li, i) => (li.style.animationDelay = (0.45 + i * 0.09) + "s"));

  // reveal on scroll: headings, steps, screenshots, why-boxes
  const targets = $$("article h2, article .step, article figure, article .why");
  targets.forEach((el) => el.classList.add("rv"));

  // type the commands of a terminal window when it scrolls into view
  const typeTerm = (term) => {
    if (still || term.dataset.typed) return; term.dataset.typed = 1;
    const spans = $$(".cmdtext", term); if (!spans.length) return;
    const full = spans.map((s) => s.textContent); spans.forEach((s) => (s.textContent = ""));
    let k = 0;
    const next = () => {
      if (k >= spans.length) return;
      const s = spans[k], txt = full[k]; s.classList.add("typing");
      const step = Math.max(1, Math.ceil(txt.length / 28)); let i = 0;
      const tick = () => {
        i = Math.min(txt.length, i + step); s.textContent = txt.slice(0, i);
        if (i < txt.length) setTimeout(tick, 16);
        else { s.classList.toggle("typing", false); k++; setTimeout(next, 90); }
      };
      tick();
    };
    next();
  };
  if ("IntersectionObserver" in window && !still) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in"); $$(".term", e.target).forEach(typeTerm); io.unobserve(e.target);
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach((el) => io.observe(el));
  } else targets.forEach((el) => el.classList.add("in"));

  // lightbox empties after it has faded out
  box.addEventListener("transitionend", () => { if (!box.classList.contains("on")) box.innerHTML = ""; });
  // ---------- step navigation ----------
  // 6) jump smoothly to a section or step and flash it
  const flash = (el) => { if (!el) return; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); };
  const go = (id, push) => {
    const el = document.getElementById(id); if (!el) return;
    if (push) history.replaceState(null, "", "#" + id);
    // images above load while scrolling and move the target, so watch it until it stops, then fix the last bit
    const token = (go.t = (go.t || 0) + 1);
    const want = () => el.tagName === "H2" ? 84 : 90;
    el.scrollIntoView({ behavior: still ? "instant" : "smooth", block: "start" });
    let last = null, stable = 0, fixes = 0;
    const watch = () => {
      if (token !== go.t) return;                               // a newer jump started
      const top = el.getBoundingClientRect().top;
      stable = last !== null && Math.abs(top - last) < 1 ? stable + 1 : 0; last = top;
      if (stable < 2) return setTimeout(watch, 100);
      const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
      if (Math.abs(top - want()) > 24 && !(atEnd && top > want()) && fixes++ < 4) { scrollBy({ top: top - want(), behavior: "instant" }); stable = 0; last = null; return setTimeout(watch, 120); }
      flash(el);
    };
    setTimeout(watch, 120);
  };
  $$('.toc a[href^="#"], h2 .anchor').forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); go(a.getAttribute("href").slice(1), true); }));
  if (location.hash) { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; setTimeout(() => go(decodeURIComponent(location.hash.slice(1)), false), 350); }
  addEventListener("hashchange", () => location.hash && go(decodeURIComponent(location.hash.slice(1)), false));

  // 4) copy a link to one step
  const toast = document.createElement("div"); toast.className = "toast"; document.body.appendChild(toast);
  let tt;
  $$(".slink").forEach((a) => a.addEventListener("click", async (e) => {
    e.preventDefault();
    const id = a.getAttribute("href").slice(1), url = location.origin + location.pathname + "#" + id;
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch (_) {
      const ta = document.createElement("textarea"); ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); try { ok = document.execCommand("copy"); } catch (_) {} ta.remove();
    }
    toast.textContent = ok ? "Link to this step copied" : url;
    history.replaceState(null, "", "#" + id); flash(document.getElementById(id));
    toast.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove("on"), 1800);
  }));

  // 2) the step in the middle of the screen lights up
  const steps = $$("article .step");
  if (steps.length) {
    let cur = null;
    const pick = () => {
      const mid = innerHeight * 0.45; let best = null, bd = 1e9;
      steps.forEach((s) => { const r = s.getBoundingClientRect(); if (r.bottom < 80 || r.top > innerHeight) return;
        const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid)); if (d < bd) { bd = d; best = s; } });
      if (best !== cur) { cur && cur.classList.remove("now"); best && best.classList.add("now"); cur = best; }
      document.body.classList.toggle("reading", !!best && scrollY > 300);
    };
    addEventListener("scroll", pick, { passive: true }); pick();
  }
})();
