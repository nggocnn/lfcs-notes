# Essential Commands

This section covers the command-line skills that appear constantly in Linux administration: logging in, navigating the filesystem, managing files, reading help, searching text, handling permissions, working with archives, redirecting input/output, certificates, Git, systemd services and their constraints, performance monitoring, and disk space troubleshooting.

## 1. Accessing local and remote Linux systems

Linux systems are commonly managed through text terminals. On servers, the most important remote access method is SSH.

- Local text console: direct login on the machine itself
- Terminal emulator: graphical app that opens a shell
- Remote text login: SSH
- Remote graphical login: usually VNC or RDP if configured

Example:

```bash
$ ssh alice@192.168.0.17
alice@192.168.0.17's password:
Welcome to Ubuntu 24.04 LTS
alice@server:~$
```

Useful SSH checks:

```bash
$ ssh -V
OpenSSH_9.6p1 Ubuntu-3ubuntu13.8, OpenSSL 3.0.13

$ ssh -v alice@localhost
OpenSSH_9.6p1 Ubuntu-3ubuntu13.8
debug1: Connecting to localhost [127.0.0.1] port 22.
debug1: Authentication succeeded (password).
```

## 2. Getting help fast

`--help`, `man`, and `apropos` are exam-critical because they are fast and always available.

- `command --help`: quick syntax and option reminder
- `man command`: full manual
- `apropos keyword`: search man page descriptions
- `mandb`: rebuild the man page database if `apropos` returns nothing

Examples:

```bash
$ ls --help
Usage: ls [OPTION]... [FILE]...
  -a, --all                  do not ignore entries starting with .
  -l                         use a long listing format
```

```bash
$ apropos -s 1,8 director
mkdir (1)            - make directories
rmdir (1)            - remove empty directories
```

## 3. Filesystem tree, absolute paths, and relative paths

Linux uses a single filesystem tree rooted at `/`.

- Absolute path: starts from `/`
- Relative path: starts from current working directory
- `.` means current directory
- `..` means parent directory

Examples:

```bash
$ pwd
/home/alice/projects

$ cd /var/log
$ pwd
/var/log

$ cd ../tmp
$ pwd
/var/tmp
```

## 4. Creating, copying, moving, and deleting files and directories

Core file-management commands:

- `touch` create empty files
- `mkdir` create directories
- `cp` copy files or directories
- `mv` move or rename files
- `rm` remove files
- `rmdir` remove empty directories
- `rm -r` remove directories recursively

Examples:

```bash
$ mkdir notes
$ touch notes/todo.txt
$ cp notes/todo.txt notes/todo.bak
$ mv notes/todo.bak notes/archive.txt
$ ls -l notes
total 0
-rw-r--r-- 1 alice alice 0 Jun 22 10:00 archive.txt
-rw-r--r-- 1 alice alice 0 Jun 22 10:00 todo.txt
```

```bash
$ rm notes/archive.txt
$ rmdir notes
rmdir: failed to remove 'notes': Directory not empty
```

## 5. Hard links and symbolic links

There are two types of links:

- Hard link: another directory entry pointing to the same inode
- Soft link (symbolic link): a special file pointing to a path

Important differences:

- Hard links usually work only on the same filesystem
- Hard links normally target files, not directories
- Symbolic links can point to files or directories, even across filesystems
- Deleting one hard link does not delete the data until the last link is removed

Examples:

```bash
$ ln report.txt report.hardlink
$ stat report.txt
  File: report.txt
  Links: 2
```

```bash
$ ln -s /var/log/syslog syslog-link
$ ls -l syslog-link
lrwxrwxrwx 1 alice alice 15 Jun 22 10:05 syslog-link -> /var/log/syslog

$ readlink syslog-link
/var/log/syslog
```

## 6. Ownership and permissions

Every file has:

- user owner
- group owner
- permission bits for user, group, others

Useful commands:

- `ls -l` show symbolic permissions
- `chmod` change permissions
- `chown` change owner or owner:group

Examples:

```bash
$ ls -l family_dog.jpg
-rw-r--r-- 1 alice family 204800 Jun 22 10:10 family_dog.jpg
```

```bash
$ chmod 640 family_dog.jpg
$ ls -l family_dog.jpg
-rw-r----- 1 alice family 204800 Jun 22 10:10 family_dog.jpg
```

