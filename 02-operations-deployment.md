# Operations Deployment

This section covers boot and shutdown procedures, scripting, service management, logs, scheduled tasks, package management, process/resource monitoring, kernel runtime parameters, and SELinux basics.

## 1. Safe boot, reboot, and shutdown

`systemctl` handles immediate power actions; `shutdown` handles scheduled ones.

Examples:

```bash
$ sudo systemctl reboot
Connection to server closed by remote host.
```

```bash
$ sudo systemctl poweroff
Broadcast message from root@server:
The system is going down for power-off NOW!
```

Scheduled shutdown/reboot:

```bash
$ sudo shutdown +15
Shutdown scheduled for Mon 2026-06-22 02:15:00 UTC, use 'shutdown -c' to cancel.

$ sudo shutdown -r 02:00 'Scheduled restart to upgrade kernel'
Shutdown scheduled for Mon 2026-06-22 02:00:00 UTC, use 'shutdown -c' to cancel.
```

Force options exist, but the lecture treats them as last-resort actions.

## 2. Bootloader and boot targets

Operations deployment includes knowing where boot behavior comes from.

- GRUB controls bootloader behavior
- `grub-install /dev/vda` installs GRUB
- `systemctl get-default` shows the default target
- targets replace old runlevels in `systemd`

Example:

```bash
$ systemctl get-default
multi-user.target
```

## 3. Shell scripting for automation

Simple Bash scripts can automate repetitive maintenance tasks.

Key points:

- first line should be a shebang
- commands in scripts work like commands typed interactively
- comments start with `#`
- script must be executable

Basic script:

```bash
#!/bin/bash

# Log execution time
date >> /tmp/script.log
cat /proc/version >> /tmp/script.log
```

Execution:

```bash
$ chmod +x script.sh
$ ./script.sh
$ cat /tmp/script.log
Mon Jun 22 10:30:01 UTC 2026
Linux version 6.8.0-60-generic ...
```

Conditional logic from the lecture:

```bash
#!/bin/bash

if test -f /tmp/archive.tar.gz; then
    mv /tmp/archive.tar.gz /tmp/archive.tar.gz.OLD
    tar acf /tmp/archive.tar.gz /etc/apt/
else
    tar acf /tmp/archive.tar.gz /etc/apt/
fi
```

This pattern matters because exam tasks often ask for safe, repeatable automation.

## 4. Managing services and startup with systemd

This is a major LFCS topic.

Core commands:

- `systemctl status`
- `systemctl start`
- `systemctl stop`
- `systemctl restart`
- `systemctl reload`
- `systemctl enable`
- `systemctl disable`
- `systemctl mask`
- `systemctl unmask`

Examples:

```bash
$ systemctl status ssh.service
● ssh.service - OpenBSD Secure Shell server
   Loaded: loaded (/usr/lib/systemd/system/ssh.service; enabled)
   Active: active (running)
```

```bash
$ sudo systemctl enable --now ssh.service
Created symlink /etc/systemd/system/multi-user.target.wants/ssh.service → /usr/lib/systemd/system/ssh.service.
```

Masking prevents the service from being started at all:

```bash
$ sudo systemctl mask atd.service
Created symlink /etc/systemd/system/atd.service → /dev/null
```

Useful inspection commands:

```bash
$ systemctl cat ssh.service
$ systemctl list-units --type service --all
$ systemctl daemon-reload
```

## 5. Logs: files and journal

The lecture covers two logging paths:

- classic log files under `/var/log`
- the systemd journal inspected with `journalctl`

Examples:

```bash
$ ls /var/log
alternatives.log
auth.log
kern.log
syslog
```

```bash
$ sudo journalctl -u ssh.service
Jun 22 10:40:14 server sshd[1023]: Server listening on 0.0.0.0 port 22.
Jun 22 10:41:02 server sshd[1155]: Accepted password for alice from 192.168.0.10
```

High-value journal filters:

```bash
$ sudo journalctl -f
$ sudo journalctl -p err
$ sudo journalctl -S 02:00 -U 03:00
$ sudo journalctl -b 0
$ sudo journalctl -b -1
```

