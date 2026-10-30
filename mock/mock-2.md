# Mock exam 2

The rules are the same as in [mock 1](./mock-1.md): 2 hours, 20 tasks, man pages only, persistence required.

```bash
vagrant snapshot restore clean
vagrant ssh base
bash /lfcs/mock/setup-mock-2.sh        # takes a few minutes: installs libvirt and OpenLDAP on node01
```

Grade with `bash /lfcs/mock/check-mock-2.sh`. Solutions: [mock-2-solutions.md](./mock-2-solutions.md).

Domain mix: Essential Commands 4, Operations Deployment 5, Users and Groups 3, Networking 5, Storage 3.

---

**Task 1** (node01). The root filesystem is losing space to a file under `/var/tmp/m2` that was deleted while a process still had it open. Write the PID of that process to `/root/m2-holder.pid`, then make sure the space is released.

**Task 2** (node01). The Git repository `/srv/git/m2.git` has a `main` branch. Clone it to `/root/m2`, create a branch `hotfix` from `main`, add a file `FIX.txt` containing the single line `fixed`, commit it, and push the branch `hotfix` to the origin.

**Task 3** (node02). The service `m2-app.service` should serve `/srv/m2` on TCP 9002 as user `m2app`, but it doesn't start. Fix it so that it runs now and at boot. Don't change the port or the script's logic.

**Task 4** (node01). Create a 2048-bit RSA private key `/root/m2/csr/app.key` without a passphrase, and a certificate signing request `/root/m2/csr/app.csr` for organisation `LFCS` and common name `app.mock2.lab`.

**Task 5** (node01). Create a systemd service `m2-clean.service` that runs `/usr/bin/find /var/tmp -name '*.old' -delete`, and a timer `m2-clean.timer` that triggers it every day at 01:30. The timer must be active now and at boot.

**Task 6** (node02). As user `vagrant`, run a rootless Podman container `m2-web` from `docker.io/library/nginx:alpine`, with host port 8082 published to container port 80. It must be managed by a systemd user unit `container-m2-web.service` that starts at boot, even when `vagrant` isn't logged in.

**Task 7** (node01). Using libvirt, create a VM `m2vm` from the existing disk image `/var/lib/libvirt/images/m2.qcow2`, with 256 MiB of memory, 1 vCPU and the `default` network. Don't run an installer and don't use graphics. The VM must be running and start when the host boots.

**Task 8** (rocky). Install Apache httpd and make it listen on TCP port 8089 in addition to port 80, while SELinux stays enforcing. httpd starts at boot.

**Task 9** (node01). Load the kernel module `br_netfilter` now and at boot. Then set `net.bridge.bridge-nf-call-iptables = 1` persistently in a file under `/etc/sysctl.d/`.

**Task 10** (node02). An LDAP server runs on `node01` with base `dc=lab,dc=local`, anonymous read access, and no TLS (lab only). Configure node02 with SSSD so that LDAP users such as `jdoe` and groups such as `developers` resolve, and LDAP users get a home directory created at first login.

**Task 11** (node02). Every login shell of every user must have the environment variable `M2_ENV=exam`, set from `/etc/profile.d/m2.sh`. Every user created from now on must get an empty file `.m2rc` in their home directory.

**Task 12** (node02). User `m2limited` may run at most 50 processes (hard limit) and has a soft open-files limit of 4096.

**Task 13** (node02). Create `bond0` in `active-backup` mode from the two unused interfaces (`enp0s9` and `enp0s10` on a default VirtualBox setup), with address `10.99.0.22/24`. It must be persistent.

**Task 14** (base, as `vagrant`). User `m2ops` exists on node02 with password `Mock2pass!`. Create an ed25519 key pair `~/.ssh/m2_ed25519`. Make `ssh m2` log in to node02 as `m2ops` with that key and no password prompt.

**Task 15** (rocky). Replace firewalld with nftables. Disable firewalld, and write a ruleset that loads at boot. It drops incoming TCP port 23, accepts everything else, and redirects incoming TCP port 8081 to local port 8089, so that `curl rocky:8081` from base reaches httpd.

**Task 16** (node02). Set the static hostname to `node02.mock2.lab`. Without DNS, make `db.mock2` resolve to `192.168.56.13` and `api.mock2` to `192.168.56.11`.

**Task 17** (node01). Install nginx and configure it as a reverse proxy on port 80 that forwards all requests to `http://node02:9002` (the service from Task 3). Replace the default site.

**Task 18** (node01). The logical volume `m2vg/m2lv` is mounted on `/m2/data` and holds data. Add `/dev/sdc` to volume group `m2vg`, and grow `m2lv` and its filesystem to 1.5 GiB without unmounting it.

**Task 19** (node02). node01 exports `/srv/m2exports`, with one subdirectory per project (`alpha`, `beta` and so on). With autofs, accessing `/m2auto/<name>` must mount `node01:/srv/m2exports/<name>` for any name. Mounts expire after 30 seconds idle. autofs starts at boot.

**Task 20** (node02). Create an ext4 filesystem with label `M2DATA` directly on `/dev/sdb`. Mount it by label on `/m2/label` with the options `noexec` and `nodev`. Also mount a 64 MiB `tmpfs` on `/m2/tmp`. Both must be persistent.