```bash
$ sudo chown bob:developers family_dog.jpg
$ ls -l family_dog.jpg
-rw-r----- 1 bob developers 204800 Jun 22 10:10 family_dog.jpg
```

Permission logic:

- `r` read
- `w` write
- `x` execute
- octal: `4=read`, `2=write`, `1=execute`
- example: `755 = rwx r-x r-x`

## 7. Finding files and directories

`find` is the main tool for searching by name, size, time, and permissions.

Common patterns:

- `-name`, `-iname`
- `-mmin`, `-cmin`
- `-size`
- `-perm`
- logical operators such as `-o` and `-not`

Examples:

```bash
$ find /bin -name file1.txt
```

```bash
$ find /usr/share -name "*.jpg"
/usr/share/backgrounds/wallpaper.jpg
```

```bash
$ find /tmp -mmin -5
/tmp/recent.log
```

```bash
$ find . -perm 600
./secret.txt
```

## 8. Viewing and transforming text

Linux administration is heavily text-based. These tools appear constantly:

- `cat`, `less`
- `head`, `tail`
- `cut`
- `sort`
- `uniq`
- `wc`
- `sed`

Examples:

```bash
$ head -n 3 /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
```

```bash
$ cut -d ':' -f 1 /etc/passwd | head -n 3
root
daemon
bin
```

```bash
$ sort countries.txt | uniq
Canada
Japan
Vietnam
```

Replacing text with `sed`:

```bash
$ sed 's/canda/canada/g' userinfo.txt
alice canada
bob canada

$ sed -i 's/canda/canada/g' userinfo.txt
```

## 9. Searching text with grep and regular expressions

`grep`, basic regex, and extended regex are all heavily tested on the LFCS exam.

Typical uses:

- search files recursively
- filter uncommented config lines
- match patterns with ranges, sets, repetition, and alternation

Examples:

```bash
$ grep -r '^The' /etc/
/etc/somefile:The quick brown fox
grep: /etc/ssl/private: Permission denied
```

Suppress errors:

```bash
$ grep -r '^The' /etc/ 2>/dev/null
/etc/somefile:The quick brown fox
```

Filter out comments, then sort:

```bash
$ grep -v '^#' /etc/login.defs | sort
CREATE_HOME yes
ENCRYPT_METHOD SHA512
MAIL_DIR /var/mail
```

Extended regex examples:

```bash
$ egrep -r 'c[au]t' /etc/
$ egrep -r '/dev/[a-z]*[0-9]?' /etc/
$ egrep -r 'https[^:]' /etc/
```

## 10. Archiving and compression

The key distinction is:

- archiving: pack many files into one archive
- compression: reduce storage size

Main tools:

- `tar`
- `gzip`
- `bzip2`
- `xz`

Examples:

```bash
$ tar tf archive.tar
file1
file2
Pictures/
```

```bash
$ tar cf archive.tar file1
$ tar rf archive.tar file2
$ tar xf archive.tar -C /tmp/
```

Create compressed archives:

```bash
$ tar czf archive.tar.gz file1
$ tar cjf archive.tar.bz2 file1
$ tar cJf archive.tar.xz file1
```

Compression utilities:

```bash
$ gzip --keep file1
$ ls
file1  file1.gz

$ gzip --decompress file1.gz
$ ls
file1
```

## 11. Input/output redirection and pipes

This is one of the highest-value shell topics on the LFCS exam.

Key streams:

- stdin: standard input
- stdout: normal output
- stderr: error output

Common operators:

- `>` overwrite stdout to file
- `>>` append stdout
- `2>` redirect stderr
- `2>&1` merge stderr into stdout
- `|` pipe stdout to next command

Examples:

```bash
$ sort file.txt > sortedfile.txt
$ cat sortedfile.txt
1
2
3
```

```bash
$ grep -r '^The' /etc/ >all_output.txt 2>&1
$ tail -n 3 all_output.txt
/etc/somefile:The quick brown fox
grep: /etc/ssl/private: Permission denied
```

```bash
$ grep -v '^#' /etc/login.defs | sort | column -t
CREATE_HOME     yes
ENCRYPT_METHOD  SHA512
MAIL_DIR        /var/mail
```

## 12. Creating and inspecting TLS certificate requests

The lecture introduces `openssl` for certificate and CSR management.

Common use:

- create private key + CSR
- inspect certificate details

Examples:

```bash
$ openssl req -newkey rsa:4096 -keyout priv.key -out cert.csr
Generating a RSA private key
Enter PEM pass phrase:
-----
```