## 6. Scheduling jobs: cron, anacron, and at

Each tool serves a different scheduling need:

- `cron`: repeated tasks at exact times
- `anacron`: repeated tasks that should still run if the machine was off
- `at`: one-time scheduled tasks

User crontab example:

```bash
$ crontab -e
```

Entry:

```bash
0 2 * * * /usr/bin/touch /tmp/nightly-run
```

Verification:

```bash
$ crontab -l
0 2 * * * /usr/bin/touch /tmp/nightly-run
```

Anacron example:

```bash
$ sudo vim /etc/anacrontab
3 10 test_job /usr/bin/touch /root/anacron_created_this

$ anacron -T
anacron: /etc/anacrontab: Syntax OK
```

`at` examples:

```bash
$ atq
4	Mon Jun 22 23:00:00 2026 a root

$ atrm 4
```

## 7. Managing software packages

Ubuntu package management uses:

- `apt search`
- `apt install`
- `apt remove`
- `dpkg --search`
- `dpkg --listfiles`

Examples:

```bash
$ apt search "apache http server"
apache2/jammy-updates 2.4.58-1ubuntu8 amd64
```

```bash
$ sudo apt install apache2
Reading package lists... Done
Setting up apache2 ...
```

```bash
$ dpkg --search /bin/ls
coreutils: /bin/ls
```

## 8. Processes, signals, and background jobs

You need to inspect, reprioritize, and signal processes.

Core commands from the lectures and cheat sheet:

- `ps`
- `pgrep`
- `kill`
- `pkill`
- `lsof`
- `renice`
- `command &`

Examples:

```bash
$ ps lax | head
F   UID   PID  PPID PRI NI    VSZ   RSS WCHAN  STAT TTY   TIME COMMAND
```

```bash
$ pgrep -a rpcbind
731 rpcbind -w
```

```bash
$ sudo renice 9 731
731 (process ID) old priority 0, new priority 9
```

```bash
$ sleep 300 &
[1] 2031
```

## 9. Verifying resource and process availability

Process monitoring ties directly to service health and system capacity planning.

Disk usage:

```bash
$ df /
Filesystem     1K-blocks    Used Available Use% Mounted on
/dev/vda2       41151808 7218548  31799496  19% /
```

Directory size:

```bash
$ du -sh /bin/
12M	/bin/
```

Memory:

```bash
$ free --mega
               total        used        free      shared  buff/cache   available
Mem:            4096        1024        2200          32         871        2800
```

CPU/load:

```bash
$ uptime
 10:45:52 up 3 days,  2:11,  1 user,  load average: 0.20, 0.31, 0.28
```

Architecture:

```bash
$ lscpu
Architecture:            x86_64
CPU(s):                  4
```

## 10. Filesystem integrity checks

The lecture introduces checking filesystems after unmounting them.

Example:

```bash
$ sudo xfs_repair /dev/vdb
Phase 1 - find and verify superblock...
Phase 2 - using internal log
...
```

The important rule is: do not run repair tools carelessly against mounted filesystems.

## 11. Kernel runtime parameters with sysctl

Two categories are covered:

- temporary changes with `sysctl -w`
- persistent changes in `/etc/sysctl.d/*.conf` or `/etc/sysctl.conf`

Examples:

```bash
$ sysctl net.ipv6.conf.default.disable_ipv6
net.ipv6.conf.default.disable_ipv6 = 0
```

```bash
$ sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1
net.ipv6.conf.default.disable_ipv6 = 1
```

Persistent example:

```bash
$ sudo vim /etc/sysctl.d/swap-less.conf
vm.swappiness=20

$ sudo sysctl -p /etc/sysctl.d/swap-less.conf
vm.swappiness = 20
```

## 12. SELinux contexts and modes

SELinux is an additional security layer based on labels and mandatory access control policy.

Important ideas:

- files and processes have SELinux contexts
- the type/domain part of the context is often the most important
- enforcing/permissive/disabled are the main operating modes

Examples:

```bash
$ ls -Z /bin/sudo
system_u:object_r:sudo_exec_t:s0 /bin/sudo
```

