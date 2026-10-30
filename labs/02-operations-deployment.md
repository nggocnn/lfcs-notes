# Labs: Operations Deployment (25%)

This is the biggest domain together with Networking, so do every lab here at least twice. Notes: [02-operations-deployment.md](../02-operations-deployment.md).

Labs 2.5 and 2.6 need the VM console, because SSH doesn't work while the system is in GRUB or emergency mode. Open the VM in the VirtualBox Manager and click **Show**. Take a snapshot first.

## Lab 2.1: Kernel parameters

Host: `node01`. Target: 6 min.

1. Set `vm.swappiness` to `15` persistently, in a file named `/etc/sysctl.d/80-lab.conf`.
2. Set `net.ipv4.icmp_echo_ignore_all` to `1` for the running system only, so that it is lost at reboot.
3. Load the kernel module `dummy` now and at every boot.

Verify:

```bash
sysctl vm.swappiness net.ipv4.icmp_echo_ignore_all
lsmod | grep dummy
sudo reboot ; # then: swappiness 15, icmp_echo_ignore_all 0, dummy loaded
```

<details><summary>Solution</summary>

```bash
echo 'vm.swappiness = 15' | sudo tee /etc/sysctl.d/80-lab.conf
sudo sysctl -p /etc/sysctl.d/80-lab.conf
sudo sysctl -w net.ipv4.icmp_echo_ignore_all=1
sudo modprobe dummy
echo dummy | sudo tee /etc/modules-load.d/dummy.conf
```

</details>

## Lab 2.2: Scheduling

Host: `node01`. Target: 10 min.

1. As user `vagrant`, schedule `/usr/bin/df -h > /tmp/df.log` to run every 15 minutes between 08:00 and 17:59, Monday to Friday.
2. System-wide (in `/etc/cron.d/backup`), run `/usr/bin/tar -czf /root/etc.tgz /etc` as root at 02:30 on the 1st of every month.
3. Schedule `touch /tmp/at-done` to run once, 5 minutes from now.
4. Create a systemd timer `cleanup.timer` that runs `cleanup.service` (`/usr/bin/find /tmp -name '*.tmp' -mtime +1 -delete`) every day at 03:00. Missed runs must be caught up after downtime.

Verify:

```bash
crontab -l -u vagrant
cat /etc/cron.d/backup
atq
systemctl list-timers cleanup.timer
```

<details><summary>Solution</summary>

```bash
( crontab -l 2>/dev/null; echo '*/15 8-17 * * 1-5 /usr/bin/df -h > /tmp/df.log' ) | crontab -
echo '30 2 1 * * root /usr/bin/tar -czf /root/etc.tgz /etc' | sudo tee /etc/cron.d/backup
echo 'touch /tmp/at-done' | at now + 5 minutes
sudo tee /etc/systemd/system/cleanup.service <<'X'
[Service]
Type=oneshot
ExecStart=/usr/bin/find /tmp -name '*.tmp' -mtime +1 -delete
X
sudo tee /etc/systemd/system/cleanup.timer <<'X'
[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
X
sudo systemctl daemon-reload && sudo systemctl enable --now cleanup.timer
```

</details>

## Lab 2.3: Packages and repositories

Host: `node01`. Target: 10 min.

1. Install `nginx` and keep it from being upgraded.
2. Write the name of the package that owns `/usr/bin/htop`, or would own it if installed, to `/root/htop-pkg.txt`.
3. Setup: `echo '# tampered' | sudo tee -a /etc/nginx/mime.types /etc/nginx/fastcgi_params >/dev/null`. Find which files of the `nginx-common` package differ from the packaged version and write their paths to `/root/changed.txt`.
4. Remove the package `nano` together with its configuration files.

Verify: `apt-mark showhold` lists nginx, and `dpkg -l nano` shows `rc` or no entry.

<details><summary>Solution</summary>

```bash
sudo apt install -y nginx && sudo apt-mark hold nginx
sudo apt install -y apt-file && sudo apt-file update
apt-file search bin/htop | awk -F: '{print $1}' | sort -u | sudo tee /root/htop-pkg.txt
dpkg -V nginx-common | awk '{print $NF}' | sudo tee /root/changed.txt
sudo apt purge -y nano
```

