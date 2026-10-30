# Labs: Users and Groups (10%)

Notes: [03-users-and-groups.md](../03-users-and-groups.md).

## Lab 3.1: Accounts and groups

Host: `node02`. Target: 8 min.

1. Create group `devs` with GID 5000 and group `qa`.
2. Create user `dana` with UID 2001, home `/home/dana`, shell `/bin/bash`, primary group `devs` and supplementary group `qa`. Set her password to `Lfcs2026!`.
3. Create the system account `backupsvc` with no home directory and no login shell.
4. Rename group `qa` to `testers`. `dana` must stay a member.
5. Create user `tmpuser`, then delete it together with its home directory.

Verify:

```bash
id dana                # uid=2001(dana) gid=5000(devs) groups=5000(devs),...(testers)
getent passwd backupsvc
ls -d /home/tmpuser    # No such file or directory
```

<details><summary>Solution</summary>

```bash
sudo groupadd -g 5000 devs && sudo groupadd qa
sudo useradd -m -u 2001 -g devs -G qa -s /bin/bash dana
echo 'dana:Lfcs2026!' | sudo chpasswd
sudo useradd -r -M -s /usr/sbin/nologin backupsvc
sudo groupmod -n testers qa
sudo useradd -m tmpuser && sudo userdel -r tmpuser
```

</details>

## Lab 3.2: Password aging and locking

Host: `node02`. Target: 6 min.

1. `dana` must change her password at least every 60 days, can change it at most once a day, gets a 7-day warning, and her account expires on 2027-06-30.
2. `dana` must choose a new password at her next login.
3. Create user `intern` and lock the account so that it can't log in at all, not even with an SSH key.

Verify: `sudo chage -l dana`, and `sudo chage -l intern` or `getent shadow intern`.

<details><summary>Solution</summary>

```bash
sudo chage -M 60 -m 1 -W 7 -E 2027-06-30 dana
sudo chage -d 0 dana
sudo useradd -m intern
sudo usermod -L -e 1 intern     # lock the password and expire the account (blocks key logins too)
```

</details>

## Lab 3.3: sudo policy

Host: `node02`. Target: 8 min.

1. Members of `devs` can run `systemctl restart nginx` and `systemctl status nginx` as root without a password, and nothing else.
2. User `dana` can run any command as user `backupsvc`, with her own password.
3. The rules live in `/etc/sudoers.d/lab` with correct permissions and valid syntax.

Verify:

```bash
sudo visudo -cf /etc/sudoers.d/lab
sudo -l -U dana
```

<details><summary>Solution</summary>

```bash
sudo visudo -f /etc/sudoers.d/lab
# contents:
%devs ALL=(root) NOPASSWD: /usr/bin/systemctl restart nginx, /usr/bin/systemctl status nginx
dana  ALL=(backupsvc) ALL
# then
sudo chmod 440 /etc/sudoers.d/lab
```

</details>

## Lab 3.4: Environment profiles

Host: `node02`. Target: 8 min.

1. Every user, now and in future, must get `COMPANY=lfcslab` in their login environment. Use `/etc/profile.d/`.
2. Every new user must get a `~/bin` directory and have it in their `PATH`. Existing users stay as they are.
3. Only for `dana`: `HISTSIZE=10000` and an alias `ll='ls -alF'`.

Verify:

```bash
sudo useradd -m -s /bin/bash newbie && sudo -iu newbie bash -lic 'echo $COMPANY; ls -d ~/bin; echo $PATH'
sudo -iu dana bash -ic 'echo $HISTSIZE; alias ll'
```

<details><summary>Solution</summary>

```bash
echo 'export COMPANY=lfcslab' | sudo tee /etc/profile.d/company.sh
sudo mkdir /etc/skel/bin
echo 'export PATH="$HOME/bin:$PATH"' | sudo tee -a /etc/skel/.bashrc
printf 'HISTSIZE=10000\nalias ll="ls -alF"\n' | sudo tee -a /home/dana/.bashrc
```

Ubuntu's default `~/.profile` already adds `~/bin` when it exists, so the `.bashrc` line is an explicit second guarantee.

</details>

## Lab 3.5: Resource limits

Host: `node02`. Target: 6 min.

1. `dana` may have at most 30 processes (hard) and 25 (soft).
2. Members of `devs` get a soft open-files limit of 2048 and a hard limit of 8192.

Verify: `sudo -iu dana bash -c 'ulimit -Su; ulimit -Hu; ulimit -Sn; ulimit -Hn'` prints 25, 30, 2048 and 8192.

<details><summary>Solution</summary>

```bash
sudo tee /etc/security/limits.d/lab.conf <<'X'
dana   soft nproc  25
dana   hard nproc  30
@devs  soft nofile 2048
@devs  hard nofile 8192
X
```

</details>

## Lab 3.6: ACLs

Host: `node02`. Target: 8 min.

1. Create `/srv/reports`, owned by `root:root`, mode 750.
2. Without changing owner, group or mode, give `dana` read and write access to everything in it, and give group `testers` read-only access.
3. Files created there in future must get the same ACLs.
4. Remove all ACLs from `/srv/reports/public.txt` only.

Verify:

```bash
sudo touch /srv/reports/new.txt /srv/reports/public.txt
getfacl /srv/reports/new.txt          # user:dana:rw-  group:testers:r--
sudo -u dana touch /srv/reports/dana.txt && echo ok
```

<details><summary>Solution</summary>

```bash
sudo mkdir /srv/reports && sudo chmod 750 /srv/reports
sudo setfacl -R -m u:dana:rwX,g:testers:rX /srv/reports
sudo setfacl -R -m d:u:dana:rwX,d:g:testers:rX /srv/reports
sudo touch /srv/reports/public.txt && sudo setfacl -b /srv/reports/public.txt
```

</details>

## Lab 3.7: LDAP accounts

Hosts: `node01` (server), `node02` (client). Target: 15 min.

Setup on node01: `sudo bash /lfcs/labs/setup-ldap-server.sh`. It creates base `dc=lab,dc=local` with the users `jdoe` and `asmith` (passwords `jdoe123` and `asmith123`) and the group `developers`.

Task on node02:

1. Configure node02 to resolve users and groups from `ldap://node01` with base `dc=lab,dc=local`, using SSSD.
2. LDAP users get their home directory created at first login.
3. `jdoe` can log in with `su - jdoe`.

Verify:

```bash
getent passwd jdoe          # jdoe:*:10001:10000:jdoe:/home/jdoe:/bin/bash
getent group developers
su - jdoe -c 'pwd; id'      # password jdoe123
```

<details><summary>Solution</summary>

```bash
sudo apt install -y sssd-ldap ldap-utils
ldapsearch -x -H ldap://node01 -b dc=lab,dc=local '(uid=jdoe)'     # sanity check
sudo tee /etc/sssd/sssd.conf <<'X'
[sssd]
services = nss, pam
domains = lab.local

[domain/lab.local]
id_provider = ldap
auth_provider = ldap
ldap_uri = ldap://node01
ldap_search_base = dc=lab,dc=local
cache_credentials = true
ldap_auth_disable_tls_never_use_in_production = true
X
sudo chmod 600 /etc/sssd/sssd.conf
sudo systemctl enable --now sssd && sudo systemctl restart sssd
grep -E '^(passwd|group)' /etc/nsswitch.conf   # must contain sss
sudo pam-auth-update --enable mkhomedir
```

</details>