```bash
$ openssl x509 -in my.crt -text | grep Subject:
        Subject: CN = example.com
```

Why this matters:

- the private key stays secret
- the CSR is sent to a certificate authority
- the signed certificate is used by services such as web servers

## 13. Basic Git workflow

Git is used in the course for essential file versioning tasks.

Core actions:

- stage with `git add`
- commit with `git commit`
- inspect history with `git log`
- branch with `git branch`
- switch branches with `git checkout`
- merge with `git merge`

Examples:

```bash
$ git add *.cpp
$ git commit -m "Add parser fixes"
[master 1a2b3c4] Add parser fixes
 2 files changed, 18 insertions(+)
```

```bash
$ git branch testing
$ git checkout testing
Switched to branch 'testing'
```

```bash
$ git merge testing
Updating 1a2b3c4..5d6e7f8
Fast-forward
```

## 14. What to practice for LFCS

Focus on speed and repetition with:

- SSH login and navigation
- file creation, movement, and deletion
- permissions and ownership
- `find`, `grep`, and regex
- `tar` and compression tools
- redirection and pipelines
- reading help through `--help`, `man`, and `apropos`
- finding what fills a disk (`df -h`, `df -i`, `du -xh`, `lsof +L1`) (section 28)
- writing a systemd unit, fixing a failing one, and adding drop-ins (section 29)
- reading and setting service limits (`systemctl set-property`, `/proc/<pid>/limits`) (section 30)
- creating and inspecting certificates with `openssl` (section 32)
- cloning, branching, committing and pushing with Git (section 33)

If you can do these without stopping to think, the rest of the exam gets much easier.

## 15. Man page section numbers

Man pages are organised into numbered sections. The section number matters when the same name exists in multiple sections (for example, `passwd` the command versus `passwd` the file format).

| Section | Content                              |
| ------- | ------------------------------------ |
| 1       | User commands                        |
| 2       | System calls                         |
| 3       | Library functions                    |
| 4       | Special files (devices)              |
| 5       | File formats and configuration files |
| 6       | Games                                |
| 7       | Miscellaneous (standards, protocols) |
| 8       | System administration commands       |
| 9       | Kernel routines                      |

To open a page from a specific section, pass the number before the name:

```bash
$ man 1 passwd
PASSWD(1)        User Commands

$ man 5 passwd
PASSWD(5)        File Formats and Configuration Files
```

`apropos` accepts `-s` to filter by section:

```bash
$ apropos -s 1,8 director
mkdir (1)            - make directories
rmdir (1)            - remove empty directories
```

## 16. TAB autocompletion

Bash can complete commands, file paths, and option names when you press TAB. This saves typing and avoids spelling mistakes.

- Press TAB once: complete if there is exactly one match
- Press TAB twice: list all matches when there are several

```bash
$ ls /etc/ssh/sshd_co<TAB>
$ ls /etc/ssh/sshd_config

$ ls /etc/ssh/ssh<TAB><TAB>
ssh_config        ssh_config.d/     sshd_config       sshd_config.d/
```

TAB completion works for commands, paths, and (with bash-completion installed) many option flags.

## 17. Useful cd shortcuts

Two shortcuts reduce navigation keystrokes significantly.

`cd` with no argument returns to the home directory:

```bash
$ pwd
/var/log/nginx
$ cd
$ pwd
/home/alice
```

`cd -` switches to the previous working directory, useful when toggling between two locations:

```bash
$ cd /etc/ssh
$ cd /var/log
$ cd -
/etc/ssh
$ pwd
/etc/ssh
```

## 18. The stat command and inodes

Every file on an ext4 or xfs filesystem is tracked by an inode. The inode stores metadata: file type, size, owner, permissions, link count, and four timestamps. The `stat` command displays all of this at once.

```bash
$ stat report.txt
  File: report.txt
  Size: 2048            Blocks: 8          IO Block: 4096   regular file
Device: 8,1     Inode: 524291          Links: 1
Access: (0644/-rw-r--r--)  Uid: ( 1000/   alice)   Gid: ( 1000/   alice)
Access: 2026-06-22 09:00:01.000000000 +0000
Modify: 2026-06-22 09:00:01.000000000 +0000
Change: 2026-06-22 09:05:30.000000000 +0000
 Birth: 2026-06-22 09:00:01.000000000 +0000
```

The four timestamps mean:

