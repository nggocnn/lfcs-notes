# Mock exam 3

The rules are the same as in [mock 1](./mock-1.md). Take this one last, 2 to 4 days before the real exam, as a final check.

```bash
vagrant snapshot restore clean
vagrant ssh base
bash /lfcs/mock/setup-mock-3.sh
```

Grade with `bash /lfcs/mock/check-mock-3.sh`. Solutions: [mock-3-solutions.md](./mock-3-solutions.md).

Domain mix: Essential Commands 4, Operations Deployment 5, Users and Groups 3, Networking 5, Storage 3.

---

**Task 1** (node01). From the web log `/opt/m3/access.log`, write every line with HTTP status 404 to `/root/m3-404.txt`, unchanged and in the original order. Write the number of distinct client IP addresses (first field) in the whole log to `/root/m3-ipcount.txt`.

**Task 2** (node01). Write the absolute paths of all regular files under `/opt/m3/perm` that have the SUID bit set to `/root/m3-suid.txt`, one per line. Then remove write permission for "others" from every file under `/opt/m3/perm` that has it, without changing any other bits.

**Task 3** (node02). The vendor unit `/lib/systemd/system/m3-worker.service` must not be edited. Without touching it, make the service run with the environment variable `LEVEL=debug`, a CPU quota of 20%, and an open-files limit of 2048. It must run now and start at boot.

**Task 4** (node01). From the archive `/opt/m3/backup.tar.gz`, restore only `etc/app/b.conf` into `/srv/m3restore`, keeping its relative path. Write the full list of files in the archive to `/root/m3-list.txt`.

**Task 5** (node02). The ext4 filesystem on `/dev/sdc` no longer mounts. Repair it without losing its data, then mount it on `/m3/recovered`, persistently, by UUID.

**Task 6** (rocky). A local package repository exists in `/opt/m3repo`. Configure it as a dnf repository with the id `m3local`, enabled, without GPG checks. Install the package `tree` from it.

**Task 7** (node01). In `/srv/m3site` there is an `index.html`. Build an image `m3/site:1.0` based on `nginx:alpine` that serves this file as its default page. Run a container `m3-site` from it with host port 8083 published to container port 80. The container must restart automatically unless it was stopped by hand.

**Task 8** (node01). Create `/etc/cron.d/m3-backup`. It runs `/usr/bin/tar -czf /root/m3-etc.tgz /etc` as root every 6 hours, at minute 0.

**Task 9** (rocky). SELinux is currently permissive. Make it enforcing now and at boot. Turn on the boolean `httpd_can_network_connect_db` persistently. Files under `/srv/m3logs` must be labelled `httpd_log_t`, and the label must survive a relabel.

**Task 10** (node02). User `m3a` must change their password at the next login. After that, the password can be changed at most every 2 days, must be changed every 60 days, and a warning appears 10 days before it expires. Lock user `m3b`'s password and give them the shell `nologin`.

**Task 11** (node02). Rename group `m3old` to `m3team` and change its GID to 4200. User `m3b` must also be a member of `m3team`. `m3a` stays a member.

**Task 12** (node02). User `m3a` already has an ACL entry on `/srv/m3proj` but still can't create files there. Fix it. Also give group `m3team` read-only access (`r-x`) through an ACL. "Others" must have no access.

**Task 13** (node02). Create a bridge `br0` with member `enp0s10`, STP disabled and address `10.99.0.33/24`, persistently.

**Task 14** (node02). On `enp0s9`, configure the static IPv6 address `fd00:99::12/64`, the DNS server `192.168.56.11` and the search domain `mock3.lab`, persistently, with netplan. Use no DHCP on that link.

**Task 15** (rocky). With firewalld, allow the `http` service and TCP port 8443, and forward incoming TCP port 8084 to local port 80. All of it must be active now and after a reboot.

**Task 16** (node01, node02). Make node01 a chrony time server for `192.168.56.0/24`. It must keep serving time even without upstream sources. Configure node02 to use node01 as its only time source.

**Task 17** (node01). node02 runs web backends on TCP 9101 and 9102. Configure nginx on node01 port 80 as a load balancer across both, using the least-connections method. Replace the default site.

**Task 18** (node01). Volume group `m3vg` lives on `/dev/sdb`, and `m3lv` is mounted on `/m3/data`. Move all of its data to `/dev/sdc`, then remove `/dev/sdb` from the volume group and wipe its LVM label. The filesystem must stay mounted and intact.

**Task 19** (node02). node01 exports `/srv/m3nfs`. Using fstab and systemd only (no autofs), mount it on `/m3/auto` on first access, and unmount it after 60 seconds idle.

**Task 20** (node02). On `/dev/sdb`, create a GPT partition table and a 512 MiB first partition. Use it as swap with priority 10, referenced by UUID, active now and at boot.