`dpkg -V` marks config files with `c`. Both edited files show up because their checksum changed (the `5` in `??5??????`).

</details>

## Lab 2.4: Packages on Rocky

Host: `rocky`. Target: 8 min.

1. Create a repository file `/etc/yum.repos.d/epel-lab.repo` with the id `epel-lab`. Point it at `https://dl.fedoraproject.org/pub/epel/9/Everything/x86_64/`, with GPG checks off, enabled.
2. Install `htop` from it.
3. Write the package that provides `/usr/sbin/semanage` to `/root/semanage-pkg.txt`.
4. Undo the `htop` installation using dnf history.

Verify: `dnf repolist` shows `epel-lab`, and `rpm -q htop` reports it is not installed after step 4.

<details><summary>Solution</summary>

```bash
sudo tee /etc/yum.repos.d/epel-lab.repo <<'X'
[epel-lab]
name=EPEL lab
baseurl=https://dl.fedoraproject.org/pub/epel/9/Everything/x86_64/
enabled=1
gpgcheck=0
X
sudo dnf install -y htop
rpm -qf /usr/sbin/semanage | sudo tee /root/semanage-pkg.txt
sudo dnf history list | head            # find the htop transaction ID
sudo dnf history undo -y <ID>
```

</details>

## Lab 2.5: Broken fstab (console)

Host: `node02`. Target: 10 min.

Setup: `echo '/dev/sdz1 /broken ext4 defaults 0 2' | sudo tee -a /etc/fstab && sudo reboot`

The VM stops booting. Possible symptoms are an emergency shell, or a 90-second wait followed by `Dependency failed`. Recover it from the console so that it boots normally again. Keep the rest of `/etc/fstab` intact.

Verify: after a normal reboot, `vagrant ssh node02` works and `findmnt --verify` reports no errors.

<details><summary>Solution</summary>

On Ubuntu the root account is locked, so emergency mode may refuse a shell. In that case:

1. Reboot, hold `Shift` for the GRUB menu, press `e`, and append `init=/bin/bash` to the `linux` line. Press `Ctrl+X`.
2. `mount -o remount,rw /`
3. Edit `/etc/fstab` and delete the `/dev/sdz1` line.
4. `sync; reboot -f`

If you get an emergency shell instead, run `mount -o remount,rw /`, fix the file, then `systemctl daemon-reload; mount -a; reboot`. To prevent this in future, use `nofail` on non-critical mounts.

</details>

## Lab 2.6: Lost root password (console)

Host: `rocky`. Target: 12 min.

Setup: `sudo passwd root` and set a password you then forget. Reboot.

Task: reset the root password to `LfcsRoot123!` from the boot menu. SELinux must stay enforcing, and you must still be able to log in afterwards.

Verify: log in on the console as root with the new password, and `getenforce` shows `Enforcing`.

<details><summary>Solution</summary>

1. At GRUB press `e` and append `rd.break` to the `linux` line. Press `Ctrl+X`.
2. `mount -o remount,rw /sysroot`
3. `chroot /sysroot`
4. `passwd root`
5. `touch /.autorelabel`
6. `exit`, then `exit` again (or `reboot -f`). The relabel adds a minute and one extra reboot.

</details>

## Lab 2.7: Filesystem repair

Host: `node01`. Target: 8 min.

Setup:

```bash
sudo mkfs.ext4 -q /dev/sdd
sudo mkdir -p /mnt/repair && sudo mount /dev/sdd /mnt/repair && sudo cp -r /etc /mnt/repair/
sudo umount /mnt/repair
sudo dd if=/dev/zero of=/dev/sdd bs=1024 seek=1 count=1 conv=notrunc   # wipes the primary superblock
```

Task: `/dev/sdd` no longer mounts. Repair it without losing the copied `/etc`, then mount it on `/mnt/repair`.

Verify: `ls /mnt/repair/etc/hostname` exists.

<details><summary>Solution</summary>

