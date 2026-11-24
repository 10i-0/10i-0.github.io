// Building blocks used by the writeup content files (src/content/*.js).
// They return HTML strings; build.mjs turns them into static pages.

const copyIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';

// who: "kali" = my machine (zsh), "shell" = shell on the target, "panel" = a web form that runs commands
const PROMPT = {
  kali: (cwd) => `<span class="pk">┌──(</span><span class="pu">zero㉿444</span><span class="pk">)-[</span><span class="pd">${cwd || "~"}</span><span class="pk">]</span>\n<span class="pk">└─</span><span class="pu">$</span> `,
  shell: (cwd, user, host) => `<span class="ps">${user || "www-data"}@${host || "target"}</span>:<span class="pd">${cwd || "/"}</span>$ `,
  panel: () => `<span class="pk">&gt;</span> `,
};
const TITLE = {
  kali: () => "zsh — zero@444",
  shell: (o) => `shell — ${o.user || "www-data"}@${o.host || "target"}`,
  panel: () => "web · command panel",
};

// term({ who, cwd, user, host, cmds: ["cmd", ["cmd", "cwd"]], out, wrap, title })
export function term(o) {
  const who = o.who || "kali";
  const cmds = [].concat(o.cmds || []);
  const lines = cmds.map((c) => {
    const [text, cwd] = Array.isArray(c) ? c : [c, o.cwd];
    return PROMPT[who](cwd, o.user, o.host) + `<span class="cmdtext">${text}</span>`;
  });
  const body = lines.join("\n") + (o.out ? (lines.length ? "\n" : "") + `<span class="o">${o.out}</span>` : "");
  const copy = cmds.length ? `<button class="cp" type="button">${copyIcon}<span>Copy</span></button>` : "";
  return `<div class="term ${who}"><div class="tbar"><i></i><i></i><i></i><span class="tt">${o.title || TITLE[who](o)}</span>${copy}</div><pre${o.wrap ? ' class="wrap"' : ""}>${body}</pre></div>`;
}

export const fig = (src, cap, alt) =>
  `<figure><button class="shot" type="button" data-zoom aria-label="Enlarge screenshot"><img src="${src}" alt="${(alt || cap || "").replace(/"/g, "&quot;")}" loading="lazy"></button>${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure>`;

export const why = (t) => `<div class="why"><b>Why it works</b><p>${t}</p></div>`;

export const step = (n, h, b) => `<div class="step"><h3><span class="n">${n}</span>${h}</h3>${b}</div>`;

export const hidden = (n = 8) => "&bull;".repeat(n) + '   <span class="hl">(answer hidden)</span>';
