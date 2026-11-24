// Simple CTF (TryHackMe). The cracked password and both flags are hidden (blanked in my screenshots, masked in text).
import { term, fig, why, step, hidden } from "../helpers.mjs";

const K = { cwd: "~/THM/simple-ctf" };                                        // my machine
const M = { who: "shell", prompt: "$", title: "ssh — mitch@simple.thm" };     // ssh as mitch (sh shell)
const R = { who: "shell", prompt: "#", title: "root shell — simple.thm" };    // root shell from vim

export default {
  slug: "simple-ctf",
  title: "Simple CTF",
  platform: "TryHackMe",
  diff: "easy",
  os: "Linux",
  date: "2026-11-24",
  room: "https://tryhackme.com/room/easyctf",
  tools: ["nmap", "ftp", "gobuster", "CVE-2019-9053 exploit", "ssh", "vim"],
  tags: ["ftp", "cms", "sqli", "cve", "password-cracking", "ssh", "sudo", "vim"],
  path: ["nmap -p- (FTP, HTTP, SSH on 2222)", "gobuster finds /simple", "CMS Made Simple 2.2.8", "CVE-2019-9053 SQLi dumps and cracks mitch's hash", "SSH as mitch on 2222", "sudo vim NOPASSWD", "root"],
  summary: "Simple CTF is an easy Linux box with an old CMS Made Simple site. I find the version, match it to an unauthenticated SQL injection, and use a public exploit to dump and crack the admin password. A note on anonymous FTP says the same weak password is used for the system user, so I log in over SSH on port 2222. <code>mitch</code> can run <code>vim</code> as root with sudo, which gives a root shell.",
  description: "TryHackMe Simple CTF walkthrough: full nmap scan finds SSH on 2222, CMS Made Simple 2.2.8 SQL injection (CVE-2019-9053) cracks mitch's password, and sudo vim gives root.",
  banner: "/images/simple-ctf/room.png",
  sections: [
    { id: "q1", h: "Q1. How many services are running under port 1000?", body:
      step(1, "Scan the top 1000 ports",
        term({ ...K, cmds: ["nmap -sVC --top-ports 1000 -Pn -T4 simple.thm"] }) +
        fig("/images/simple-ctf/nmap-top1000.png", "Two services under port 1000: FTP on 21 and HTTP on 80.") +
        "<p><code>simple.thm</code> points to the target IP in my <code>/etc/hosts</code>. <code>-Pn</code> skips the ping check, and <code>-sVC</code> adds versions and default scripts.</p>")
    },

    { id: "q2", h: "Q2. What is running on the higher port?", body:
      step(1, "Scan all 65535 ports",
        term({ ...K, cmds: ["nmap -sVC -p- -Pn -T4 simple.thm"] }) +
        fig("/images/simple-ctf/nmap-all-ports.png", "The full scan finds SSH on 2222, which the top-1000 scan missed.") +
        "<p>The <code>ftp-anon</code> script also shows that anonymous FTP login is allowed. I use that in Q5.</p>")
    },

    { id: "q3", h: "Q3 + Q4. What's the CVE, and what kind of vulnerability is it?", body:
      step(1, "Brute-force web directories",
        term({ ...K, cmds: ["gobuster dir -u http://simple.thm -w /usr/share/wordlists/dirb/big.txt"] }) +
        fig("/images/simple-ctf/gobuster.png", "/simple returns a 301 redirect to a new folder.") +
        "<p>The web root is only the Apache default page, so I look for hidden paths.</p>") +

      step(2, "Open /simple and read the version",
        "<p>I open <code>http://simple.thm/simple/</code> in the browser. The site runs CMS Made Simple.</p>" +
        fig("/images/simple-ctf/cms-home.png", "CMS Made Simple home page.") +
        "<p>The footer at the bottom of the page shows the exact version.</p>" +
        fig("/images/simple-ctf/cms-version.png", "Footer: version 2.2.8.")) +

      step(3, "Search the version for CVEs",
        "<p>I search for <code>CMS Made Simple 2.2.8 cve</code>.</p>" +
        fig("/images/simple-ctf/cve-search.png", "NVD lists CVE-2019-9053 for 2.2.8.") +
        "<p>CVE-2019-9053 is an unauthenticated, time-based blind SQL injection in the News module. That answers Q4 too: the bug class is <code>sqli</code>.</p>")
    },

    { id: "q5", h: "Q5. What's the password?", body:
      step(1, "Read the note on anonymous FTP",
        term({ ...K, cmds: ["ftp simple.thm"], out:
`Name: anonymous
Password:            <span class="hl">(blank)</span>
ftp> less ForMitch.txt
Dammit man... you'te the worst dev i've seen. You set the same pass for the
system user, and the password is so weak... i cracked it in seconds. Gosh...
what a mess!` }) +
        "<p>This step has no screenshot; I wrote it from my commands. The note says mitch uses one weak password for the CMS and the system user, so a cracked CMS password should also work on SSH.</p>") +

      step(2, "Get a Python 3 version of the exploit",
        "<p>The original Exploit-DB script (46635) is Python 2. This fork works with Python 3 and has the same <code>-u</code>, <code>-w</code> and <code>--crack</code> options: <code>github.com/Perseus99999/CVE-2019-9053-working-</code></p>" +
        fig("/images/simple-ctf/exploit-repo.png", "The Python 3 fork of the CVE-2019-9053 exploit.")) +

      step(3, "Run the exploit and crack the hash",
        term({ ...K, cmds: [
`python3 exploit.py -u http://simple.thm/simple/ --crack \\
    -w /usr/share/wordlists/rockyou.txt`] }) +
        fig("/images/simple-ctf/exploit-run.png", "Salt, user mitch, email and hash leak; rockyou cracks the hash (hidden).") +
        "<p>It leaks the salt, the username <code>mitch</code>, the email and the password hash, then cracks the hash with rockyou. The password is <code>&bull;&bull;&bull;&bull;&bull;&bull;</code>.</p>" +
        why("The News module puts the <code>m1_idlist</code> parameter straight into a SQL query. The script injects conditions with a sleep, so a slow reply means \"true\", and it rebuilds each value one character at a time. CMSMS stores <code>md5(salt + password)</code>, so with the salt known the script hashes each rockyou word the same way and compares.")) +

      step(4, "Check the creds on the CMS admin panel",
        "<p>I log in at <code>http://simple.thm/simple/admin/login.php</code> as mitch. I do not need the admin panel for the solve, but it proves the creds are real.</p>" +
        fig("/images/simple-ctf/cms-admin.png", "Logged in to the CMS admin panel as mitch."))
    },

    { id: "q6", h: "Q6 + Q7. Where can you log in with the details, and what's the user flag?", body:
      step(1, "SSH as mitch on port 2222",
        term({ ...K, cmds: ["ssh mitch@simple.thm -p 2222"] }) +
        fig("/images/simple-ctf/ssh-login.png", "SSH login as mitch. whoami: mitch.") +
        "<p>SSH is not on the default port 22, so I set the port with <code>-p</code>. The CMS password works for the system user, as the FTP note said.</p>") +

      step(2, "Read user.txt",
        term({ ...M, cmds: ["ls -la", "cat user.txt"] }) +
        fig("/images/simple-ctf/user-flag.png", "user.txt in mitch's home folder (flag hidden)."))
    },

    { id: "q8", h: "Q8. Is there any other user in the home directory?", body:
      step(1, "List /home",
        term({ ...M, cmds: ["cd /home", "ls"], out: `mitch  <span class="hl">sunbath</span>` }) +
        "<p>Besides mitch there is one more user: <code>sunbath</code>. I do not need this account for root.</p>")
    },

    { id: "q9", h: "Q9 + Q10. What gives a privileged shell, and what's the root flag?", body:
      step(1, "Check sudo rights",
        term({ ...M, cmds: ["sudo -l"], out:
`User mitch may run the following commands on Machine:
<span class="hl">    (root) NOPASSWD: /usr/bin/vim</span>` }) +
        "<p>mitch can run <code>/usr/bin/vim</code> as root with no password.</p>") +

      step(2, "Escape from vim to a root shell",
        term({ ...M, cmds: ["sudo vim -c ':!/bin/sh'"], out: `# whoami\n<span class="hl">root</span>` }) +
        "<p>A quick search for <code>vim sudo privesc</code> (GTFOBins) gives this one-liner.</p>" +
        why("sudo starts vim as root. <code>-c</code> runs a vim command at start, and <code>:!</code> runs a shell command, so <code>/bin/sh</code> starts with root rights. Any NOPASSWD tool that can run commands works the same way.")) +

      step(3, "Read root.txt",
        term({ ...R, cmds: ["cd /root", "cat root.txt"], out: hidden(10) }))
    }
  ]
};
