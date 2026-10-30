# Mock exam 1

Rules: 2 hours, 20 tasks. Use only `man`, `--help` and `/usr/share/doc`. Work from `base` and `ssh` to the host named in each task. `exit` before moving to the next host. Every change must survive a reboot unless the task says otherwise. If a task takes more than 8 minutes, flag it and move on.

Before you start (from the host machine and base):

```bash
vagrant snapshot restore clean
vagrant ssh base
bash /lfcs/mock/setup-mock-1.sh
```

Grade at the end with `bash /lfcs/mock/check-mock-1.sh`. Solutions are in [mock-1-solutions.md](./mock-1-solutions.md). Open them only after grading.

Domain mix: Essential Commands 4, Operations Deployment 5, Users and Groups 3, Networking 5, Storage 3.

---

**Task 1** (node01). Find all regular files under `/opt/m1/data` that are owned by user `m1user` and are larger than 1 MiB. Copy them into the directory `/root/m1-found/`, flat (file names only, no subdirectories).

**Task 2** (node01). Create an xz-compressed tar archive `/root/m1-data.tar.xz` containing the directory `/opt/m1/data`.

**Task 3** (node01). Create a 2048-bit RSA private key `/etc/ssl/m1/m1.key` (mode 600) and a self-signed certificate `/etc/ssl/m1/m1.crt` for common name `mock1.lab`, valid for 365 days.

**Task 4** (node02). Create the service `m1-web.service`. It runs `/usr/bin/python3 -m http.server 9001 --directory /srv/m1` as user `www-data`, starts at boot, is running now, and may use at most 100 MiB of memory.

**Task 5** (node01). Set the kernel parameters `vm.dirty_ratio = 15` and `net.ipv4.ip_forward = 1`, active now and at boot, in the file `/etc/sysctl.d/m1.conf`.

**Task 6** (node01). User `m1user` must run `/usr/local/bin/report.sh` every Sunday at 04:15 from their own crontab.

**Task 7** (rocky). Install Apache httpd and make it serve `/srv/m1web` as its document root on port 80. The content must be reachable with `curl localhost` while SELinux stays enforcing, and the SELinux setting must survive a full relabel. httpd starts at boot.

**Task 8** (node02). Run a Docker container named `m1-cache` from image `redis:7-alpine`. Publish container port 6379 on host port 6379, on the loopback address `127.0.0.1` only. The container must always be restarted.

**Task 9** (node01). Install the package `jq`. Prevent `openssh-server` from being upgraded by apt.

**Task 10** (node02). Create group `developers` with GID 3100. Create user `m1dev` with UID 2501, a home directory, shell `/bin/bash`, and supplementary group `developers`. The account expires on 2027-12-31, and the password must be changed at least every 45 days.

**Task 11** (node02). Members of group `m1ops` may run `/usr/bin/systemctl restart nginx` as root without a password, and nothing else. Put the rule in `/etc/sudoers.d/m1ops`.

**Task 12** (node02). Directory `/srv/m1acl` exists. Without changing its owner, group or mode bits, give user `m1dev` read, write and execute access to it. Files created there later must automatically be readable and writable by `m1dev`.

**Task 13** (node02). Configure the first unused network interface (`enp0s9` on a default VirtualBox setup) with the static address `10.99.0.12/24`, persistently, with netplan.

**Task 14** (node02). Add a persistent route to `10.60.0.0/24` via `192.168.56.11`.

**Task 15** (node01). Configure the SSH server so that root can't log in and at most 3 authentication attempts are allowed per connection. The service must be running with the new settings.

**Task 16** (node01). Connections to TCP port `9090` on node01 must be forwarded to port `9001` on node02 (the service from Task 4), so that `curl node01:9090` from base works. The rules must survive a reboot.

**Task 17** (node02). Set the timezone to `Asia/Tokyo`. Configure systemd-timesyncd to use `time.lab` as its NTP server, and make sure NTP synchronization is on.

**Task 18** (node01). Create volume group `m1vg` from `/dev/sdb` and `/dev/sdc`. Create logical volume `m1lv` of 800 MiB in it, format it with XFS, and mount it on `/m1/data` persistently.

**Task 19** (node01). Create a 256 MiB swap file `/m1swap` with secure permissions. It must be active now and at boot.

**Task 20** (node02). Mount the NFS export `node01:/srv/m1share` on `/mnt/m1share` persistently. A missing server must not block the boot.
