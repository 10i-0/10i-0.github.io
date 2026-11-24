// zero@444 writeups: small enhancements for the static pages.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Copy buttons on terminal blocks: copy only the commands, never the prompt or output
  $$(".term .cp").forEach((b) => b.addEventListener("click", async () => {
    const text = $$(".cmdtext", b.closest(".term")).map((s) => s.innerText).join("\n");
    try { await navigator.clipboard.writeText(text); } catch (_) {}
    const l = $("span", b); l.textContent = "Copied"; setTimeout(() => (l.textContent = "Copy"), 1300);
  }));

  // Click a screenshot to see it larger
  const box = document.createElement("div");
  box.className = "lightbox"; document.body.appendChild(box);
  $$("[data-zoom]").forEach((s) => s.addEventListener("click", () => {
    box.innerHTML = ""; box.appendChild($("img", s).cloneNode()); box.classList.add("on");
  }));
  box.addEventListener("click", () => box.classList.remove("on"));
  addEventListener("keydown", (e) => { if (e.key === "Escape") box.classList.remove("on"); });

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

  // Home: search and platform filter
  const q = $("#q");
  if (q) {
    let plat = "All";
    const apply = () => {
      const s = q.value.trim().toLowerCase(); let shown = 0;
      $$(".item").forEach((li) => {
        const ok = (plat === "All" || li.dataset.platform === plat) && li.dataset.search.includes(s);
        li.hidden = !ok; if (ok) shown++;
      });
      $$(".year-group").forEach((g) => (g.hidden = !$$(".item", g).some((li) => !li.hidden)));
      $("#empty").hidden = shown > 0;
    };
    q.addEventListener("input", apply);
    $$("#filters button").forEach((b) => b.addEventListener("click", () => {
      $$("#filters button").forEach((x) => x.classList.toggle("on", x === b)); plat = b.dataset.p; apply();
    }));
    addEventListener("keydown", (e) => { if (e.key === "/" && document.activeElement !== q) { e.preventDefault(); q.focus(); } });
  }
})();
