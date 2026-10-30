# Quiz: Users and Groups (10%)

Answer from memory first, then open the answer. Mark each miss in the "Misses" list in [PLAN.md](../PLAN.md) and redo it two days later. Notes: [03-users-and-groups.md](../03-users-and-groups.md).

**Q1.** Create user `bob` with a home directory, Bash shell, UID 1600 and supplementary group `devs`.

<details><summary>Answer</summary>

`sudo useradd -m -s /bin/bash -u 1600 -G devs bob`. On Ubuntu, `adduser` is the interactive alternative.

</details>

**Q2.** Delete user `bob` together with his home directory and mail spool.

<details><summary>Answer</summary>

`sudo userdel -r bob`

</details>

**Q3.** Create a system account `appsvc` with no home directory and no login shell.

<details><summary>Answer</summary>

`sudo useradd -r -M -s /usr/sbin/nologin appsvc`

</details>

**Q4.** Add `alice` to group `docker` without removing her from her other groups. What goes wrong without `-a`?

<details><summary>Answer</summary>

`sudo usermod -aG docker alice`. Without `-a`, `-G` replaces all of her supplementary groups.

</details>

**Q5.** Change `alice`'s primary group to `staff`.

<details><summary>Answer</summary>

`sudo usermod -g staff alice`

</details>

**Q6.** Rename user `jdoe` to `john` and move his home to `/home/john`.

<details><summary>Answer</summary>

`sudo usermod -l john -d /home/john -m jdoe`. Rename his group too with `groupmod -n john jdoe` if needed.

</details>

**Q7.** Lock and unlock `alice`'s password. Does a lock stop SSH key logins?

<details><summary>Answer</summary>

`sudo usermod -L alice` / `sudo passwd -l alice`, and `-U` / `-u` to unlock. No: key logins still work. To block every login, set an expiry (`usermod -e 1 alice` or `chage -E 0`) or the shell `nologin`.

</details>

**Q8.** Make `alice`'s account expire on 2026-12-31.

<details><summary>Answer</summary>

`sudo chage -E 2026-12-31 alice` or `sudo usermod -e 2026-12-31 alice`. Check with `chage -l alice`.

</details>

**Q9.** Force `bob` to change his password at the next login.

<details><summary>Answer</summary>

`sudo chage -d 0 bob` or `sudo passwd -e bob`.

</details>

**Q10.** Password max age 90 days, min 7, warn 14, for `bob`.

<details><summary>Answer</summary>

`sudo chage -M 90 -m 7 -W 14 bob`

</details>

**Q11.** Where are the defaults for new accounts (UID range, password aging) defined?

<details><summary>Answer</summary>

In `/etc/login.defs` (`UID_MIN`, `PASS_MAX_DAYS` and so on), plus `/etc/default/useradd` for useradd defaults.

</details>

**Q12.** Create group `ops` with GID 3000, rename it to `sre`, then delete it.

<details><summary>Answer</summary>

`sudo groupadd -g 3000 ops`, `sudo groupmod -n sre ops`, `sudo groupdel sre`.

</details>

**Q13.** Why can't you delete a group with `groupdel`, and how do you fix it?

<details><summary>Answer</summary>

It is still the primary group of a user. Change that user's primary group first with `usermod -g`.

</details>

**Q14.** Add and remove `alice` from group `devs` with gpasswd.

<details><summary>Answer</summary>

`sudo gpasswd -a alice devs` and `sudo gpasswd -d alice devs`

</details>

**Q15.** Every new user must get a file `~/README` automatically. How?

<details><summary>Answer</summary>

Put the file in `/etc/skel/`. Its contents are copied into the home of each new user created with `-m`.

</details>

**Q16.** Set an environment variable `APP_ENV=prod` for all users at login. Name two ways.

<details><summary>Answer</summary>

Add `APP_ENV=prod` to `/etc/environment` (no `export`, pam_env syntax), or add `export APP_ENV=prod` to a script in `/etc/profile.d/app.sh`.

</details>

**Q17.** Which files does a Bash login shell read, and which does an interactive non-login shell read?

<details><summary>Answer</summary>

A login shell reads `/etc/profile` (which sources `/etc/profile.d/*.sh`), then the first of `~/.bash_profile`, `~/.bash_login` or `~/.profile`. A non-login interactive shell reads `/etc/bash.bashrc` (Ubuntu) and `~/.bashrc`.

