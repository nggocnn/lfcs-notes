# Operations Deployment

This section covers boot and shutdown procedures, scripting, service management, logs, scheduled tasks, package management, process/resource monitoring, kernel runtime parameters, SELinux, recovery from boot and filesystem failures, containers, libvirt virtual machines, and kernel modules.

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

## 13. Cron syntax in depth

The existing note shows a simple crontab entry. The full syntax has five time fields plus, in the system-wide table, a username field.

```
# /etc/crontab format:
# min  hour  dom  month  dow   user   command
  35   6     *    *      *     root   /bin/some_command --some_options
```

Field ranges:

| Field        | Range                              |
| ------------ | ---------------------------------- |
| minute       | 0–59                               |
| hour         | 0–23                               |
| day of month | 1–31                               |
| month        | 1–12 or jan–dec                    |
| day of week  | 0–6 (0=Sun) or 7=Sun; also sun–sat |

Special characters:

- `*` - every value in the field
- `,` - list of values, e.g. `15,45` in the minute field
- `-` - range, e.g. `2-4` in the hour field runs at 02:00, 03:00, 04:00
- `/` - step, e.g. `*/4` in the hour field runs every four hours; `0-8/4` runs at 0, 4, 8

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

## 14. `at` command in depth

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

## 15. Hardware inspection: `df -h`, `lspci`, and load averages

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

- `6.00 0.31 0.18` - a recent spike that has already subsided; not alarming
- `6.12 7.12 7.30` - sustained high load for 15 minutes; time to investigate

## 16. `fsck.ext4` for ext4 filesystem checks

The existing note covers `xfs_repair` for XFS. Ubuntu defaults to ext4, which uses `fsck.ext4`. The filesystem must be unmounted before running either tool.

```bash
$ sudo fsck.ext4 -v -f -p /dev/vdb2
11 inodes used (0.00%, out of 262144)
0 bad blocks
36942 blocks used (3.52%, out of 1048576)
2 files
```

Flags:

- `-v` - verbose output showing inode and block counts
- `-f` - force a full check even if the filesystem reports itself clean
- `-p` - "preen" mode: fix simple errors automatically without prompting; serious errors still pause for confirmation

The most important flag to remember is `-p`. Without it, a filesystem with many minor errors will ask yes/no for every one of them.

```bash
$ sudo fsck.ext4 -p /dev/vdb2
```

## 17. `systemctl list-dependencies`

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

An empty circle next to a service that should always run - like `atd.service` or `cron.service` - signals a problem. Diagnose it:

```bash
$ systemctl status atd.service
○ atd.service - Deferred execution scheduler
   Loaded: loaded (/lib/systemd/system/atd.service; enabled)
   Active: inactive (dead) since Fri 2024-03-08 03:18:09 EET

$ sudo systemctl start atd.service

$ journalctl -u atd.service    # deeper log inspection if start fails
```

## 18. `sysctl -a` and parameter namespaces

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

- `net.*` - network subsystem settings
- `vm.*` - virtual memory / swap behavior
- `fs.*` - filesystem-level kernel settings

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

## 19. SELinux context anatomy

The existing note covers labels and mode commands at a surface level. The lecture goes deeper into what the four parts of a context label mean.

Every SELinux label has the format `user:role:type:level`:

```bash
$ ls -Z archive.tar.gz
unconfined_u:object_r:user_home_t:s0 archive.tar.gz
```

| Part  | Example        | Meaning                                                      |
| ----- | -------------- | ------------------------------------------------------------ |
| user  | `unconfined_u` | SELinux user identity (mapped from the Linux login)          |
| role  | `object_r`     | what roles this user/process can enter                       |
| type  | `user_home_t`  | the security domain - most important part                    |
| level | `s0`           | MLS/MCS sensitivity level (usually `s0` on standard systems) |

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

## 20. Docker containers

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

## 21. Recovering from boot and filesystem failures

The curriculum asks you to "recover from hardware, operating system, or filesystem failures". In practice that means four things: getting a shell when boot fails, fixing a bad `/etc/fstab`, resetting a lost root password, and repairing a filesystem or the bootloader.

### Booting into rescue or emergency mode

1. Show the GRUB menu: hold `Shift` (BIOS) or tap `Esc` (UEFI) during boot.
2. Highlight the entry and press `e`.
3. At the end of the line starting with `linux`, add one of:
   - `systemd.unit=rescue.target`: single-user mode with local filesystems mounted
   - `systemd.unit=emergency.target`: minimal shell, root mounted read-only, nothing else
   - `init=/bin/bash`: no systemd at all, for when the others fail
4. Press `Ctrl+X` to boot.

The same targets are available from a running system:

```bash
$ sudo systemctl isolate rescue.target
$ sudo systemctl set-default multi-user.target   # persistent default
$ sudo systemctl get-default
```