- **Access**: last time the file contents were read
- **Modify**: last time file contents changed (or the file was created)
- **Change**: last time file metadata changed (e.g. permissions, owner, link count)
- **Birth**: when the file was first created

`find` filters on modify time with `-mmin`/`-mtime` and on change time with `-cmin`/`-ctime`. Knowing the difference matters for writing correct `find` expressions.

## 19. Changing group ownership with chgrp and groups

`chown` can set owner and group together (`chown user:group`), but `chgrp` changes only the group. Use it when you want to transfer group ownership without touching the user owner.

```bash
$ ls -l report.txt
-rw-r--r-- 1 alice alice 2048 Jun 22 10:00 report.txt

$ chgrp developers report.txt
$ ls -l report.txt
-rw-r--r-- 1 alice developers 2048 Jun 22 10:00 report.txt
```

To see which groups the current user belongs to:

```bash
$ groups
alice sudo developers docker
```

A user can own a file under any group they belong to. Group membership controls what the "group" permission bits grant.

## 20. Octal permissions in depth

Permission bits are stored as three triplets (user, group, others), each encoding read/write/execute. The binary representation maps directly to octal digits.

| Symbol | Binary | Octal value |
| ------ | ------ | ----------- |
| r      | 100    | 4           |
| w      | 010    | 2           |
| x      | 001    | 1           |
| rw     | 110    | 6           |
| rx     | 101    | 5           |
| rwx    | 111    | 7           |
| ---    | 000    | 0           |

So `chmod 754` means:

- user: `7` = rwx
- group: `5` = r-x
- others: `4` = r--

Check the current octal value with `stat`:

```bash
$ stat -c '%a %n' report.txt
644 report.txt
```

Set permissions in one step:

```bash
$ chmod 640 report.txt
$ ls -l report.txt
-rw-r----- 1 alice developers 2048 Jun 22 10:00 report.txt
```

## 21. Advanced find: time-based filters

`find` supports filtering by how recently a file's content or metadata changed.

- `-mmin N` - modified within N minutes
- `-mtime N` - modified within N days (day = 24 hours)
- `-cmin N` - changed (metadata) within N minutes
- `-ctime N` - changed within N days

Prefix N with `-` for "less than" and `+` for "more than":

```bash
# modified in the last 5 minutes
$ find /tmp -mmin -5
/tmp/recent.log

# modified between 24 and 48 hours ago (exactly 1 day ago)
$ find /var/log -mtime 1
/var/log/syslog.1

# modified more than 7 days ago
$ find /var/log -mtime +7
/var/log/auth.log.4.gz

# metadata changed in the last 10 minutes (e.g. chmod was run)
$ find /etc -cmin -10
/etc/hosts
```

`-mtime 0` means modified in the last 24 hours. `-mtime 1` means modified between 24 and 48 hours ago (not "1 day ago" as a human might guess).

## 22. Advanced find: size filters

`-size` accepts unit suffixes: `c` (bytes), `k` (kilobytes), `M` (megabytes), `G` (gigabytes).

```bash
# exactly 1 MB
$ find /var -size 1M

# larger than 100 MB
$ find /home -size +100M
/home/alice/Videos/demo.mp4

# smaller than 10 kilobytes
$ find /etc -size -10k
/etc/hostname
/etc/timezone
```

Combine size and time filters to narrow down recent large files:

```bash
$ find /var/log -size +10M -mtime -1
/var/log/kern.log
```

## 23. Advanced find: permission filters

`-perm` supports three forms depending on how strict the match should be.

- **Exact** (`-perm 664`): only files whose permissions are exactly `664`
- **Minimum** (`-perm -664`): files that have at least all the bits in `664` set (may have more)
- **Any** (`-perm /664`): files that have any of the bits in `664` set

```bash
# exactly 664
$ find . -perm 664
./shared.txt

# at least 664 (could be 775, 777, etc.)
$ find . -perm -664
./shared.txt
./full.txt

# any of the r/w bits for user or group
$ find . -perm /664
./shared.txt
./full.txt
./readonly.txt
```

Symbolic form works too: `-perm u=rw,g=rw,o=r` is the same as `-perm 664`, and `-perm -u=rw,g=rw,o=r` is the minimum form.

## 24. tac: print a file in reverse line order

`tac` is `cat` backwards. It reads a file and prints the lines in reverse order, last line first. This is useful when a log file puts recent events at the bottom and you want to see the latest entries immediately.

