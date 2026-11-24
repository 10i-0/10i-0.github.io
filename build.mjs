// Builds the static site from src/content/*.js
//   node build.mjs
// Output: index.html, writeups/<slug>/index.html, 404.html, sitemap.xml, robots.txt
import { readdir, mkdir, writeFile, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SITE = "https://10i-0.github.io";
const NAME = "zero@444";
const GITHUB = "https://github.com/10i-0";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const md = (d) => { const [, m, dd] = d.split("-"); return `${MONTHS[+m - 1]} ${+dd}`; };
const longDate = (d) => { const [y, m, dd] = d.split("-"); return `${+dd} ${MONTHS[+m - 1]} ${y}`; };
const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const strip = (s) => s.replace(/<[^>]+>/g, "");

// ---------- load writeups ----------
const files = (await readdir("src/content")).filter((f) => f.endsWith(".js")).sort();
const W = [];
for (const f of files) W.push((await import(pathToFileURL(`src/content/${f}`).href + `?v=${Date.now()}`)).default);
W.sort((a, b) => b.date.localeCompare(a.date));
for (const w of W) for (const k of ["slug", "title", "platform", "diff", "date", "tags", "path", "summary", "sections"])
  if (!w[k]) throw new Error(`${w.slug || "?"}: missing ${k}`);

// ---------- shared layout ----------
function page({ title, description, url, image, crumb = "", body, home = false }) {
  const full = title === NAME ? `${NAME} · writeups` : `${title} · ${NAME}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${attr(full)}</title>
<meta name="description" content="${attr(description)}">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:type" content="${home ? "website" : "article"}">
<meta property="og:site_name" content="${NAME} writeups">
<meta property="og:title" content="${attr(full)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:url" content="${SITE}${url}">
${image ? `<meta property="og:image" content="${SITE}${image}">\n<meta name="twitter:card" content="summary_large_image">` : `<meta name="twitter:card" content="summary">`}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<header><div class="in">
  <a class="me" href="/">zero<span>@</span>444</a>
  ${crumb ? `<div class="crumb">${crumb}</div>` : ""}
  <nav class="links"><a href="/"${home ? ' class="on"' : ""}>Writeups</a><a href="${GITHUB}" target="_blank" rel="noopener">GitHub</a></nav>
  <div class="progress"></div>
</div></header>
${body}
<footer><div class="wrap"><span>${NAME} · writeups</span><a href="${GITHUB}" target="_blank" rel="noopener">GitHub</a></div></footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

const item = (w) => `<li class="item" data-platform="${attr(w.platform)}" data-search="${attr([w.title, w.platform, w.os, w.path.join(" "), w.tags.join(" "), (w.tools || []).join(" ")].join(" ").toLowerCase())}">
  <a href="/writeups/${w.slug}/"><span class="d">${md(w.date)}</span><span class="main"><span class="t">${w.title}</span><span class="c">${w.path.join(" → ")}</span></span><span class="m"><span class="dot ${w.diff}"></span>${w.platform} · ${cap(w.diff)}</span></a>
</li>`;

const groups = (list) => {
  const by = {}; list.forEach((w) => (by[w.date.slice(0, 4)] ??= []).push(w));
  return Object.keys(by).sort().reverse().map((y) => `<section class="year-group"><div class="year">${y}</div><ul class="list">${by[y].map(item).join("")}</ul></section>`).join("");
};

// ---------- home ----------
const platforms = [...new Set(W.map((w) => w.platform))];
const home = page({
  title: NAME, home: true, url: "/",
  description: "Writeups by zero@444: TryHackMe rooms, machines and challenges solved step by step.",
  body: `<main class="wrap">
  <section class="intro">
    <h1>Writeups</h1>
    <p>Rooms, machines and challenges I solved, step by step.</p>
    <div class="counts"><b>${W.length}</b> writeup${W.length === 1 ? "" : "s"} · <b>${platforms.length}</b> platform${platforms.length === 1 ? "" : "s"}</div>
  </section>
  <div class="tools">
    <label class="searchbox"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="q" placeholder="Search by name, technique or tool" autocomplete="off" aria-label="Search writeups"><kbd>/</kbd></label>
    <div class="filters" id="filters">${["All", ...platforms].map((p, i) => `<button type="button" class="${i ? "" : "on"}" data-p="${attr(p)}">${p}<span>${p === "All" ? W.length : W.filter((w) => w.platform === p).length}</span></button>`).join("")}</div>
  </div>
  ${groups(W)}
  <p class="empty" id="empty" hidden>No writeup matches that.</p>
</main>`,
});

// ---------- writeup pages ----------
const writeupPage = (w, i) => {
  const older = W[i + 1], newer = W[i - 1];
  const sections = w.sections.map((s) => `<h2 id="${s.id}"><a class="anchor" href="#${s.id}" aria-label="Link to this section">#</a>${s.h}</h2>${s.body}`).join("\n");
  const room = w.banner || w.room ? `<div class="roombox">
      ${w.banner ? `<img class="room" src="${w.banner}" alt="${attr(w.title)} on ${attr(w.platform)}">` : ""}
      <div class="roominfo">
        ${w.room ? `<a class="openroom" href="${w.room}" target="_blank" rel="noopener">Open room on ${w.platform}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a>` : ""}
        ${w.tools ? `<div class="toolsline"><span>Tools</span>${w.tools.map((t) => `<code>${t}</code>`).join(" ")}</div>` : ""}
      </div>
    </div>` : "";
  return page({
    title: `${w.title} (${w.platform})`, url: `/writeups/${w.slug}/`, image: w.banner,
    description: w.description || strip(w.summary),
    crumb: `<i>/</i><a href="/">writeups</a><i>/</i><b>${w.title}</b>`,
    body: `<main class="page">
  <article>
    <a class="back" href="/"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>All writeups</a>
    <h1>${w.title}</h1>
    <div class="meta"><span><b>${w.platform}</b></span><span><span class="dot ${w.diff}"></span>${cap(w.diff)}</span>${w.os ? `<span>${w.os}</span>` : ""}<span><time datetime="${w.date}">${longDate(w.date)}</time></span></div>
    ${room}
    <div class="path"><div class="lbl">ATTACK PATH</div><ol>${w.path.map((p) => `<li>${p}</li>`).join("")}</ol></div>
    <p class="summary">${w.summary}</p>
    ${sections}
    ${older || newer ? `<nav class="pn">
      ${older ? `<a href="/writeups/${older.slug}/"><small>&larr; Older</small><b>${older.title}</b></a>` : `<span></span>`}
      ${newer ? `<a class="next" href="/writeups/${newer.slug}/"><small>Newer &rarr;</small><b>${newer.title}</b></a>` : `<span></span>`}
    </nav>` : ""}
  </article>
  <aside class="toc"><b>ON THIS PAGE</b>${w.sections.map((s) => `<a href="#${s.id}">${s.h}</a>`).join("")}</aside>
</main>`,
  });
};

// ---------- write ----------
await rm("writeups", { recursive: true, force: true });
await rm("tags", { recursive: true, force: true });
await writeFile("index.html", home);
for (const [i, w] of W.entries()) { await mkdir(`writeups/${w.slug}`, { recursive: true }); await writeFile(`writeups/${w.slug}/index.html`, writeupPage(w, i)); }
await writeFile("404.html", page({ title: "Not found", url: "/404.html", description: "Page not found.", body: `<main class="wrap"><section class="intro"><h1>Not found</h1><p>That page does not exist. <a class="inline" href="/">Back to the writeups</a>.</p></section></main>` }));
await writeFile("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  ["/", ...W.map((w) => `/writeups/${w.slug}/`)].map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n") + "\n</urlset>\n");
await writeFile("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`built: ${W.length} writeup(s)`);