Rescue and emergency mode ask for the root password. On Ubuntu, root has no password by default, so you get `Cannot open access to console, the root account is locked`. In that case use `init=/bin/bash`.

### Fixing a broken /etc/fstab

A typo in `/etc/fstab`, or a disk that has disappeared, stops the boot in emergency mode with a message like `Dependency failed for /data` or `Timed out waiting for device`.

```bash
# mount root read-write so you can edit
# mount -o remount,rw /
# vi /etc/fstab               # fix or comment out the bad line
# systemctl daemon-reload
# mount -a                    # must finish with no errors
# reboot
```

Always test new fstab lines with `sudo mount -a` and `findmnt --verify` before rebooting. Add `nofail` to non-critical mounts so that a missing disk doesn't block the boot.

### Resetting a lost root password

On Ubuntu/Debian, boot with `init=/bin/bash`:

```bash
# mount -o remount,rw /
# passwd root
# sync
# exec /sbin/init             # or: reboot -f
```

On RHEL/Rocky, add `rd.break` to the `linux` line instead:

```bash
# mount -o remount,rw /sysroot
# chroot /sysroot
# passwd root
# touch /.autorelabel         # SELinux must relabel the changed /etc/shadow
# exit ; exit
```

### Repairing a filesystem

The filesystem must not be mounted, or you can corrupt it:

```bash
$ sudo umount /dev/vdb1
$ sudo fsck.ext4 -f /dev/vdb1          # -y answers yes to every fix
$ sudo xfs_repair /dev/vdc1            # XFS; use -L only as a last resort (drops the log)
```

For the root filesystem, check it at the next boot by adding `fsck.mode=force` to the kernel line, or run the check from rescue media.

### Reinstalling or regenerating GRUB

```bash
# Ubuntu/Debian
$ sudo grub-install /dev/sda
$ sudo update-grub

# RHEL/Rocky (BIOS)
$ sudo grub2-install /dev/sda
$ sudo grub2-mkconfig -o /boot/grub2/grub.cfg
```

### Hardware failures

Check for disk errors in `dmesg -T | grep -i error`, `journalctl -k -p err` and `smartctl -a /dev/sda` (package `smartmontools`). See [99-extensions.md](./99-extensions.md) for replacing a failed software RAID member.

## 22. Package repositories and maintenance

The competency is to search for, install, validate and maintain software packages and repositories.

### Debian/Ubuntu (apt, dpkg)

```bash
$ apt show nginx                       # details, dependencies
$ apt-cache policy nginx               # installed vs candidate version, and which repo
$ apt list --installed | grep nginx
$ apt list --upgradable
$ sudo apt install nginx=1.18.0-6ubuntu14   # a specific version
$ sudo apt-mark hold nginx             # keep it out of upgrades
$ apt-mark showhold
$ sudo apt-mark unhold nginx
$ sudo apt remove nginx                # keeps config files
$ sudo apt purge nginx                 # removes config files too
$ sudo apt autoremove                  # unused dependencies
$ sudo apt-get install --reinstall coreutils
$ apt-file search bin/semanage         # which package ships a file (install apt-file, then apt-file update)
```

Validate installed packages:

```bash
$ dpkg -V nginx                        # files changed since install; no output = clean
$ sudo dpkg --audit                    # half-installed packages
$ sudo dpkg --configure -a             # finish interrupted installs
$ sudo apt --fix-broken install        # resolve broken dependencies
```

Add a third-party repository. The modern way stores the key in `/etc/apt/keyrings` and references it with `signed-by`:

```bash
$ sudo install -d -m 0755 /etc/apt/keyrings
$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
$ echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu jammy stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list
$ sudo apt update
```

A PPA is a one-liner: `sudo add-apt-repository ppa:<user>/<ppa>`. To remove a repository, delete its file from `/etc/apt/sources.list.d/` and run `apt update`. Ubuntu 24.04 writes the main repositories in deb822 format to `/etc/apt/sources.list.d/ubuntu.sources`; 22.04 uses `/etc/apt/sources.list`.

### RHEL/Rocky (dnf, rpm)

| Task                       | apt / dpkg                  | dnf / rpm                           |
| -------------------------- | --------------------------- | ----------------------------------- |
| search                     | `apt search x`              | `dnf search x`                      |
| info                       | `apt show x`                | `dnf info x`                        |
| install / remove           | `apt install/remove x`      | `dnf install/remove x`              |
| upgrade all                | `apt update && apt upgrade` | `dnf upgrade`                       |
| which package owns a file  | `dpkg -S /path`             | `rpm -qf /path`                     |
| files in a package         | `dpkg -L x`                 | `rpm -ql x`                         |
| package for a missing file | `apt-file search`           | `dnf provides '*/semanage'`         |
| verify                     | `dpkg -V x`                 | `rpm -V x`                          |
| list repos                 | `apt-cache policy`          | `dnf repolist --all`                |
| hold a version             | `apt-mark hold x`           | `dnf versionlock add x` (plugin)    |
| history and rollback       | `/var/log/apt/history.log`  | `dnf history`, `dnf history undo N` |