```bash
$ cat /var/log/app.log
2026-06-20 restarted
2026-06-21 error: disk full
2026-06-22 recovered

$ tac /var/log/app.log
2026-06-22 recovered
2026-06-21 error: disk full
2026-06-20 restarted
```

Unlike `tail`, which limits by number of lines, `tac` outputs the entire file reversed.

## 25. Comparing files with diff and sdiff

`diff` shows what is different between two files. The output uses `<` for lines only in the first file and `>` for lines only in the second.

```bash
$ diff original.txt updated.txt
3c3
< alice canada
---
> alice Canada
```

`diff -c` adds surrounding context lines to make the change clearer:

```bash
$ diff -c original.txt updated.txt
*** original.txt
--- updated.txt
***************
*** 1,3 ****
  bob usa
  carol uk
! alice canada
--- 1,3 ----
  bob usa
  carol uk
! alice Canada
```

`diff -y` and `sdiff` show files side by side:

```bash
$ diff -y original.txt updated.txt
bob usa                    bob usa
carol uk                   carol uk
alice canada             | alice Canada

$ sdiff original.txt updated.txt
bob usa                    bob usa
carol uk                   carol uk
alice canada             | alice Canada
```

`sdiff` is a standalone command that behaves like `diff -y`. Both are useful for reviewing config changes before applying them.

## 26. Additional grep flags: -v, -w, -o, -i, --color, -E

The existing notes cover basic `grep`. The PDF adds several flags that appear on the exam.

**-v (invert match)**: show lines that do NOT match:

```bash
# show only active (non-comment) settings
$ grep -v '^#' /etc/login.defs
CREATE_HOME     yes
ENCRYPT_METHOD  SHA512
MAIL_DIR        /var/mail
```

**-i (case-insensitive)**:

```bash
$ grep -i 'password' /etc/ssh/sshd_config
#PermitRootLogin prohibit-password
#PasswordAuthentication yes
```

**-w (whole word only)**: match the exact word, not substrings. `grep -i 'password'` also matches `PasswordAuthentication`, but `grep -wi 'password'` does not:

```bash
$ grep -wi 'password' /etc/ssh/sshd_config
#PermitRootLogin prohibit-password
# the setting of "PermitRootLogin without-password".
```

**-o (only matching)**: print only the matched portion of each line, not the whole line:

```bash
$ grep -oi 'password' /etc/ssh/sshd_config
password
Password
Password
password
```

**--color**: force colour highlighting (useful when running as `sudo`, where colour may be disabled):

```bash
$ sudo grep -ri --color 'password' /etc/
```

**-E (extended regex)** / **egrep**: use extended regular expressions so that `+`, `?`, `{`, `|`, `(`, `)` work as operators without backslash escaping:

```bash
# BRE: must backslash + to make it an operator
$ grep -r '0\+' /etc/

# ERE: + is an operator natively
$ grep -Er '0+' /etc/
$ egrep -r '0+' /etc/
```

## 27. Regex operators reference

When combined with `grep -E` or `egrep`, these operators build powerful patterns.

| Operator | Meaning                                  | Example                                |
| -------- | ---------------------------------------- | -------------------------------------- |
| `^`      | Line begins with                         | `^#` matches comment lines             |
| `$`      | Line ends with                           | `mail$` matches lines ending in "mail" |
| `.`      | Any single character                     | `c.t` matches cat, cut, crt            |
| `*`      | Previous element 0 or more times         | `let*` matches le, let, lettt          |
| `+`      | Previous element 1 or more times         | `0+` matches 0, 00, 000                |
| `?`      | Previous element 0 or 1 times (optional) | `colou?r` matches color, colour        |
| `{n,}`   | Previous element at least n times        | `0{3,}` matches 000, 0000, …           |
| `{n,m}`  | Previous element n to m times            | `0{2,4}` matches 00, 000, 0000         |
| `\|`     | Alternation (BRE) / `\|` or `            | ` in ERE                               | `cat\|dog` matches cat or dog |
| `[abc]`  | Character class                          | `[au]` matches a or u                  |
| `[a-z]`  | Range                                    | `[a-z]` matches any lowercase letter   |
| `[^abc]` | Negated class                            | `[^:]` matches anything except `:`     |
| `()`     | Grouping (ERE)                           | `(ab)+` matches ab, abab, …            |
| `\.`     | Escaped dot (literal `.`)                | `192\.168` matches 192.168 exactly     |