```bash
sudo mount /dev/sdd /mnt/repair           # fails: bad superblock
sudo fsck.ext4 -fy /dev/sdd               # e2fsck finds and uses a backup superblock
# if it doesn't: sudo dumpe2fs /dev/sdd | grep -i superblock ; sudo e2fsck -b 32768 -y /dev/sdd
sudo mount /dev/sdd /mnt/repair
```

Reset afterwards with `sudo umount /mnt/repair && sudo wipefs -a /dev/sdd`. The storage labs need the disk empty.

</details>

## Lab 2.8: Journal and failed services

Host: `node02`. Target: 6 min.

1. Make the systemd journal persistent across reboots, limited to 100 MB.
2. Write all error-or-worse messages from the current boot to `/root/boot-errors.txt`.
3. Write the names of all failed units to `/root/failed.txt` (an empty file is fine if there are none).

Verify: `ls /var/log/journal/`, then `journalctl --list-boots` shows more than one boot after a reboot.

<details><summary>Solution</summary>

```bash
sudo mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nStorage=persistent\nSystemMaxUse=100M\n' | sudo tee /etc/systemd/journald.conf.d/lab.conf
sudo systemctl restart systemd-journald
journalctl -b -p err --no-pager | sudo tee /root/boot-errors.txt >/dev/null
systemctl --failed --no-legend --plain | awk '{print $1}' | sudo tee /root/failed.txt
```

</details>

## Lab 2.9: SELinux file contexts

Host: `rocky`. Target: 10 min.

1. Install `httpd`. Set `DocumentRoot` to `/srv/web` and allow it with a `<Directory /srv/web>` block containing `Require all granted`.
2. Create `/srv/web/index.html` containing `selinux ok`.
3. With SELinux enforcing, `curl localhost` must return `selinux ok`, and the label must survive `restorecon -R /` and a relabel.

Verify:

```bash
curl -s localhost                                  # selinux ok
sudo semanage fcontext -l | grep '/srv/web'
getenforce                                         # Enforcing
```

<details><summary>Solution</summary>

```bash
sudo dnf install -y httpd
sudo mkdir -p /srv/web && echo 'selinux ok' | sudo tee /srv/web/index.html
sudo sed -i 's|^DocumentRoot.*|DocumentRoot "/srv/web"|' /etc/httpd/conf/httpd.conf
printf '<Directory /srv/web>\n  Require all granted\n</Directory>\n' | sudo tee /etc/httpd/conf.d/web.conf
sudo semanage fcontext -a -t httpd_sys_content_t '/srv/web(/.*)?'
sudo restorecon -Rv /srv/web
sudo systemctl enable --now httpd
```

Before the fix, `curl` returns 403 and `sudo ausearch -m AVC -ts recent` shows `default_t` being denied.

</details>

## Lab 2.10: SELinux ports and booleans

Host: `rocky`. Target: 8 min.

1. Make `httpd` (from Lab 2.9) listen on TCP 8088 in addition to 80, with SELinux enforcing.
2. Allow httpd scripts and modules to make outbound network connections, persistently.
3. Write the SELinux type of the `sshd` process to `/root/sshd-type.txt`.

Verify:

```bash
curl -s localhost:8088
sudo semanage port -l | grep 8088
getsebool httpd_can_network_connect                # on
```

<details><summary>Solution</summary>

```bash
echo 'Listen 8088' | sudo tee /etc/httpd/conf.d/8088.conf
sudo semanage port -a -t http_port_t -p tcp 8088
sudo systemctl restart httpd
sudo setsebool -P httpd_can_network_connect on
ps -eZ | grep sshd | head -1 | awk -F: '{print $3}' | sudo tee /root/sshd-type.txt   # sshd_t
```

If firewalld blocks it from other hosts: `sudo firewall-cmd --permanent --add-port=8088/tcp && sudo firewall-cmd --reload`.

</details>

## Lab 2.11: Docker containers

Host: `node01`. Target: 10 min.