Add a dnf repository with a file in `/etc/yum.repos.d/`:

```ini
# /etc/yum.repos.d/local.repo
[local]
name=Local repo
baseurl=http://repo.example.com/rocky9/
enabled=1
gpgcheck=0
```

or with `sudo dnf config-manager --add-repo <url>` (package `dnf-plugins-core`). Enable or disable a repository with `dnf config-manager --set-enabled|--set-disabled <id>`.

## 23. Enforcing MAC with SELinux

Section 12 covers inspecting contexts. The curriculum says "create and enforce", so you also need persistent modes, persistent file labels, booleans, ports, and reading denials. The tools are in `policycoreutils-python-utils` on Rocky.

Modes:

```bash
$ sestatus
$ sudo setenforce 1                    # runtime only: 1 = enforcing, 0 = permissive
$ sudo vi /etc/selinux/config          # persistent: SELINUX=enforcing
```

Going from `disabled` to `enforcing` needs a full relabel and a reboot: `sudo touch /.autorelabel && sudo reboot`.

Persistent file labels. `chcon` doesn't survive a relabel, but `semanage fcontext` does:

```bash
$ sudo semanage fcontext -a -t httpd_sys_content_t "/srv/web(/.*)?"
$ sudo restorecon -Rv /srv/web
$ ls -Zd /srv/web
$ sudo semanage fcontext -l | grep /srv/web
$ matchpathcon /srv/web/index.html     # what the label should be
```

Booleans switch optional behaviour in the policy:

```bash
$ getsebool -a | grep httpd
$ sudo setsebool -P httpd_can_network_connect on   # -P = persistent
$ sudo semanage boolean -l | grep httpd_can_network_connect
```

Ports: a service may only bind ports labelled for it:

```bash
$ sudo semanage port -l | grep http_port_t
$ sudo semanage port -a -t http_port_t -p tcp 8081
$ sudo semanage port -m -t http_port_t -p tcp 8081  # use -m if the port already has another type
```

Troubleshooting denials:

```bash
$ sudo ausearch -m AVC -ts recent
$ sudo ausearch -m AVC -ts recent | audit2why
$ sudo journalctl -t setroubleshoot    # if setroubleshoot-server is installed
$ sudo semanage permissive -a httpd_t  # make one domain permissive while debugging
$ sudo semanage permissive -d httpd_t
```

Typical exam flow: a web server serves a 403, or can't bind a port while SELinux is enforcing. Fix the label or the port. Don't set the system to permissive.

SELinux on Ubuntu is possible but not the default, because Ubuntu uses AppArmor. To enable it: `sudo apt install selinux-basics selinux-policy-default auditd`, disable AppArmor, run `sudo selinux-activate`, then reboot twice. Expect a RHEL-family host for SELinux tasks.

## 24. Containers with Docker and Podman

The competency is "configure container engines, create and manage containers". Docker and Podman share almost the same CLI. Podman needs no daemon and can run rootless.

Run and manage containers:

```bash
$ sudo docker pull nginx:1.25
$ sudo docker run -d --name web -p 8080:80 \
    -v /srv/www:/usr/share/nginx/html:ro \
    --restart unless-stopped nginx:1.25
$ sudo docker ps                        # -a includes stopped containers
$ sudo docker logs -f web
$ sudo docker exec -it web sh
$ sudo docker inspect web --format '{{.State.Status}} {{.HostConfig.RestartPolicy.Name}}'
$ sudo docker stop web ; sudo docker rm web
$ sudo docker images ; sudo docker rmi nginx:1.25
$ sudo docker run --rm -e MSG=hi alpine sh -c 'echo $MSG'
```

Restart policies are `no`, `on-failure`, `always` and `unless-stopped`. A container with `always` or `unless-stopped` comes back after a reboot only if the docker service is enabled (`systemctl is-enabled docker`).

Volumes and networks:

```bash
$ sudo docker volume create dbdata
$ sudo docker run -d --name db -v dbdata:/var/lib/mysql -e MARIADB_ROOT_PASSWORD=pw mariadb
$ sudo docker network create appnet
$ sudo docker run -d --name app --network appnet nginx
```

Build an image:

```dockerfile
# Dockerfile
FROM nginx:1.25
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
$ sudo docker build -t mysite:1.0 .
$ sudo docker run -d -p 8081:80 mysite:1.0
```

Configure the engine:

- Docker reads `/etc/docker/daemon.json`, for example `{"log-driver": "journald", "data-root": "/data/docker"}`. Run `sudo systemctl restart docker` after editing.
- Podman reads `/etc/containers/registries.conf`, for example `unqualified-search-registries = ["docker.io"]`, so that short names like `nginx` resolve.

