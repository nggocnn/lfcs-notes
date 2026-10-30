# Quiz: Essential Commands (20%)

Answer from memory first, then open the answer. Mark each miss in the "Misses" list in [PLAN.md](../PLAN.md) and redo it two days later. Notes: [01-essential-commands.md](../01-essential-commands.md).

**Q1.** Which `man` section holds system administration commands, and how do you open `passwd` from section 5?

<details><summary>Answer</summary>

Section 8 holds admin commands. `man 5 passwd` opens the file format page for `/etc/passwd`.

</details>

**Q2.** You remember only that a command "lists block devices". How do you find it offline?

<details><summary>Answer</summary>

`apropos 'block devices'` or `man -k 'block devices'`. Run `sudo mandb` first if the index is empty.

</details>

**Q3.** Difference between a hard link and a symbolic link? Which one can cross filesystems?

<details><summary>Answer</summary>

A hard link is another name for the same inode. It can't cross filesystems or point to a directory. A symlink is a separate file holding a path. It can cross filesystems and breaks if the target is removed. Create them with `ln target link` and `ln -s target link`.

</details>

**Q4.** Write the octal mode for `rwxr-x---` and for `rw-r--r--` with the setgid bit.

<details><summary>Answer</summary>

`750` and `2644`.

</details>

**Q5.** What does the sticky bit do on `/tmp`, and how do you set it?

<details><summary>Answer</summary>

Only the file's owner, the directory's owner or root can delete or rename a file in that directory. Set it with `chmod +t /dir` or `chmod 1777 /dir`.

</details>

**Q6.** Find all files under `/var` larger than 50 MB that were modified in the last 7 days.

<details><summary>Answer</summary>

`find /var -type f -size +50M -mtime -7`

</details>

**Q7.** Find files under `/srv` owned by user `alice` and copy them to `/backup/alice/`, keeping attributes.

<details><summary>Answer</summary>

`find /srv -user alice -type f -exec cp -a {} /backup/alice/ \;`

</details>

**Q8.** Find files with exactly mode 664, and files with at least those permission bits set.

<details><summary>Answer</summary>

Exactly: `find . -perm 664`. At least: `find . -perm -664`. Any of the bits: `find . -perm /664`.

</details>

**Q9.** Print only the non-comment, non-empty lines of `/etc/ssh/sshd_config`.

<details><summary>Answer</summary>

`grep -Ev '^\s*(#|$)' /etc/ssh/sshd_config`

</details>

**Q10.** Which grep option prints only the matched part of a line, and which matches whole words only?

<details><summary>Answer</summary>

`-o` prints only the match. `-w` matches whole words.

</details>

**Q11.** Replace every `http://` with `https://` in `site.conf` in place, keeping a `.bak` backup.

<details><summary>Answer</summary>

`sed -i.bak 's|http://|https://|g' site.conf`

</details>

**Q12.** Print the 1st and 7th fields of `/etc/passwd`, separated by a space.

<details><summary>Answer</summary>

`cut -d: -f1,7 /etc/passwd | tr ':' ' '` or `awk -F: '{print $1, $7}' /etc/passwd`

</details>

**Q13.** Create a gzip-compressed tar of `/etc` named `/root/etc.tar.gz`, then list its contents without extracting.

<details><summary>Answer</summary>

`tar -czf /root/etc.tar.gz /etc` then `tar -tzf /root/etc.tar.gz`. Use `-j` for bzip2 and `-J` for xz.

</details>

**Q14.** Extract only `etc/hosts` from that archive into `/tmp/restore`.

<details><summary>Answer</summary>

`tar -xzf /root/etc.tar.gz -C /tmp/restore etc/hosts`

</details>

**Q15.** Send stdout and stderr of `cmd` to `out.log`, appending.

<details><summary>Answer</summary>

`cmd >> out.log 2>&1` or `cmd &>> out.log`.

</details>

**Q16.** Send only errors of `find / -name x` to `/dev/null` and save the results to `found.txt`.

<details><summary>Answer</summary>

`find / -name x 2>/dev/null > found.txt`

</details>

**Q17.** What does `tee -a` do in `cmd | sudo tee -a /etc/file`, and why not use `sudo cmd >> /etc/file`?

<details><summary>Answer</summary>

`tee -a` appends its stdin to the file and also prints it. With `sudo cmd >> file`, the redirection is done by your own unprivileged shell, so it fails with permission denied.

