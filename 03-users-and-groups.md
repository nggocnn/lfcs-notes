# Users and Groups

This section covers account lifecycle management, passwords and expiration, group membership, skeleton files, per-user environment setup, resource limits, sudo policy, root account access, LDAP client accounts, and ACLs.

## 1. Creating and deleting local users

Each person should have a separate account. Linux stores account metadata in `/etc/passwd`.

`adduser` is the friendliest tool for interactive account creation on Debian/Ubuntu.

Example:

```bash
$ sudo adduser john
Adding user `john' ...
Adding new group `john' (1001) ...
Creating home directory `/home/john' ...
Copying files from `/etc/skel' ...
New password:
Retype new password:
```

What happens automatically:

- a user account is created
- a matching primary group is created
- a home directory is created
- files from `/etc/skel` are copied in
- a default shell such as `/bin/bash` is set

Delete user only:

```bash
$ sudo deluser john
Removing user `john' ...
Done.
```

Delete user and home:

```bash
$ sudo deluser --remove-home john
Looking for files to backup/remove ...
Removing files ...
Done.
```

## 2. Setting passwords and inspecting account data

Set or change a password:

```bash
$ sudo passwd john
New password:
Retype new password:
passwd: password updated successfully
```

Inspect account records:

```bash
$ grep '^john:' /etc/passwd
john:x:1001:1001::/home/john:/bin/bash
```

Check identity and numeric IDs:

```bash
$ id john
uid=1001(john) gid=1001(john) groups=1001(john)

$ whoami
alice
```

## 3. Creating system accounts

System accounts are meant for services and daemons, not interactive humans.

Example:

```bash
$ sudo adduser --system --no-create-home sysacc
Adding system user `sysacc' ...
```

These accounts usually:

- have UID below regular-user ranges
- do not need a home directory
- often use non-interactive shells

## 4. Modifying users with usermod

`usermod` can change home directory, username, shell, lock the account, and set expiration.

Change home and move data:

```bash
$ sudo usermod -d /home/otherdirectory/ -m john
```

Rename a user:

```bash
$ sudo usermod -l jane john
```

Change login shell:

```bash
$ sudo usermod -s /bin/zsh jane
```

Lock and unlock:

```bash
$ sudo usermod -L jane
$ sudo usermod -U jane
```

Locking disables password logins but is different from deleting the account.

## 5. Account expiration and password aging

There are two distinct expiration concepts:

- account expiration: account becomes unusable
- password expiration: user must change password

Set account expiration:

```bash
$ sudo usermod -e 2030-03-01 jane
```

Remove account expiration:

```bash
$ sudo usermod -e "" jane
```

Force password change on next login:

```bash
$ sudo chage -d 0 jane
```

Set max password age:

```bash
$ sudo chage -M 30 jane
```

Inspect password aging:

```bash
$ sudo chage -l jane
Last password change                                    : Jun 22, 2026
Password expires                                        : Jul 22, 2026
```

## 6. Groups and group membership

Groups are the clean way to assign shared access and roles.

Common actions:

- create group
- rename group
- delete group
- add users to supplementary groups
- change primary group

Examples:

```bash
$ sudo groupadd -g 9875 cricket
$ sudo groupmod -n soccer cricket
```

```bash
$ sudo usermod -a -G developers jane
$ id jane
uid=1002(jane) gid=1002(jane) groups=1002(jane),1005(developers)
```

Change primary group:

```bash
$ sudo usermod -g rugby sam
```

Delete group:

```bash
$ sudo groupdel appdevs
```

## 7. Skeleton files and per-user environment

`/etc/skel` is the template copied into new home directories.

This is useful for:

- default shell config
- welcome files
- standard aliases or environment setup

Example:

```bash
$ ls -a /etc/skel
.  ..  .bash_logout  .bashrc  .profile  README
```

Per-user shell customization:

```bash
$ sudo vim /home/trinity/.bashrc
PATH="$HOME/.local/bin:$HOME/bin:/opt/bin:$PATH"
```

Reload current shell config:

```bash
$ source ~/.bashrc
$ echo $PATH
/home/trinity/.local/bin:/home/trinity/bin:/opt/bin:/usr/local/bin:/usr/bin
```

## 8. Environment variables

The lecture uses environment variables to explain shell startup behavior and user customization.

Useful commands:

- `env` show environment
- `echo $VAR` print one variable
- `source ~/.bashrc` reload shell configuration

Examples:

```bash
$ echo $HOME
/home/alice

$ env | head -n 3
SHELL=/bin/bash
PWD=/home/alice
HOME=/home/alice
```

## 9. Resource limits with limits.conf and ulimit

User limits help prevent one user from exhausting system resources.

The key syntax in `/etc/security/limits.conf` is:

```text
domain type item value
```

Fields:

- `domain`: username, `@group`, or `*`
- `type`: `soft`, `hard`, or `-`
- `item`: such as `nproc`, `fsize`, `cpu`
- `value`: limit amount

Example entry:

```text
trinity - nproc 3
```

This means Trinity can run at most 3 processes in the session.

Session check:

```bash
$ ulimit -a
max user processes              (-u) 3
```

## 10. Sudo privileges

The simplest model is group-based privilege:

- Ubuntu commonly uses the `sudo` group
- Red Hat commonly uses `wheel`

Add a user to admin group:

```bash
$ sudo gpasswd -a trinity sudo
Adding user trinity to group sudo
```

Remove from group:

```bash
$ sudo gpasswd -d trinity sudo
Removing user trinity from group sudo
```

## 11. Fine-grained sudo policy with sudoers

The lecture recommends editing with `visudo`, not editing `/etc/sudoers` directly.

General syntax:

```text
user/group host=(run_as_user:run_as_group) command_list
```

Examples:

Allow everything:

```text
trinity ALL=(ALL) ALL
```

Allow only selected commands:

```text
trinity ALL=(ALL) /bin/ls, /bin/stat
```

Allow passwordless sudo:

```text
trinity ALL=(ALL) NOPASSWD: ALL
```

Running as another user:

```bash
$ sudo -u trinity ls /home/trinity/
README
```

## 12. Access to the root account

There are two main paths to root access:

- `sudo -i` or `sudo --login` if your user already has sudo
- `su -` if you know the root password

Examples:

```bash
$ sudo -i
root@server:~#
```

```bash
$ su -
Password:
root@server:~#
```

Important distinction:

- a locked root account may still allow `sudo -i`
- a locked root account blocks password-based `su -`

## 13. Specifying UID and shell at account creation

`adduser` automatically assigns the next available UID starting from 1000, but you can override that:

```bash
$ sudo adduser --uid 1100 smith
Adding user `smith' ...
```

You can also set a non-default shell or home directory at creation time rather than changing them later with `usermod`:

```bash
$ sudo adduser --shell /bin/othershell --home /home/otherdirectory/ john
$ sudo adduser --shell /bin/othershell john
```

To see numeric UIDs and GIDs rather than resolved names use `ls -ln`:

```bash
$ ls -l /home/
drwx------. 3 john  john  78 Oct 19 19:39 john
drwx------. 3 smith smith 78 Oct 19 19:39 smith

$ ls -ln /home/
drwx------. 3 1001 1001 78 Oct 19 19:39 john
drwx------. 3 1100 1100 78 Oct 19 19:39 smith
```

The `-n` flag is particularly useful when a UID has no corresponding name entry, for example after migrating data from another system.

## 14. The groups command

`groups` with no argument lists every group the current user belongs to. Pass a username to inspect someone else:

```bash
$ groups
aaron family sudo

$ groups john
john: john developers
```

The first token after the colon is the primary/login group. Everything after it is supplementary groups.

## 15. gpasswd long-form flags and argument order

`gpasswd` accepts both short and long options and the argument order matters: username first, group second.

```bash
$ sudo gpasswd --add john developers    # long form
$ sudo gpasswd -a john developers       # short form

$ sudo gpasswd --delete john developers
$ sudo gpasswd -d john developers
```

This is the reverse of `usermod`, which expects the group before the username. The help output reminds you of the order:

```bash
$ gpasswd --help
  -a, --add USER      add USER to GROUP
```

## 16. Changing a user's primary group with usermod --gid

`usermod -G` (uppercase) changes supplementary groups. To change the primary/login group use lowercase `-g` or the long form `--gid`:

```bash
$ sudo usermod -g developers john
$ sudo usermod --gid developers john