1. Install Docker from the Ubuntu repository (`docker.io`). Configure the engine to log to `journald`.
2. Create `/srv/site/index.html` containing `container ok`.
3. Run a container `site` from `nginx:alpine`. It publishes host port 8085 to container port 80, mounts `/srv/site` read-only as the web root, and comes back after a reboot unless it was stopped by hand.
4. Build an image `lab/hello:1.0` from a Dockerfile in `/srv/hello` that prints `hello lfcs` when run.

Verify:

```bash
curl -s localhost:8085                               # container ok
sudo docker inspect site --format '{{.HostConfig.RestartPolicy.Name}}'   # unless-stopped
sudo docker info --format '{{.LoggingDriver}}'       # journald
sudo docker run --rm lab/hello:1.0                   # hello lfcs
```

<details><summary>Solution</summary>

```bash
sudo apt install -y docker.io
echo '{ "log-driver": "journald" }' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker && sudo systemctl enable docker
sudo mkdir -p /srv/site && echo 'container ok' | sudo tee /srv/site/index.html
sudo docker run -d --name site -p 8085:80 -v /srv/site:/usr/share/nginx/html:ro --restart unless-stopped nginx:alpine
sudo mkdir -p /srv/hello && printf 'FROM alpine\nCMD ["echo", "hello lfcs"]\n' | sudo tee /srv/hello/Dockerfile
sudo docker build -t lab/hello:1.0 /srv/hello
```

</details>

## Lab 2.12: Podman with systemd

Host: `node02` (as `vagrant`). Target: 10 min.

1. Install `podman`. As user `vagrant` (rootless), run a container `web` from `docker.io/library/nginx:alpine` with host port 8086 published to container port 80.
2. Make it a user service `container-web.service` that starts at boot, even when nobody is logged in.

Verify: `systemctl --user is-enabled container-web` says `enabled`, and after a reboot, `curl -s localhost:8086 | grep -i nginx` works before you log in. Check it from base with `ssh node02 curl -s localhost:8086`.

<details><summary>Solution</summary>

```bash
sudo apt install -y podman
podman run -d --name web -p 8086:80 docker.io/library/nginx:alpine
mkdir -p ~/.config/systemd/user && cd ~/.config/systemd/user
podman generate systemd --new --files --name web
podman rm -f web
systemctl --user daemon-reload
systemctl --user enable --now container-web.service
sudo loginctl enable-linger vagrant
```

</details>

## Lab 2.13: libvirt VMs

Host: `node01` (needs nested virtualization; `egrep -c 'vmx|svm' /proc/cpuinfo` must be more than 0). Target: 15 min.

1. Install the libvirt stack and make sure the `default` network is active and autostarts.
2. Download a small cloud image: `sudo wget -O /var/lib/libvirt/images/cirros.qcow2 https://download.cirros-cloud.net/0.6.2/cirros-0.6.2-x86_64-disk.img`.
3. Create a VM `tiny` from that image: 256 MB RAM, 1 vCPU, attached to the `default` network, no graphics, no installer.
4. Set `tiny` to start when the host boots.
5. Change its persistent config to 2 vCPUs and 512 MB RAM, and restart it so the change takes effect.
6. Write the output of `virsh dominfo tiny` to `/root/tiny.txt`.

Verify: `sudo virsh dominfo tiny` shows `CPU(s): 2`, `Max memory: 524288 KiB` and `Autostart: enable`.

<details><summary>Solution</summary>

```bash
sudo apt install -y qemu-kvm libvirt-daemon-system libvirt-clients virtinst
sudo virsh net-start default 2>/dev/null; sudo virsh net-autostart default
sudo virt-install --name tiny --memory 256 --vcpus 1 \
  --disk /var/lib/libvirt/images/cirros.qcow2 --import \
  --os-variant generic --network network=default --graphics none --noautoconsole
sudo virsh autostart tiny
sudo virsh shutdown tiny ; sleep 10 ; sudo virsh destroy tiny 2>/dev/null
sudo virsh setvcpus tiny 2 --config --maximum && sudo virsh setvcpus tiny 2 --config
sudo virsh setmaxmem tiny 512M --config && sudo virsh setmem tiny 512M --config
sudo virsh start tiny
sudo virsh dominfo tiny | sudo tee /root/tiny.txt
```

</details>