</details>

**Q18.** `df` shows `/` at 100 % but `du` finds far less. What is the likely cause and how do you confirm it?

<details><summary>Answer</summary>

A deleted file is still held open by a process. Confirm with `sudo lsof +L1`. Free the space by restarting that process or truncating `/proc/<pid>/fd/<n>`.

</details>

**Q19.** Writes fail with "No space left on device" but `df -h` shows free space. What do you check next?

<details><summary>Answer</summary>

Inode usage with `df -i`. Many tiny files can use up all inodes.

</details>

**Q20.** Which command shows the 10 largest directories directly under `/var`, staying on one filesystem?

<details><summary>Answer</summary>

`sudo du -xh --max-depth=1 /var | sort -h | tail`

</details>

**Q21.** Shrink the systemd journal to 100 MB.

<details><summary>Answer</summary>

`sudo journalctl --vacuum-size=100M`

</details>

**Q22.** You edited `/etc/systemd/system/app.service`. What must you run before restarting it?

<details><summary>Answer</summary>

`sudo systemctl daemon-reload`

</details>

**Q23.** Name four common reasons a custom service fails to start.

<details><summary>Answer</summary>

Any four of: `ExecStart` is not an absolute path; the script is not executable or has no shebang; the `User=` account doesn't exist; the port is already in use; the unit is masked; `daemon-reload` was forgotten; the config file has an error (check `journalctl -u`).

</details>

**Q24.** How do you change one setting of the packaged `nginx.service` without editing the vendor file?

<details><summary>Answer</summary>

Run `sudo systemctl edit nginx`. It creates a drop-in at `/etc/systemd/system/nginx.service.d/override.conf`. Check the result with `systemctl cat nginx`.

</details>

**Q25.** Limit `app.service` to 256 MB of RAM and half a CPU, persistently.

<details><summary>Answer</summary>

`sudo systemctl set-property app.service MemoryMax=256M CPUQuota=50%`

</details>

**Q26.** How do you see the open-file limit of a running process with PID 1234?

<details><summary>Answer</summary>

`cat /proc/1234/limits` and look at the `Max open files` row.

</details>

**Q27.** Do limits in `/etc/security/limits.conf` apply to systemd services?

<details><summary>Answer</summary>

No. They apply to PAM login sessions. Services use `LimitNOFILE=`, `LimitNPROC=` and similar settings in the unit.

</details>

**Q28.** What does the `wa` column in `vmstat` show, and what does a high value suggest?

<details><summary>Answer</summary>

The percentage of CPU time spent waiting for I/O. A high value points to a disk bottleneck. Check it with `iostat -x` and `pidstat -d`.

</details>

**Q29.** Create a self-signed certificate and key valid for 365 days with no passphrase, CN `web.lab`.

<details><summary>Answer</summary>

`openssl req -x509 -newkey rsa:2048 -noenc -days 365 -keyout web.key -out web.crt -subj "/CN=web.lab"`

</details>

**Q30.** Show only the subject and expiry dates of `web.crt`.

<details><summary>Answer</summary>

`openssl x509 -in web.crt -noout -subject -dates`

</details>

**Q31.** How do you prove `web.key` belongs to `web.crt`?

<details><summary>Answer</summary>

Compare the public-key digests: `openssl x509 -in web.crt -noout -pubkey | openssl sha256` and `openssl pkey -in web.key -pubout | openssl sha256`. They must match.

</details>

**Q32.** Create a CSR non-interactively from an existing key `app.key`.

<details><summary>Answer</summary>

`openssl req -new -key app.key -out app.csr -subj "/CN=app.lab"`

</details>

**Q33.** Create a branch `fix`, switch to it, commit `a.txt`, then merge it into `main`.

<details><summary>Answer</summary>

`git switch -c fix` (or `git checkout -b fix`), `git add a.txt`, `git commit -m "msg"`, `git switch main`, `git merge fix`.

</details>

**Q34.** Clone `/srv/git/app.git`, add a file, and push it back.

<details><summary>Answer</summary>

`git clone /srv/git/app.git && cd app && echo hi > f && git add f && git commit -m add && git push`

</details>

**Q35.** Which command shows the last 3 commits as one line each, with a branch graph?

<details><summary>Answer</summary>

`git log --oneline --graph -3` (add `--all` to show every branch).

</details>