Podman containers have no daemon to restart them, so persistence goes through systemd:

```bash
$ podman run -d --name web -p 8080:80 docker.io/library/nginx
$ podman generate systemd --new --files --name web    # writes container-web.service
$ mkdir -p ~/.config/systemd/user && mv container-web.service ~/.config/systemd/user/
$ systemctl --user daemon-reload && systemctl --user enable --now container-web
$ sudo loginctl enable-linger $USER                   # start user services at boot without a login
```

Podman 4.4+ prefers Quadlet files (`~/.config/containers/systemd/web.container`) over `generate systemd`, but both work.

## 25. Virtual machines with libvirt

The curriculum lists "Manage Virtual Machines (libvirt)". Expect to list, start, stop, autostart, resize and create VMs with `virsh` and `virt-install`.

Install on Ubuntu:

```bash
$ sudo apt install qemu-kvm libvirt-daemon-system libvirt-clients virtinst
$ sudo usermod -aG libvirt $USER       # log out and back in
$ virsh -c qemu:///system list --all
```

As a normal user `virsh` connects to `qemu:///session` by default. Use `sudo` or `-c qemu:///system` to see the system VMs.

Lifecycle:

```bash
$ sudo virsh list --all
$ sudo virsh start vm1
$ sudo virsh shutdown vm1              # graceful (ACPI)
$ sudo virsh destroy vm1               # hard power off, not delete
$ sudo virsh reboot vm1
$ sudo virsh autostart vm1             # start with the host; --disable to undo
$ sudo virsh dominfo vm1               # state, vCPUs, memory, autostart
$ sudo virsh console vm1               # Ctrl+] to leave
```

Change resources. `--config` changes the persistent definition, which takes effect at the next boot:

```bash
$ sudo virsh setvcpus vm1 2 --config --maximum
$ sudo virsh setvcpus vm1 2 --config
$ sudo virsh setmaxmem vm1 2G --config
$ sudo virsh setmem vm1 2G --config
$ sudo virsh edit vm1                  # edit the XML directly
$ sudo virsh dumpxml vm1 > vm1.xml
```

Create and delete:

```bash
# import an existing disk image (fast, no installer)
$ sudo virt-install --name vm2 --memory 1024 --vcpus 1 \
    --disk /var/lib/libvirt/images/vm2.qcow2 --import \
    --os-variant generic --network network=default --graphics none --noautoconsole

$ sudo virsh define vm1.xml            # register a VM from XML
$ sudo virsh undefine vm2 --remove-all-storage
```

`osinfo-query os` (package `libosinfo-bin`) lists the valid `--os-variant` values.

Networks and storage:

```bash
$ sudo virsh net-list --all
$ sudo virsh net-start default ; sudo virsh net-autostart default
$ sudo virsh pool-list --all
$ sudo virsh vol-list default
```

## 26. Kernel modules and boot parameters

Kernel parameters are set in three places: `sysctl` (section 11), module options, and the kernel command line.

Modules:

```bash
$ lsmod | grep br_netfilter
$ modinfo br_netfilter
$ sudo modprobe br_netfilter           # load now
$ sudo modprobe -r br_netfilter        # unload
$ echo br_netfilter | sudo tee /etc/modules-load.d/br_netfilter.conf    # load at boot
$ echo "options loop max_loop=16" | sudo tee /etc/modprobe.d/loop.conf  # module option
$ echo "blacklist pcspkr" | sudo tee /etc/modprobe.d/blacklist-pcspkr.conf
$ cat /sys/module/loop/parameters/max_loop
```

Kernel command line:

```bash
$ cat /proc/cmdline
# Ubuntu: edit GRUB_CMDLINE_LINUX_DEFAULT in /etc/default/grub, then
$ sudo update-grub
# RHEL/Rocky:
$ sudo grubby --update-kernel=ALL --args="audit=1"
```

Check that a `sysctl` change is persistent without rebooting: `sudo sysctl --system` reloads every file in `/etc/sysctl.d/`, `/run/sysctl.d/` and `/usr/lib/sysctl.d/`, then `sysctl <key>` shows the value.

## 27. What to practice for LFCS

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
- recover from a broken fstab or a lost root password via the GRUB `e` menu
- add, remove and validate apt/dnf repositories and packages (`apt-mark hold`, `dpkg -V`, `rpm -V`)
- make SELinux changes persistent: `semanage fcontext` + `restorecon`, `setsebool -P`, `semanage port`
- run containers with ports, volumes and restart policies; persist Podman containers with systemd
- manage libvirt VMs with `virsh` (start, shutdown, autostart, setvcpus, setmem) and `virt-install --import`
- load kernel modules at boot and set kernel command-line parameters