```bash
$ ps axZ | head
LABEL                               PID TTY      STAT   TIME COMMAND
system_u:system_r:init_t:s0           1 ?        Ss     0:02 /sbin/init
```

```bash
$ getenforce
Enforcing

$ sudo setenforce 0
$ getenforce
Permissive
```

Change and restore labels:

```bash
$ sudo chcon -t httpd_sys_content_t /var/index.html
$ sudo restorecon -R /var/log/
```

## 14. Cron syntax in depth

The existing note shows a simple crontab entry. The full syntax has five time fields plus, in the system-wide table, a username field.

```
# /etc/crontab format:
# min  hour  dom  month  dow   user   command
  35   6     *    *      *     root   /bin/some_command --some_options
```

Field ranges:

| Field | Range |
|-------|-------|
| minute | 0–59 |
| hour | 0–23 |
| day of month | 1–31 |
| month | 1–12 or jan–dec |
| day of week | 0–6 (0=Sun) or 7=Sun; also sun–sat |

Special characters:

- `*` — every value in the field
- `,` — list of values, e.g. `15,45` in the minute field
- `-` — range, e.g. `2-4` in the hour field runs at 02:00, 03:00, 04:00
- `/` — step, e.g. `*/4` in the hour field runs every four hours; `0-8/4` runs at 0, 4, 8

Practical examples from the lecture:

```bash
# every day at 06:35
35 6 * * * /usr/bin/touch test_passed

# every Sunday at 03:00 (two equivalent forms)
0 3 * * 0 /usr/bin/touch test_passed
0 3 * * 7 /usr/bin/touch test_passed

# 15th of every month at 03:00
0 3 15 * * /usr/bin/touch test_passed

# every day at 03:00
0 3 * * * /usr/bin/touch test_passed

# every hour on the hour
0 * * * * /usr/bin/touch test_passed
```

Always use the full path to commands inside cron jobs because cron runs with a minimal PATH.

Managing user crontabs:

```bash
$ crontab -l                      # list current user's crontab
35 6 * * * /usr/bin/touch aaron_test

$ sudo crontab -l                 # root's crontab
0 * * * * /usr/bin/touch root_test

$ sudo crontab -e -u jane         # edit another user's crontab (root only)
$ crontab -r                      # remove your own crontab entirely
$ sudo crontab -r -u jane         # remove another user's crontab
```

An alternative to editing crontabs is dropping executable scripts (with no `.sh` extension) into the period-based directories:

```bash
$ sudo cp myscript /etc/cron.hourly/
$ sudo chmod +rx /etc/cron.hourly/myscript
# remove the job later:
$ sudo rm /etc/cron.hourly/myscript
```

The four directories are `/etc/cron.daily/`, `/etc/cron.hourly/`, `/etc/cron.weekly/`, and `/etc/cron.monthly/`. Scripts placed there must be readable and executable and must have no file extension or cron will skip them.

## 15. `at` command in depth

`at` schedules a command to run once. After typing the time specification, `at` opens an interactive prompt where you enter commands one per line. Press Ctrl-D to save.

```bash
$ at '15:00'
warning: commands will be executed using /bin/sh
at> /usr/bin/touch file_created_by_at
at> <Ctrl-D>
```

Time specifications:

```bash
$ at 'August 20 2024'       # specific date, midnight
$ at '2:30 August 20 2024'  # specific date and time
$ at 'now + 30 minutes'
$ at 'now + 3 hours'
$ at 'now + 3 days'
$ at 'now + 3 weeks'
$ at 'now + 3 months'
```

Wrap multi-word specifications in single quotes. Managing the queue:

```bash
$ atq
1    Wed Mar  6 15:00:00 2024 a aaron

$ at -c 1        # print the full script that job 1 will run
DBUS_SESSION_BUS_ADDRESS=...; export DBUS_SESSION_BUS_ADDRESS
...
/usr/bin/touch file_created_by_at

$ atrm 1         # remove job 1
```

## 16. Hardware inspection: `df -h`, `lspci`, and load averages

### Human-readable disk usage

`df` without flags shows 1K-block columns that are hard to read at a glance. The `-h` flag switches to human-readable units:

```bash
$ df -h
Filesystem                         Size  Used Avail Use% Mounted on
/dev/mapper/ubuntu--vg-ubuntu--lv  9.8G  3.9G  5.4G  43% /
tmpfs                              392M  1.1M  391M   1% /run
/dev/vda2                          1.8G  251M  1.4G  16% /boot
```

`tmpfs` entries are RAM-backed virtual filesystems and can normally be ignored when assessing storage.

### PCI device listing

```bash
$ lspci
00:00.0 Host bridge: Intel Corporation 440FX ...
00:03.0 Ethernet controller: Intel Corporation 82540EM Gigabit Ethernet ...
00:0d.0 SATA controller: Intel Corporation 82801HM/HEM SATA Controller [AHCI mode]
```

`lspci` prints every device on the PCI bus. Useful for identifying NIC models, storage controllers, and GPU cards.

### Interpreting load averages

`uptime` prints three load average numbers representing the past 1, 5, and 15 minutes. Each number is the average number of CPU cores kept fully busy over that window.

```bash
$ uptime
17:24:55 up 32 min,  1 user,  load average: 0.05, 0.05, 0.01
```

A value of 1.0 means one core was at 100% for that period. On an 8-core machine:

- `6.00 0.31 0.18` — a recent spike that has already subsided; not alarming
- `6.12 7.12 7.30` — sustained high load for 15 minutes; time to investigate

## 17. `fsck.ext4` for ext4 filesystem checks

The existing note covers `xfs_repair` for XFS. Ubuntu defaults to ext4, which uses `fsck.ext4`. The filesystem must be unmounted before running either tool.

```bash
$ sudo fsck.ext4 -v -f -p /dev/vdb2
11 inodes used (0.00%, out of 262144)
0 bad blocks
36942 blocks used (3.52%, out of 1048576)
2 files
```

Flags:

- `-v` — verbose output showing inode and block counts
- `-f` — force a full check even if the filesystem reports itself clean
- `-p` — "preen" mode: fix simple errors automatically without prompting; serious errors still pause for confirmation

The most important flag to remember is `-p`. Without it, a filesystem with many minor errors will ask yes/no for every one of them.

```bash
$ sudo fsck.ext4 -p /dev/vdb2
```

## 18. `systemctl list-dependencies`

`systemctl list-dependencies` prints a tree of units that the default target depends on, showing at a glance which services are active (filled circle) and which are inactive (empty circle).

```bash
$ systemctl list-dependencies
default.target
● ├─apport.service
● ├─display-manager.service
○ ├─anacron.service
● └─multi-user.target
    ├─atd.service
    ├─cron.service
    └─dbus.service
```

An empty circle next to a service that should always run — like `atd.service` or `cron.service` — signals a problem. Diagnose it:

```bash
$ systemctl status atd.service
○ atd.service - Deferred execution scheduler
   Loaded: loaded (/lib/systemd/system/atd.service; enabled)
   Active: inactive (dead) since Fri 2024-03-08 03:18:09 EET

$ sudo systemctl start atd.service

$ journalctl -u atd.service    # deeper log inspection if start fails
```

## 19. `sysctl -a` and parameter namespaces

The existing note shows how to read and write individual parameters. The lecture adds the technique of listing all parameters and filtering by namespace.

```bash
$ sudo sysctl -a
net.ipv6.conf.default.addr_gen_mode = 0
net.ipv6.conf.default.disable_ipv6 = 0
vm.admin_reserve_kbytes = 8192
vm.swappiness = 60
...
```

Parameter names follow a dotted-namespace convention:

- `net.*` — network subsystem settings
- `vm.*` — virtual memory / swap behavior
- `fs.*` — filesystem-level kernel settings

Filter to a namespace with grep:

```bash
$ sysctl -a | grep vm
vm.panic_on_oom = 0
vm.swappiness = 60
```

`vm.swappiness` accepts 0–100 (older kernels) or 0–200 (newer kernels). Lower values reduce swap use; higher values swap more aggressively. Changing it persistently:

```bash
$ sudo vim /etc/sysctl.d/swap-less.conf
vm.swappiness=20

$ sudo sysctl -p /etc/sysctl.d/swap-less.conf
vm.swappiness = 20
```