Practical examples:

```bash
# lines that begin with PASS
$ grep '^PASS' /etc/login.defs
PASS_MAX_DAYS   99999
PASS_MIN_DAYS   0
PASS_WARN_AGE   7

# lines ending with the word mail
$ grep 'mail$' /etc/login.defs
MAIL_DIR        /var/mail

# match c followed by any char followed by t (cat, cut, crt, c1t...)
$ grep -r 'c.t' /etc/

# at least 3 zeroes in a row
$ egrep -r '0{3,}' /etc/

# match IP-like path pattern (starts with /, has 0+ chars, ends with /)
$ grep -r '/.*/' /etc/
```

Always prefer `egrep` (or `grep -E`) over plain `grep` when your pattern uses `+`, `?`, `{`, `|`, or `()`, to avoid having to remember which characters need backslash escaping.

## 28. Troubleshooting disk space

A full disk shows up as `No space left on device`. There are three possible causes, so check them in this order: out of blocks, out of inodes, or space held by a deleted file that a process still has open.

```bash
# which filesystem is full (blocks)
$ df -h
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        39G   39G     0 100% /

# which filesystem is out of inodes (many tiny files)
$ df -i

# biggest directories, staying on one filesystem (-x)
$ sudo du -xh --max-depth=1 / 2>/dev/null | sort -h | tail
$ sudo du -xh --max-depth=1 /var | sort -h | tail

# biggest files
$ sudo find / -xdev -type f -size +100M -exec ls -lh {} \; 2>/dev/null
```

When `df` says the disk is full but `du` can't find the files, a process is holding a deleted file open:

```bash
$ sudo lsof +L1
COMMAND  PID USER  FD  TYPE DEVICE  SIZE/OFF NLINK NODE NAME
myapp   1234 root  3w  REG  8,1    5368709120   0 1311 /var/log/myapp.log (deleted)
```

You can free the space in two ways. Restart the process with `sudo systemctl restart myapp`. Or truncate the file through `/proc` without killing the process:

```bash
$ sudo truncate -s 0 /proc/1234/fd/3
```

Common places to clean up:

```bash
$ sudo journalctl --disk-usage
$ sudo journalctl --vacuum-size=200M    # or --vacuum-time=7d
$ sudo apt clean                         # cached .deb files
$ sudo find /var/log -name '*.gz' -mtime +30 -delete
```

When inodes run out, look for the directory with the most entries:

```bash
$ sudo find / -xdev -type d -exec sh -c 'echo "$(ls -A "$1" | wc -l) $1"' _ {} \; 2>/dev/null | sort -n | tail
```

## 29. Creating and troubleshooting a systemd service

The exam can ask you to turn a script into a service, or to fix a service that won't start.

Minimal unit file at `/etc/systemd/system/myapp.service`:

```ini
[Unit]
Description=My application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=myapp
ExecStart=/usr/local/bin/myapp.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Activate it:

```bash
$ sudo systemctl daemon-reload          # after every unit file edit
$ sudo systemctl enable --now myapp.service
$ systemctl is-enabled myapp ; systemctl is-active myapp
enabled
active
```

Troubleshooting flow when a service fails:

```bash
$ systemctl status myapp                 # last log lines and exit code
$ journalctl -u myapp -b --no-pager -n 50
$ systemd-analyze verify /etc/systemd/system/myapp.service
```

Common causes:

- `ExecStart` is not an absolute path
- the script is not executable or has no shebang
- the `User=` account doesn't exist
- the port is already in use (`ss -tlnp | grep :8080`)
- `daemon-reload` was forgotten after an edit
- a unit is masked (`systemctl unmask myapp`)

To change a packaged unit without editing it, use a drop-in. Vendor units in `/lib/systemd/system` get overwritten on upgrade, so edit the override instead:

```bash
$ sudo systemctl edit nginx              # writes /etc/systemd/system/nginx.service.d/override.conf
$ systemctl cat nginx                    # shows the unit plus all drop-ins
$ sudo systemctl revert nginx            # remove all overrides
```

To replace a list setting such as `ExecStart` in a drop-in, clear it first:

```ini
[Service]
ExecStart=
ExecStart=/usr/sbin/nginx -g 'daemon off;'
```

## 30. Service and application constraints

"Determine application and service specific constraints" means finding what limits a service: resource limits, the user it runs as, ports, file permissions and security policy.

Read the effective settings of a unit:

```bash
$ systemctl show myapp -p User -p MemoryMax -p CPUQuotaPerSecUSec -p TasksMax -p LimitNOFILE
$ cat /proc/$(systemctl show -p MainPID --value myapp)/limits
```

Set cgroup limits on a unit. `set-property` is persistent by default and writes a drop-in for you:

```bash
$ sudo systemctl set-property myapp.service MemoryMax=512M CPUQuota=50%
$ sudo systemctl set-property --runtime myapp.service CPUQuota=20%   # until reboot
$ systemd-cgtop                                                      # live usage per unit
```

Or put them in a drop-in with `systemctl edit myapp`:

```ini
[Service]
MemoryMax=512M
CPUQuota=50%
TasksMax=100
LimitNOFILE=65536
```

Other constraints to check:

- the port: `ss -tlnp` shows which process owns it
- the account: `id myapp`, and whether it can read its files (`namei -l /path/to/file`)
- security policy: AppArmor on Ubuntu (`aa-status`) or SELinux on RHEL-family systems (`ausearch -m avc -ts recent`)
- per-user limits from `/etc/security/limits.conf`. These apply to PAM logins, not to systemd services; services use `Limit*=` in the unit.

## 31. Monitoring system performance

Quick triage, from broad to specific:

```bash
$ uptime                     # load averages 1/5/15 min; compare with nproc
$ free -h                    # memory and swap; 'available' is what matters
$ vmstat 2 5                 # r = runnable, si/so = swapping, wa = I/O wait
$ top -o %MEM                # or press P (CPU) / M (memory) inside top
$ ps aux --sort=-%cpu | head
$ ps aux --sort=-%mem | head
$ systemctl --failed         # failed units
$ journalctl -p err -b       # errors since boot
$ dmesg -T | tail            # kernel messages (OOM killer, disk errors)
```

An OOM kill looks like `Out of memory: Killed process 1234 (myapp)` in `dmesg` or `journalctl -k`.

## 32. Working with SSL certificates

Beyond creating a CSR (section 12), you should be able to make a self-signed certificate, inspect one, and check that a key matches its certificate.

Self-signed certificate without a passphrase (`-noenc` replaces the older `-nodes`), valid for 365 days:

```bash
$ openssl req -x509 -newkey rsa:2048 -noenc -days 365 \
    -keyout /etc/ssl/private/web.key -out /etc/ssl/certs/web.crt \
    -subj "/C=US/O=Lab/CN=web.example.com"
```

Key and CSR without prompts:

```bash
$ openssl req -new -newkey rsa:2048 -noenc -keyout app.key -out app.csr -subj "/CN=app.example.com"
$ openssl req -in app.csr -noout -text      # inspect a CSR
```

Inspect a certificate:

```bash
$ openssl x509 -in web.crt -noout -subject -issuer -dates
$ openssl x509 -in web.crt -noout -text | less
$ openssl x509 -in web.crt -noout -checkend 86400 && echo "valid for 1 more day"
```

Check that a key belongs to a certificate. The two digests must be identical:

```bash
$ openssl x509 -in web.crt -noout -pubkey | openssl sha256
$ openssl pkey -in web.key -pubout | openssl sha256
```

Look at the certificate of a remote server:

```bash
$ openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null \
    | openssl x509 -noout -subject -dates
```

Sign a CSR with your own CA:

```bash
$ openssl x509 -req -in app.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out app.crt -days 90
```

Keep private keys at `chmod 600`, owned by root.

## 33. More Git operations

Beyond the basics in section 13:

```bash
$ git init project && cd project
$ git config --global user.name "Lab User"
$ git config --global user.email lab@example.com
$ git status
$ git diff                    # unstaged changes
$ git diff --staged           # staged changes
$ git switch -c feature       # create and switch (newer form of checkout -b)
$ git log --oneline --graph --all
$ git restore file.txt        # drop unstaged changes to file.txt
$ git rm old.txt ; git mv a.txt b.txt
```

Remotes:

```bash
$ git clone https://example.com/repo.git
$ git clone /srv/git/repo.git            # a local bare repo works too
$ git remote -v
$ git remote add origin /srv/git/repo.git
$ git push -u origin main
$ git pull
```

Create a bare repository that others push to:

```bash
$ sudo git init --bare /srv/git/repo.git
```

Tag a release with `git tag v1.0` and push it with `git push origin v1.0`.
