// Easy Peasy (TryHackMe). All flags and both cracked passwords are blurred in screenshots and hidden in text.
import { term, fig, why, step, hidden } from "../helpers.mjs";

const K = { cwd: "~/Desktop/Study/THM/EasyPeasy_writeups" };                          // my machine
const B = { who: "shell", user: "boring", host: "kral4-PC", cwd: "~" };              // ssh as boring
const R = { who: "shell", prompt: "root@kral4-PC:~#", title: "reverse shell — root@kral4-PC" };

export default {
  slug: "easypeasy",
  title: "Easy Peasy",
  platform: "TryHackMe",
  diff: "easy",
  os: "Linux",
  date: "2026-11-23",
  room: "https://tryhackme.com/room/easypeasyctf",
  tools: ["nmap", "gobuster", "DevTools", "Hashes.com", "CyberChef", "john", "steghide", "Cryptii", "ssh", "netcat"],
  tags: ["web", "enumeration", "encoding", "hash-cracking", "steganography", "ssh", "cron", "reverse-shell"],
  path: ["nmap (80, 6498, 65524)", "gobuster + page source: 3 flags", "hidden directory", "john cracks a GOST hash", "steghide gives SSH creds", "SSH as boring on 6498", "writable root cron script", "root"],
  summary: "Easy Peasy is a Linux room full of small clues. I enumerate two web servers, read hidden page source, decode Base64 and Base62, crack a GOST hash with the room's wordlist, and use it as the Steghide passphrase to pull SSH credentials out of an image. For root, a cron script in <code>/var/www</code> runs as root but is owned by my user, so I turn it into a reverse shell.",
  description: "TryHackMe Easy Peasy walkthrough: web enumeration on two servers, Base64/Base62 clues, GOST hash cracking with john, steghide credentials, SSH on port 6498, and a writable root cron script.",
  banner: "/images/easypeasy/room.webp",
  sections: [
    { id: "recon", h: "Q1–Q3. Open ports, nginx version, and the highest port", body:
      step(1, "Scan all ports",
        term({ ...K, cwd: "~/Desktop/Study/THM", cmds: ["nmap -sVC -p- -T4 10.48.186.227"] }) +
        fig("/images/easypeasy/nmap.webp", "Three open ports: 80 (nginx 1.16.1), 6498 (SSH), 65524 (Apache).") +
        "<p>Three ports are open. Nginx 1.16.1 is on 80, SSH is on the non-default port 6498, and the highest port, 65524, runs Apache. That one scan answers the first three questions.</p>")
    },

    { id: "flag1", h: "Flag 1", body:
      step(1, "Brute-force directories on port 80",
        term({ ...K, cwd: "~/Desktop/Study/THM", cmds: ["gobuster dir -u http://easypeasy.thm -w /usr/share/wordlists/dirb/common.txt"] }) +
        fig("/images/easypeasy/gobuster-root.webp", "/hidden returns a 301 redirect.")) +

      step(2, "Brute-force again inside /hidden/",
        term({ ...K, cwd: "~/Desktop/Study/THM", cmds: ["gobuster dir -u http://easypeasy.thm/hidden/ -w /usr/share/wordlists/dirb/common.txt"] }) +
        fig("/images/easypeasy/gobuster-hidden.webp", "/hidden/whatever/ is the next level.")) +

      step(3, "Read the page source of /hidden/whatever/",
        "<p>The page looks like a plain background image, so I open DevTools instead of assuming there is nothing there.</p>" +
        fig("/images/easypeasy/whatever-devtools.webp", "A paragraph hidden with display: none holds a Base64 string (blurred).") +
        "<p>The paragraph is hidden with CSS, but its text is still in the source.</p>") +

      step(4, "Decode the Base64",
        term({ ...K, cmds: ["echo hidden-string | base64 -d"] }) +
        fig("/images/easypeasy/flag1-decode.webp", "Flag 1 (blurred)."))
    },

    { id: "flag2", h: "Flag 2", body:
      step(1, "Read robots.txt on port 65524",
        "<p>I open <code>http://easypeasy.thm:65524/robots.txt</code>.</p>" +
        fig("/images/easypeasy/robots.webp", "A second User-Agent value that looks like an MD5 hash.") +
        "<p>The custom User-Agent value <code>a18672860d0510e5ab6699730763b250</code> is 32 hex characters, the shape of an MD5 hash.</p>") +

      step(2, "Look the hash up",
        "<p>I paste it into Hashes.com, which has it in its database.</p>" +
        fig("/images/easypeasy/hashes-com.webp", "Hashes.com finds the plaintext: flag 2 (blurred)."))
    },

    { id: "flag3", h: "Flag 3", body:
      step(1, "Read the Apache default page on port 65524",
        "<p>The Apache default page looks normal, but I read the configuration overview line by line.</p>" +
        fig("/images/easypeasy/apache-default.webp", "One line of the default text holds flag 3 (blurred).") +
        "<p>Flag 3 sits in the middle of the normal Apache text, where it is easy to scroll past.</p>")
    },

    { id: "hidden-dir", h: "The hidden directory", body:
      step(1, "Read the page source on port 65524",
        "<p>In DevTools, the same page has another hidden paragraph: \"its encoded with ba....\" followed by a string.</p>" +
        fig("/images/easypeasy/apache-devtools.webp", "The encoded value in the hidden paragraph.")) +

      step(2, "Decode it in CyberChef",
        "<p>Base64 gives garbage, so I try the other bases. <strong>From Base62</strong> gives a clean path.</p>" +
        fig("/images/easypeasy/cyberchef-base62.webp", "CyberChef, From Base62: the hidden directory.") +
        "<p>The hidden directory is <code>/n0th1ng3ls3m4tt3r</code>.</p>")
    },

    { id: "hash", h: "Crack the hash", body:
      step(1, "Collect the files from the hidden directory",
        "<p><code>http://easypeasy.thm:65524/n0th1ng3ls3m4tt3r/</code> shows an image of binary code, and its source holds a long hash. I save the image, the hash (in <code>hash.txt</code>) and the wordlist from the room.</p>" +
        fig("/images/easypeasy/hidden-dir-files.webp", "binarycodepixabay.jpg, the room wordlist and hash.txt.")) +

      step(2, "Crack it with john and the room's wordlist",
        term({ ...K, cmds: ["john --format=gost --wordlist=easypeasy_1596838725703.txt hash.txt"] }) +
        fig("/images/easypeasy/john.webp", "john loads one GOST R 34.11-94 hash and cracks it (password blurred).") +
        "<p>The hash is <code>940d71e8655ac41efb5f8ab850668505b86dd64186a66e57d1483e7f5fe6fd81</code>. <code>--format=gost</code> tells john the hash type, so it does not waste time guessing. The cracked password is the passphrase for the image in the next step.</p>")
    },

    { id: "ssh-password", h: "The SSH password", body:
      step(1, "Extract the hidden file from the image",
        term({ ...K, cmds: ["steghide extract -sf binarycodepixabay.jpg", "cat secrettext.txt"] }) +
        fig("/images/easypeasy/steghide.webp", "The john password unlocks secrettext.txt: username boring and a binary password (blurred).") +
        "<p>Steghide asks for a passphrase, and the password from john works. The file holds a username, <code>boring</code>, and a password written as groups of 8 binary digits.</p>" +
        why("Steganography hides data inside an ordinary file. The picture looks normal, but Steghide stored an encrypted file in it, and only the right passphrase gets it out.")) +

      step(2, "Turn the binary into text",
        "<p>In CyberChef I use <strong>From Binary</strong> with delimiter Space and byte length 8, so each group of eight bits becomes one character.</p>" +
        fig("/images/easypeasy/cyberchef-binary.webp", "From Binary: the SSH password (blurred)."))
    },

    { id: "user", h: "User flag", body:
      step(1, "SSH in on port 6498",
        term({ ...K, cmds: ["ssh boring@10.48.186.227 -p 6498"] }) +
        fig("/images/easypeasy/ssh-login.webp", "Logged in as boring.") +
        "<p>SSH is on 6498, not 22, so I set the port with <code>-p</code>.</p>") +

      step(2, "Read user.txt",
        term({ ...B, cmds: ["ls", "cat user.txt"] }) +
        fig("/images/easypeasy/user-txt.webp", "\"It seems wrong, like it's rotated\" (value blurred).") +
        "<p>The value has the shape of a flag, but the letters are shifted.</p>") +

      step(3, "Decode ROT13",
        "<p>The hint says \"rotated\", so I paste it into Cryptii with <strong>ROT13</strong>.</p>" +
        fig("/images/easypeasy/cryptii-rot13.webp", "ROT13 gives the user flag (blurred).") +
        "<p>ROT13 moves every letter 13 places. It is a letter swap, not encryption, so it needs no key.</p>")
    },

    { id: "root", h: "Root flag", body:
      step(1, "Find a writable script in /var/www",
        term({ ...B, cmds: [["cd /", "/etc"], ["cd var/www/", "/"], ["ls", "/var/www"], ["ls -la", "/var/www"]] }) +
        fig("/images/easypeasy/www-ls.webp", ".mysecretcronjob.sh is owned by boring.") +
        "<p>The hidden file <code>.mysecretcronjob.sh</code> belongs to <code>boring</code>, so I can edit it.</p>") +

      step(2, "Read the script",
        term({ ...B, cwd: "/var/www", cmds: ["nano .mysecretcronjob.sh"] }) +
        fig("/images/easypeasy/cronjob-original.webp", "\"# i will run as root\"") +
        "<p>The comment says it runs as root. A script I can edit that runs as root on a timer is the way up.</p>") +

      step(3, "Put a reverse shell in it",
        "<p>I take the Bash reverse shell from GTFOBins and change the address to my tun0 VPN IP and port 12345.</p>" +
        fig("/images/easypeasy/gtfobins-bash.webp", "GTFOBins, bash, reverse shell.") +
        fig("/images/easypeasy/cronjob-edited.webp", "The edited script calls back to 192.168.137.189:12345.")) +

      step(4, "Catch the root shell",
        term({ ...K, cmds: ["nc -nlvp 12345"] }) +
        fig("/images/easypeasy/listener-root.webp", "The cron job connects back; whoami: root.") +
        why("cron runs <code>.mysecretcronjob.sh</code> as root, but the file is owned by <code>boring</code>. Whatever I write in it runs as root on the next run, so the reverse shell opens with root rights.")) +

      step(5, "Read the hidden root flag",
        term({ ...R, cmds: ["pwd", "ls -la", "cat .root.txt"] }) +
        fig("/images/easypeasy/root-flag.webp", ".root.txt is hidden; ls -la shows it (flag blurred).") +
        "<p>The flag file starts with a dot, so a plain <code>ls</code> would not show it.</p>")
    }
  ]
};