</details>

**Q18.** Set `HISTSIZE=5000` for `alice` only.

<details><summary>Answer</summary>

Add `HISTSIZE=5000` (or `export HISTSIZE=5000`) to `/home/alice/.bashrc`.

</details>

**Q19.** Limit `bob` to 20 processes (hard) and members of `devs` to 4096 open files (soft).

<details><summary>Answer</summary>

Add these lines to `/etc/security/limits.conf` (or a file in `/etc/security/limits.d/`): `bob hard nproc 20` and `@devs soft nofile 4096`. They take effect at the next login.

</details>

**Q20.** What is the difference between soft and hard limits, and which `ulimit` flags show the process limit?

<details><summary>Answer</summary>

A user can raise the soft limit up to the hard limit. Only root can raise the hard limit. `ulimit -u` shows the soft limit, `ulimit -Hu` the hard one, and `ulimit -a` shows all.

</details>

**Q21.** Give `alice` full sudo rights the Ubuntu way, and the Rocky way.

<details><summary>Answer</summary>

Ubuntu: `usermod -aG sudo alice`. Rocky: `usermod -aG wheel alice`.

</details>

**Q22.** Allow group `ops` to run only `systemctl restart nginx` as root without a password. Where and how?

<details><summary>Answer</summary>

Run `sudo visudo -f /etc/sudoers.d/ops` and add `%ops ALL=(root) NOPASSWD: /usr/bin/systemctl restart nginx`. The file should be mode 440.

</details>

**Q23.** Allow `bob` to run any command as user `app`, and show how he uses it.

<details><summary>Answer</summary>

Sudoers line: `bob ALL=(app) ALL`. He runs `sudo -u app <command>`.

</details>

**Q24.** Why always edit sudoers with `visudo`?

<details><summary>Answer</summary>

It locks the file and checks the syntax before saving. A broken sudoers file can lock everyone out of sudo. Check a file with `visudo -c`.

</details>

**Q25.** Get a root shell with your own password, and with root's password.

<details><summary>Answer</summary>

`sudo -i` (or `sudo su -`) uses your password. `su -` uses root's password.

</details>

**Q26.** Disable password login for root but keep sudo working.

<details><summary>Answer</summary>

`sudo passwd -l root`. To block root over SSH, also set `PermitRootLogin no` in sshd.

</details>

**Q27.** After configuring SSSD for LDAP, how do you check that user `jdoe` resolves?

<details><summary>Answer</summary>

`getent passwd jdoe` and `id jdoe`. Don't rely on `getent passwd` with no arguments, because enumeration is off by default.

</details>

**Q28.** SSSD won't start right after you wrote `/etc/sssd/sssd.conf`. What is the most common cause?

<details><summary>Answer</summary>

File permissions. It must be owned by root with mode 600 (`chmod 600 /etc/sssd/sssd.conf`).

</details>

**Q29.** Which file decides that user lookups go to SSSD after local files?

<details><summary>Answer</summary>

`/etc/nsswitch.conf`, with lines such as `passwd: files systemd sss` and `group: files systemd sss`.

</details>

**Q30.** LDAP users can log in but get "no home directory". Fix it on Ubuntu.

<details><summary>Answer</summary>

`sudo pam-auth-update --enable mkhomedir`. On Rocky: `authselect select sssd with-mkhomedir --force` and enable `oddjobd`.

</details>

**Q31.** Test an LDAP directory directly before configuring the client.

<details><summary>Answer</summary>

`ldapsearch -x -H ldap://server -b "dc=example,dc=com" "(uid=jdoe)"` (package `ldap-utils`).

</details>

**Q32.** Give `alice` read and write access to `/srv/report.txt` without changing owner, group or mode.

<details><summary>Answer</summary>

`setfacl -m u:alice:rw /srv/report.txt`. Check with `getfacl`.

</details>

**Q33.** Make every new file in `/srv/shared` readable and writable by group `devs`.

<details><summary>Answer</summary>

Set a default ACL: `setfacl -R -m d:g:devs:rwX /srv/shared` (and `-m g:devs:rwX` for existing files).

</details>

**Q34.** `getfacl` shows `user:alice:rwx #effective:r--`. Why?

<details><summary>Answer</summary>

The ACL `mask` is `r--`, and the mask caps named entries. Raise it with `setfacl -m m::rwx file`.

</details>
