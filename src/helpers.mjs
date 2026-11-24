// Building blocks used by the writeup content files (src/content/*.js).
// They return HTML strings; build.mjs turns them into static pages.

import { readFileSync, existsSync } from "node:fs";

// Text read from each screenshot (tools/ocr.py). Used to avoid showing a command twice:
// if my screenshot in the same step already shows the command, the typed command box is dropped.
const OCR = existsSync("src/ocr.json") ? JSON.parse(readFileSync("src/ocr.json", "utf8")) : {};
const norm = (s) => s.toLowerCase().replace(/[o]/g, "0").replace(/[li|]/g, "1").replace(/s/g, "5");
const decode = (s) => s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
export const dropped = [];
function dedupe(n, h, b) {
  const srcs = [...b.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
  if (!srcs.length) return b;
  const seen = norm(srcs.map((s) => OCR[s] || "").join(" ")).replace(/\s+/g, "");
  return b.replace(/<div class="term [^"]*">[\s\S]*?<\/pre><\/div>/g, (blk) => {
    if (blk.includes('data-keep')) return blk;
    const cmds = [...blk.matchAll(/<span class="cmdtext">([\s\S]*?)<\/span>/g)].map((m) => decode(m[1]));
    if (!cmds.length) return blk;
    const toks = norm(cmds.join(" ")).match(/[a-z0-9]{3,}/g) || [];
    const hit = toks.filter((k) => seen.includes(k)).length;
    const covered = toks.length ? hit / toks.length >= 0.75 : true;
    if (covered) { dropped.push(`${h} | ${cmds.join(" ; ").slice(0, 70)}`); return ""; }
    return blk;
  });
}

const copyIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';

// who: "kali" = my machine (zsh), "shell" = shell on the target, "panel" = a web form that runs commands
const PROMPT = {
  kali: (cwd, user, host, root) => root
    ? `<span class="pk">┌──(</span><span class="pr">root㉿444</span><span class="pk">)-[</span><span class="pd">${cwd || "~"}</span><span class="pk">]</span>\n<span class="pk">└─</span><span class="pr">#</span> `
    : `<span class="pk">┌──(</span><span class="pu">zero㉿444</span><span class="pk">)-[</span><span class="pd">${cwd || "~"}</span><span class="pk">]</span>\n<span class="pk">└─</span><span class="pu">$</span> `,
  shell: (cwd, user, host) => `<span class="ps">${user || "www-data"}@${host || "target"}</span>:<span class="pd">${cwd || "/"}</span>$ `,
  panel: () => `<span class="pk">&gt;</span> `,
};
const TITLE = {
  kali: (o) => o.root ? "zsh — root@444" : "zsh — zero@444",
  shell: (o) => `shell — ${o.user || "www-data"}@${o.host || "target"}`,
  panel: () => "web · command panel",
};

// term({ who, cwd, user, host, prompt, cmds: ["cmd", ["cmd", "cwd"]], out, wrap, title })
// root: true = my machine as root (Kali root prompt with #)
// prompt: a plain prompt like "$" or "#" (for sh shells), instead of the usual one
export function term(o) {
  const who = o.who || "kali";
  const cmds = [].concat(o.cmds || []);
  const lines = cmds.map((c) => {
    const [text, cwd] = Array.isArray(c) ? c : [c, o.cwd];
    const pr = o.prompt !== undefined ? (o.prompt ? `<span class="ps">${o.prompt}</span> ` : "") : PROMPT[who](cwd, o.user, o.host, o.root);
    return pr + `<span class="cmdtext">${text}</span>`;
  });
  const body = lines.join("\n") + (o.out ? (lines.length ? "\n" : "") + `<span class="o">${o.out}</span>` : "");
  const copy = cmds.length ? `<button class="cp" type="button">${copyIcon}<span>Copy</span></button>` : "";
  return `<div class="term ${who}"${o.keep ? " data-keep" : ""}><div class="tbar"><i></i><i></i><i></i><span class="tt">${o.title || TITLE[who](o)}</span>${copy}</div><pre${o.wrap ? ' class="wrap"' : ""}>${body}</pre></div>`;
}

export const fig = (src, cap, alt) =>
  `<figure><button class="shot" type="button" data-zoom aria-label="Enlarge screenshot"><img src="${src}" alt="${(alt || cap || "").replace(/"/g, "&quot;")}" loading="lazy"></button>${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure>`;

export const why = (t) => `<div class="why"><b>Why it works</b><p>${t}</p></div>`;

export const step = (n, h, b) => `<div class="step"><h3><span class="n">${n}</span>${h}</h3>${dedupe(n, h, b)}</div>`;

export const hidden = (n = 8) => "&bull;".repeat(n) + '   <span class="hl">(answer hidden)</span>';
