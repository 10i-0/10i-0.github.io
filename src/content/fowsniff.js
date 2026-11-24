// Fowsniff CTF (TryHackMe). seina's password and the temporary SSH password (room answers) are blurred and hidden.
import { term, fig, why, step } from "../helpers.mjs";

const KR = { root: true, cwd: "/home/zero/Desktop/THM" };                         // my machine as root
const K = { cwd: "/tmp" };                                                         // my machine
const MSF = { who: "shell", prompt: "msf auxiliary(scanner/pop3/pop3_login) &gt;", title: "msfconsole" };
const P = { who: "shell", prompt: "", title: "nc — POP3 on 10.49.183.247:110" };   // raw POP3 session
const S = { who: "shell", user: "baksteen", host: "fowsniff", cwd: "~" };          // ssh as baksteen
const R = { who: "shell", prompt: "#", title: "reverse shell — root@fowsniff" };

export default {
  slug: "fowsniff",
  title: "Fowsniff CTF",
  platform: "TryHackMe",
  diff: "easy",
  os: "Linux",
  date: "2026-11-14",
  room: "https://tryhackme.com/room/ctf",
  tools: ["nmap", "Google", "Hashes.com", "metasploit", "netcat", "ssh", "nano"],
  tags: ["osint", "password-leak", "md5", "pop3", "email", "ssh", "motd", "reverse-shell"],
  path: ["nmap (SSH, HTTP, POP3, IMAP)", "breach notice + hijacked X handle", "leaked MD5 dump on GitHub", "crack hashes", "POP3 as seina", "temp SSH password in email", "SSH as baksteen", "group-writable MOTD script", "root"],
  summary: "Fowsniff Corp got breached and the attacker dumped staff email passwords online. I follow the breach notice to a public MD5 dump, crack it, log in to the POP3 mail server as seina, and read an email with a temporary SSH password. The user who never changed it lets me in. For root, a login-banner script runs as root on every SSH login, and my user's group can edit it.",
  description: "TryHackMe Fowsniff CTF walkthrough: OSINT to a leaked MD5 password dump, POP3 brute force with Metasploit, reading mail with netcat, SSH as baksteen, and a group-writable MOTD script for root.",
  sections: [
    { id: "q1", h: "Q1. What ports are open?", body:
      step(1, "Scan the target",
        term({ ...KR, cmds: ["nmap -sVC 10.49.183.247"] }) +
        fig("/images/fowsniff/nmap.webp", "22 SSH, 80 HTTP, 110 POP3, 143 IMAP.") +
        "<p>Four ports are open. Two of them are mail services (POP3 and IMAP), which is unusual for a web box and worth remembering.</p>")
    },

    { id: "q2", h: "Q2–Q3. Look around, then search for public information", body:
      step(1, "Open the website on port 80",
        fig("/images/fowsniff/website.webp", "A breach notice that names the hijacked account @fowsniffcorp.") +
        "<p>The page says employee usernames and passwords were leaked, and that the attackers hijacked the company's X (Twitter) account <code>@fowsniffcorp</code>. That handle is my lead.</p>") +

      step(2, "Search the handle",
        fig("/images/fowsniff/google.webp", "A GitHub repo berzerk0/Fowsniff and the X profile \"FowSniffCorp Pwned!\".") +
        fig("/images/fowsniff/twitter.webp", "The hijacked X profile links the dump.") +
        "<p>The X profile links a paste, and the GitHub repo <code>berzerk0/Fowsniff</code> holds the actual password dump.</p>")
    },

    { id: "q4", h: "Q4. Can you decode these MD5 hashes?", body:
      step(1, "Open the leak",
        fig("/images/fowsniff/github-leak.webp", "fowsniff.txt: user@fowsniff:md5hash for nine staff accounts.")) +

      step(2, "Crack the hashes",
        "<p>I paste the hashes into Hashes.com. They are plain unsalted MD5, so they are already in its database.</p>" +
        fig("/images/fowsniff/hashes-com.webp", "Eight of nine crack (seina's password blurred).") +
        "<p>Only stone's hash stays uncracked, and I do not need it.</p>" +
        why("MD5 is fast and has no salt here, so the same password always gives the same hash. Weak passwords like these are already in public lookup tables, and \"cracking\" is just a lookup."))
    },

    { id: "q5", h: "Q5–Q6. Brute-force POP3 with Metasploit, and seina's password", body:
      step(1, "Load the POP3 login module",
        term({ ...K, cmds: ["msfconsole"] }) +
        term({ who: "shell", prompt: "msf &gt;", title: "msfconsole", cmds: ["search pop3_login", "use 0"] }) +
        fig("/images/fowsniff/msf-search.webp", "auxiliary/scanner/pop3/pop3_login.")) +

      step(2, "Set the target and seina's pair, then run",
        term({ ...MSF, cmds: ["set RHOSTS 10.49.183.247", "set username seina", "set password &lt;seina's password&gt;", "run"] }) +
        fig("/images/fowsniff/msf-set.webp", "username seina and her cracked password (blurred).") +
        fig("/images/fowsniff/msf-run.webp", "Success: '+OK Logged in.'") +
        "<p>I test the one pair I care about. For a real brute force I would load lists with <code>set USER_FILE users.txt</code> and <code>set PASS_FILE pass.txt</code>; both ways land on the same valid login. This also answers Q6: seina's mail password is the one cracked in Q4.</p>")
    },

    { id: "q7", h: "Q7–Q8. Read seina's email, and the temporary password", body:
      step(1, "Log in to POP3 by hand",
        term({ ...K, cmds: ["nc 10.49.183.247 110"] }) +
        term({ ...P, cmds: ["USER seina", "PASS &lt;seina's password&gt;", "LIST"] }) +
        fig("/images/fowsniff/pop3-login.webp", "+OK Logged in. LIST: 2 messages.") +
        "<p>POP3 is plain text, so I can type the protocol myself with netcat.</p>") +

      step(2, "Read message 1",
        term({ ...P, cmds: ["RETR 1"] }) +
        fig("/images/fowsniff/retr1.webp", "From stone: \"URGENT! Security EVENT!\" with a temporary SSH password (blurred).") +
        "<p>stone sent every staff member a temporary SSH password in plain text and told them to change it.</p>") +

      step(3, "Read message 2",
        term({ ...P, cmds: ["RETR 2"] }) +
        fig("/images/fowsniff/retr2.webp", "From baksteen: he has not read stone's email yet.") +
        "<p>baksteen says he got an email from stone but has not read it. So he probably still has the temporary password.</p>")
    },

    { id: "q9", h: "Q9. Who sent the email? Connect over SSH", body:
      step(1, "Try SSH as stone (dead end)",
        term({ ...K, cmds: ["ssh stone@10.49.183.247"] }) +
        fig("/images/fowsniff/ssh-stone.webp", "Permission denied for stone.") +
        "<p>The sender is stone, but stone set the temporary password for others and already changed his own.</p>") +

      step(2, "SSH as baksteen with the temporary password",
        term({ ...K, cmds: ["ssh baksteen@10.49.183.247"] }) +
        fig("/images/fowsniff/ssh-baksteen.webp", "Logged in as baksteen. Note the Fowsniff banner.") +
        "<p>It works. The login banner (the Fowsniff ASCII art and NOTICE) matters for root later.</p>")
    },

    { id: "q10", h: "Q10. What groups is this user in? Any interesting group files?", body:
      step(1, "Check my groups",
        term({ ...S, cmds: ["id"] }) +
        fig("/images/fowsniff/id.webp", "baksteen is in users (gid 100).") +
        "<p><code>users</code> is shared by all staff, so a file owned by that group is interesting.</p>") +

      step(2, "Find files owned by the users group",
        term({ ...S, cmds: ["find / -group users -type f 2>/dev/null"] }) +
        fig("/images/fowsniff/find-group.webp", "Most hits are home and /proc noise; /opt/cube/cube.sh stands out.")) +

      step(3, "Check cube.sh",
        term({ ...S, cmds: ["ls -l /opt/cube/cube.sh", "cat /opt/cube/cube.sh"] }) +
        fig("/images/fowsniff/cube-sh.webp", "-rw-rwxr-- parede:users, and it prints the login banner.") +
        "<p>The group has <code>rwx</code>, so baksteen can edit it. Its content is exactly the banner I saw at login, so this script produces that banner.</p>")
    },

    { id: "q11", h: "Q11–Q12. Put a reverse shell in the banner script, and get root", body:
      step(1, "Start a listener",
        term({ ...K, cmds: ["nc -lvp 1234"] }) +
        fig("/images/fowsniff/listener.webp", "Listening on 1234.")) +

      step(2, "Add a Python reverse shell to cube.sh",
        term({ ...S, cmds: ["nano /opt/cube/cube.sh"] }) +
        fig("/images/fowsniff/nano-before.webp", "cube.sh before: the banner printf.") +
        fig("/images/fowsniff/nano-after.webp", "cube.sh after: a Python reverse shell to 192.168.137.189:1234.") +
        "<p>The way I pasted it replaced the banner art. That does not break anything; the banner just stops printing.</p>") +

      step(3, "Log in again to fire it",
        term({ ...K, cmds: ["ssh baksteen@10.49.183.247"] }) +
        fig("/images/fowsniff/relogin.webp", "Re-login (the wrong-password tries are just typos).") +
        fig("/images/fowsniff/root-shell.webp", "The listener catches the shell; whoami: root.") +
        why("On every SSH login, the system runs the MOTD (message of the day) scripts as root to build the banner, and this one calls <code>cube.sh</code>. Because the <code>users</code> group can edit <code>cube.sh</code>, any staff member can make root run their code at the next login.")) +

      step(4, "Read the flag",
        term({ ...R, cmds: ["find / -type f -name flag.txt 2>/dev/null", "cat /root/flag.txt"] }) +
        fig("/images/fowsniff/root-flag.webp", "/root/flag.txt: the root flag art."))
    }
  ]
};
