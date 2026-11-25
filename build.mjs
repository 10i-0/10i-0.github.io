// Builds the static site from src/content/*.js
//   node build.mjs
// Output: index.html, writeups/<slug>/index.html, 404.html, sitemap.xml, robots.txt
import { readdir, mkdir, writeFile, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
// version of each asset = short hash of its content (changes only when the file changes)
const V = (f) => createHash("sha1").update(readFileSync(f)).digest("hex").slice(0, 8);

const SITE = "https://10i-0.github.io";
const NAME = "zero";
const GITHUB = "https://github.com/10i-0";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const md = (d) => { const [, m, dd] = d.split("-"); return `${MONTHS[+m - 1]} ${+dd}`; };
const longDate = (d) => { const [y, m, dd] = d.split("-"); return `${+dd} ${MONTHS[+m - 1]} ${y}`; };
const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const strip = (s) => s.replace(/<[^>]+>/g, "");

// small platform marks shown in the list and on each page
const PLATFORM = {
  TryHackMe: { short: "THM", bg: "#212c42", fg: "#ff4545", icon: "/assets/platforms/tryhackme.svg" },
  HackTheBox: { short: "HTB", bg: "#141d2b", fg: "#9fef00" },
  PortSwigger: { short: "PS", bg: "#1f1f1f", fg: "#ff6633" },
  PicoCTF: { short: "pico", bg: "#1b1b2f", fg: "#e0e0e0" },
  "OffSec PG": { short: "PG", bg: "#1a1a2e", fg: "#e0e0e0" },
  VulnHub: { short: "VH", bg: "#1b1f24", fg: "#e0e0e0" },
  CTFtime: { short: "CTF", bg: "#1b1f24", fg: "#e0e0e0" },
  // a new platform: add a line here; its logo goes in assets/platforms/<name>.svg (icon: "/assets/platforms/<name>.svg")
};
const mark = (p, big) => { const m = PLATFORM[p] || { short: p.slice(0, 3), bg: "#151d2c", fg: "#b3bdd0" };
  const inner = m.icon ? `<i style="--pi:url(${m.icon})"></i>` : m.short;
  return `<span class="pmark${m.icon ? " icon" : ""}${big ? " big" : ""}" style="--pb:${m.bg};--pf:${m.fg}" title="${p}" aria-label="${p}">${inner}</span>`; };
// room thumbnail: images/<slug>/thumb.webp; if missing, the platform logo is used instead (and the build says so)
// cover: images/<slug>/cover.webp (platform logo + room image, made by _site-tools/make_cover.py); falls back to the thumbnail
const coverOf = (w) => existsSync(`images/${w.slug}/cover.webp`) ? `/images/${w.slug}/cover.webp` : thumbOf(w);
const thumbOf = (w) => w.thumb || (existsSync(`images/${w.slug}/thumb.webp`) ? `/images/${w.slug}/thumb.webp`
  : (PLATFORM[w.platform]?.icon || "/assets/favicon.svg"));

// ---------- load writeups ----------
const files = (await readdir("src/content")).filter((f) => f.endsWith(".js")).sort();
const W = [];
for (const f of files) W.push((await import(pathToFileURL(`src/content/${f}`).href + `?v=${Date.now()}`)).default);
W.sort((a, b) => b.date.localeCompare(a.date));
for (const w of W) { if (!w.thumb && !existsSync(`images/${w.slug}/thumb.webp`)) console.log(`note: ${w.slug} has no thumbnail yet`); if (!PLATFORM[w.platform]) console.log(`note: platform "${w.platform}" has no logo yet (text mark used)`); }
for (const w of W) for (const k of ["slug", "title", "platform", "diff", "date", "tags", "path", "summary", "sections"])
  if (!w[k]) throw new Error(`${w.slug || "?"}: missing ${k}`);

// ---------- shared layout ----------
function page({ title, description, url, image, crumb = "", body, home = false }) {
  const full = title === NAME ? `${NAME} · writeups` : title;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${attr(full)}</title>
<meta name="description" content="${attr(description)}">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:type" content="${home ? "website" : "article"}">
<meta property="og:site_name" content="zero">
<meta property="og:title" content="${attr(full)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:url" content="${SITE}${url}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${attr(full)}">
<meta name="twitter:description" content="${attr(description)}">
<meta name="theme-color" content="#0a0e17">
<link rel="icon" href="/assets/favicon.svg?v=${V("assets/favicon.svg")}" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/jetbrains-mono-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v=${V("assets/site.css")}">
<link rel="stylesheet" href="/assets/motion.css?v=${V("assets/motion.css")}">
<script>document.documentElement.classList.add("js")</script>
</head>
<body>
<header><div class="in">
  <a class="me" href="/" aria-label="zero, home"><span class="glitch" data-text="zero">zero</span></a>
  ${crumb ? `<div class="crumb">${crumb}</div>` : ""}
  ${home ? `<label class="hsearch"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" placeholder="Search" autocomplete="off" aria-label="Search writeups"></label>` : ""}
  <nav class="links"><div class="dd"><button type="button" class="ddb" aria-haspopup="true">CTF<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
    <div class="menu" role="menu"><a href="/" role="menuitem"><span class="pmark icon all"><i></i></span>All writeups<span class="n">${W.length}</span></a>${[...new Set(W.map((w) => w.platform))].map((p) => `<a href="/?p=${encodeURIComponent(p)}" role="menuitem">${mark(p)}${p}<span class="n">${W.filter((w) => w.platform === p).length}</span></a>`).join("")}</div></div><a href="${GITHUB}" target="_blank" rel="noopener">GitHub</a></nav>
  <div class="progress"></div>
</div></header>
${body}
<footer><div class="wrap"><span>${NAME} · writeups</span><a href="${GITHUB}" target="_blank" rel="noopener">GitHub</a></div></footer>
<script src="/assets/site.js?v=${V("assets/site.js")}" defer></script>
</body>
</html>
`;
}

const item = (w) => `<li class="item" data-platform="${attr(w.platform)}" data-search="${attr([w.title, w.platform, w.os, w.path.join(" "), w.tags.join(" "), (w.tools || []).join(" ")].join(" ").toLowerCase())}">
  <a href="/writeups/${w.slug}/"><span class="main"><span class="t">${w.title}</span><span class="d">${md(w.date)} · ${w.platform}</span><span class="story">${strip(w.summary)}</span></span><img class="cover" src="${coverOf(w)}" alt="" loading="lazy"></a>
</li>`;

const groups = (list) => {
  const by = {}; list.forEach((w) => (by[w.date.slice(0, 4)] ??= []).push(w));
  return Object.keys(by).sort().reverse().map((y) => `<section class="year-group"><div class="year">${y}</div><ul class="list">${by[y].map(item).join("")}</ul></section>`).join("");
};

// ---------- home ----------
const platforms = [...new Set(W.map((w) => w.platform))];
const home = page({
  title: NAME, home: true, url: "/",
  description: "Writeups by zero: TryHackMe rooms, machines and challenges solved step by step.",
  body: `<main class="wrap wide">
  <section class="intro hero">
    <div class="glow" aria-hidden="true"></div>
    <h1 class="grad">Every box tells a story.</h1>
    <p>Here's how I read them.</p>
  </section>
  
  ${groups(W)}
  <p class="empty" id="empty" hidden>No writeup matches that.</p>
</main>`,
});

// ---------- writeup pages ----------
const writeupPage = (w, i) => {
  const linkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';
  // every step gets its own id (section-stepnumber) and a "copy link" button
  const withIds = (s) => s.body.replace(/<div class="step"><h3><span class="n">(\d+)<\/span>([\s\S]*?)<\/h3>/g,
    (m, n, h) => `<div class="step" id="${s.id}-${n}"><h3><span class="n">${n}</span>${h}<a class="slink" href="#${s.id}-${n}" aria-label="Copy a link to this step" title="Copy link to this step">${linkIcon}</a></h3>`);
  const sections = w.sections.map((s) => `<h2 id="${s.id}"><a class="anchor" href="#${s.id}" aria-label="Link to this section">#</a>${s.h}</h2>${withIds(s)}`).join("\n");
  const room = true ? `<div class="roombox">
      <img class="room-cover" src="${coverOf(w)}" alt="${attr(w.title)} on ${attr(w.platform)}">
      <div class="roominfo">
        ${w.room ? `<a class="openroom" href="${w.room}" target="_blank" rel="noopener">Open room on ${w.platform}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a>` : ""}
        ${w.tools ? `<div class="toolsline"><span>Tools</span>${w.tools.map((t) => `<code>${t}</code>`).join(" ")}</div>` : ""}
      </div>
    </div>` : "";
  return page({
    title: `${w.title} · ${w.platform} writeup`, url: `/writeups/${w.slug}/`, image: thumbOf(w),
    description: w.description || strip(w.summary),
    crumb: `<i>/</i><a href="/">writeups</a><i>/</i><b>${w.title}</b>`,
    body: `<main class="page">
  <article>
    <a class="back" href="/"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>All writeups</a>
    <h1>${w.title}</h1>
    <div class="meta"><span><b>${w.platform}</b></span><span><span class="dot ${w.diff}"></span>${cap(w.diff)}</span>${w.os ? `<span>${w.os}</span>` : ""}<span><time datetime="${w.date}">${longDate(w.date)}</time></span></div>
    ${room}
    <p class="summary">${w.summary}</p>
    ${sections}
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
const { dropped } = await import("./src/helpers.mjs");
if (process.env.SHOW_DROPPED) console.log(dropped.join("\n"));
console.log(`built: ${W.length} writeup(s), ${dropped.length} duplicate command box(es) left out`);