$ groups john
john: developers
```

Do not confuse `-g` with `-G`. After the change, `groups` shows only `developers` as the primary because the old `john` group is no longer the login group.

## 17. Renaming groups and the primary-group deletion trap

Rename with `groupmod --new-name` or its short alias `-n`:

```bash
$ sudo groupmod --new-name programmers developers
$ sudo groupmod -n programmers developers
```

Deleting a group that is still someone's primary group fails:

```bash
$ sudo groupdel programmers
groupdel: cannot remove the primary group of user 'john'
```

Fix this by moving the user back to their personal group first, then delete:

```bash
$ sudo usermod --gid john john
$ sudo groupdel programmers
```

Deleting a supplementary group works without any preparation; members simply lose that group from their list.

## 18. printenv and HISTSIZE

`printenv` is an alternative to `env` that prints the current environment:

```bash
$ printenv
PATH=/home/aaron/.local/bin:/home/aaron/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin
HISTSIZE=1000
HOME=/home/aaron
```

`HISTSIZE` controls how many commands Bash saves in its history file. You can raise it for the current session:

```bash
$ HISTSIZE=2000
$ history | wc -l
2000
```

## 19. System-wide environment variables with /etc/environment

Variables set in `~/.bashrc` only affect one user. To make a variable available to every user on the system, add it to `/etc/environment`. The format is plain `KEY=value` with no `export` keyword:

```bash
$ sudo vim /etc/environment
KODEKLOUD=https://kodekloud.com/
```

The file is read at login time. After editing, log out and back in, then verify:

```bash
$ logout
$ echo $KODEKLOUD
https://kodekloud.com/
```

## 20. System-wide login scripts with /etc/profile.d/

`/etc/environment` only supports static variable assignments. For anything more dynamic - running a command, doing conditional logic - create a `.sh` file inside `/etc/profile.d/`. The system runs every file there automatically when a user logs in. No shebang line is needed because the system passes these files to the current shell directly.

Example that records the login timestamp in each user's home directory:

```bash
$ sudo vim /etc/profile.d/lastlogin.sh
```

Contents:

```bash
echo "Your last login was at: " > $HOME/lastlogin
date >> $HOME/lastlogin
```

After logging out and back in:

```bash
$ cat lastlogin
Your last login was at:
Thursday DEC 16 11:19:27 CDT 2021
```

## 21. Modifying /etc/skel/.bashrc to pre-configure PATH for new users

Editing a specific user's `~/.bashrc` only affects that one account. To ensure every future user gets a customised `PATH`, modify the template in `/etc/skel/`:

```bash
$ sudo vim /etc/skel/.bashrc
```

Change the PATH line, for example adding `/opt/bin`:

```text
PATH="$HOME/.local/bin:$HOME/bin:/opt/bin:$PATH"
```

Every user created after this edit receives the updated `.bashrc` in their home directory. Existing users are not affected because the skeleton is only copied at account creation time.

## 22. Hard vs soft limits and the ulimit -u flag

`limits.conf` supports three limit types with distinct semantics:

- `hard`: absolute ceiling; the user can never exceed it
- `soft`: startup value; the user can raise it up to the hard limit, but only once per session
- `-`: sets both hard and soft to the same value simultaneously

```text
trinity  hard  nproc  20
trinity  soft  nproc  10
trinity  -     nproc  20
```

With the hard/soft pair above, trinity logs in with 10 processes allowed and can voluntarily raise it to 20 if she needs it temporarily.

Additional `item` values beyond `nproc`:

- `fsize`: maximum file size a process may create, in kilobytes (`1024` = 1 MB)
- `cpu`: maximum CPU time in minutes a process may consume

```text
trinity  hard  fsize  1024
trinity  hard  cpu    1
```

To test limits by logging in as another user from your admin session:

```bash
$ sudo -iu trinity
```

`-i` performs a full login (reads profile files and applies limits); `-u` specifies the target user. Inside that session:

```bash
$ ulimit -a
max user processes    (-u) 3

$ ps | less
  PID TTY     TIME CMD
 6314 pts/0  00:00:00 bash
 6348 pts/0  00:00:00 ps
 6349 pts/0  00:00:00 less
```

Users can view and lower their own limits with `ulimit`. They can only raise a soft limit up to the hard ceiling, and only once:

```bash
$ ulimit -u 5000
```

## 23. Sudoers group policy and running as a specific user

The `/etc/sudoers` line that explains why the `sudo` group has full access is:

```text
%sudo   ALL=(ALL:ALL)   ALL
```

The five components are:

1. `%sudo` - the group (prefix `%`) or username this rule applies to
2. `ALL` - hostname: ALL means any machine
3. `(ALL` - run_as_user: the identities this user may impersonate
4. `ALL)` - run_as_group: the groups they may impersonate
5. `ALL` - command list

To grant a policy to all members of a group, prefix the name with `%`:

```text
%developers ALL=(ALL) ALL
```

To restrict trinity to running sudo commands only as the users `aaron` or `john`:

```text
trinity ALL=(aaron,john) ALL
```

The `run_as_user` field is optional (the parentheses block may be omitted entirely):

```text
trinity ALL= ALL
```

`sudo -u` lets you impersonate a specific non-root user without editing sudoers:

```bash
$ sudo -u trinity ls /home/trinity/
Desktop  Documents  Downloads  Music  Pictures
```

## 24. Locking and unlocking the root password

On many Ubuntu systems the root account ships with no usable password. `su -` is blocked because there is nothing to authenticate against, but `sudo --login` still works because it uses your own password.

To enable password-based `su -` access to root:

```bash
# If root never had a password:
$ sudo passwd root