The `-p` flag applies a conf file immediately without rebooting. `/etc/sysctl.conf` also works but can be overwritten on OS upgrades, so prefer `/etc/sysctl.d/` for custom changes.

## 20. SELinux context anatomy

The existing note covers labels and mode commands at a surface level. The lecture goes deeper into what the four parts of a context label mean.

Every SELinux label has the format `user:role:type:level`:

```bash
$ ls -Z archive.tar.gz
unconfined_u:object_r:user_home_t:s0 archive.tar.gz
```

| Part | Example | Meaning |
|------|---------|---------|
| user | `unconfined_u` | SELinux user identity (mapped from the Linux login) |
| role | `object_r` | what roles this user/process can enter |
| type | `user_home_t` | the security domain — most important part |
| level | `s0` | MLS/MCS sensitivity level (usually `s0` on standard systems) |

The type is the enforcement boundary. A file's type controls which processes may read or execute it; a process's domain (also called type) controls what it may do. Only files labeled with `sshd_exec_t` can launch a process that enters the `sshd_t` domain:

```bash
$ ls -Z /usr/sbin/sshd
system_u:object_r:sshd_exec_t:s0 /usr/sbin/sshd

$ ps axZ | grep sshd
system_u:system_r:sshd_t:s0-s0:c0.c1023  1030 ?  Ss  /usr/sbin/sshd -D
```

Processes labeled `unconfined_t` are running without SELinux restrictions.

### Inspecting user context mappings

```bash
$ id -Z
unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023

$ sudo semanage login -l
Login Name    SELinux User    MLS/MCS Range    Service
__default__   unconfined_u    s0-s0:c0.c1023   *
root          unconfined_u    s0-s0:c0.c1023   *

$ sudo semanage user -l
SELinux User   Labeling Prefix  MLS/MCS Level  SELinux Roles
root           sysadm           s0             staff_r sysadm_r system_r
staff_u        staff            s0             staff_r sysadm_r
unconfined_u   unconfined       s0             system_r unconfined_r
user_u         user             s0             user_r
```

`semanage login -l` shows how Linux login names map to SELinux users. `semanage user -l` shows which roles each SELinux user is allowed to assume. On most default installations everything maps to `unconfined_u`, meaning SELinux restricts only specific confined services (like `httpd` or `sshd`) rather than user sessions.

## 21. Docker containers

Docker is a container runtime that packages an application together with its configuration files, logs, and runtime libraries into a single portable unit. Moving a containerized application to another host is as simple as copying the container image.

Install Docker on Ubuntu, then verify your user has access:

```bash
$ docker images
Got permission denied while trying to connect to the Docker daemon socket...

# Fix: add your user to the docker group and log back in
$ sudo usermod -aG docker $USER
# Then log out and back in, or use sudo for now:

$ sudo docker images
REPOSITORY       TAG     IMAGE ID       CREATED        SIZE
nginx            latest  021283c8eb95   3 weeks ago    187MB
```

`docker images` lists the container images cached locally. Each image is identified by a repository name, a tag (defaulting to `latest`), and a unique image ID.

## 22. What to practice for LFCS

Prioritize these workflows:

- reboot/shutdown safely
- write and execute short Bash scripts
- manage services with `systemctl`; use `systemctl list-dependencies` to spot inactive services
- inspect logs with `journalctl`
- schedule jobs with `cron` (know all five time fields and special characters), `anacron`, and `at`
- use `/etc/cron.daily|hourly|weekly|monthly` drop directories for script-based jobs
- inspect packages and installed files
- monitor processes, memory, disk (`df -h`), and CPU (`uptime` load averages, `lscpu`, `lspci`)
- check filesystems offline with `xfs_repair` (XFS) or `fsck.ext4 -p` (ext4)
- change kernel parameters with `sysctl`; filter with `sysctl -a | grep <namespace>`
- understand the four-part SELinux context label (user:role:type:level)
- use `id -Z`, `ls -Z`, `ps axZ`, `semanage login -l`, `semanage user -l` to inspect SELinux contexts
- use `docker images` to list local container images; add user to the `docker` group to avoid sudo