# If root's password was locked:
$ sudo passwd --unlock root
$ sudo passwd -u root
```

To re-disable direct root password logins (recommended on servers):

```bash
$ sudo passwd --lock root
$ sudo passwd -l root
```

After locking, `sudo --login` still works for users with sudo privileges. Locking root only blocks the password path, not SSH-key-based logins. Always keep at least one account with sudo access before locking root to avoid being locked out entirely.

## 25. Using LDAP user and group accounts

The competency is "configure the system to use LDAP user and group accounts". The machine stays a client: it looks up users and groups on a directory server and authenticates against it. Local tools then see LDAP users like local ones. `getent passwd alice`, `id alice` and `su - alice` all work, even though alice is not in `/etc/passwd`.

The lookup chain works like this:

- NSS (`/etc/nsswitch.conf`) decides where `passwd`, `group` and `shadow` lookups go
- PAM decides how logins authenticate
- a client daemon talks to the LDAP server: SSSD (most common) or `nslcd`

### Test the directory first

```bash
$ sudo apt install ldap-utils
$ ldapsearch -x -H ldap://ldap.example.com -b "dc=example,dc=com" "(uid=alice)"
```

If this fails, nothing else will work. Check the URI, the base DN, the firewall (389/tcp, 636/tcp for LDAPS) and DNS.

### Option A: SSSD

```bash
$ sudo apt install sssd-ldap ldap-utils     # RHEL: dnf install sssd sssd-ldap openldap-clients
```

`/etc/sssd/sssd.conf` must be owned by root with mode 600, or SSSD refuses to start:

```ini
[sssd]
services = nss, pam
domains = example.com

[domain/example.com]
id_provider = ldap
auth_provider = ldap
ldap_uri = ldap://ldap.example.com
ldap_search_base = dc=example,dc=com
cache_credentials = true
# lab only: allow password auth over plain LDAP (SSSD refuses it by default)
ldap_auth_disable_tls_never_use_in_production = true
```

```bash
$ sudo chmod 600 /etc/sssd/sssd.conf
$ sudo systemctl enable --now sssd
$ sudo systemctl restart sssd                # after every config change
$ sudo sss_cache -E                          # flush cached lookups
```

Make sure `/etc/nsswitch.conf` contains `sss`. Ubuntu adds it when you install `sssd`:

```
passwd:   files systemd sss
group:    files systemd sss
shadow:   files sss
```

Create home directories at first login:

```bash
$ sudo pam-auth-update --enable mkhomedir            # Ubuntu
$ sudo authselect select sssd with-mkhomedir --force # RHEL/Rocky
$ sudo systemctl enable --now oddjobd                # RHEL/Rocky
```

### Option B: nslcd (libnss-ldapd)

```bash
$ sudo apt install libnss-ldapd libpam-ldapd   # the installer asks for URI, base DN and which maps to enable
```

Settings live in `/etc/nslcd.conf` (`uri ldap://ldap.example.com/`, `base dc=example,dc=com`). In `/etc/nsswitch.conf`, add `ldap` to the lines: `passwd: files systemd ldap`. Restart with `sudo systemctl restart nslcd`.

### Verify

```bash
$ getent passwd alice
alice:*:10001:10001:Alice:/home/alice:/bin/bash
$ getent group developers
$ id alice
$ su - alice
```

`getent passwd` with no arguments may not list LDAP users. SSSD disables enumeration by default, so always query a specific name.

## 26. ACLs for users and groups

ACLs are listed under Users and Groups in the curriculum. The commands are in [Storage section 10](./05-storage.md#10-access-control-lists-acls). In short:

```bash
$ setfacl -m u:alice:rw report.txt       # grant one user
$ setfacl -m g:devs:rx /srv/app          # grant one group
$ setfacl -R -m d:g:devs:rwx /srv/app    # default ACL, inherited by new files
$ setfacl -x u:alice report.txt          # remove one entry
$ setfacl -b report.txt                  # remove all ACLs
$ getfacl report.txt
```

A `+` at the end of the mode in `ls -l` (`-rw-rw-r--+`) shows that a file has an ACL. The `mask` entry caps the effective rights of named users and groups. If a user still can't write, check `getfacl` for `#effective:`.

## 27. What to practice for LFCS

You should be able to do these quickly:

- create, modify, lock, unlock, and delete users
- manage primary and supplementary groups
- force password resets and set expiration dates
- inspect `/etc/passwd` and `id` output
- edit shell startup files and environment variables
- set process/resource limits
- grant and restrict sudo access safely with `visudo`
- switch to root correctly with `sudo` or `su`
- point a client at LDAP with SSSD and verify with `getent passwd <user>`
- grant and remove per-user and per-group ACLs
