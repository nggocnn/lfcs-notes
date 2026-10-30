# Quiz: Operations Deployment (25%)

Answer from memory first, then open the answer. Mark each miss in the "Misses" list in [PLAN.md](../PLAN.md) and redo it two days later. Notes: [02-operations-deployment.md](../02-operations-deployment.md).

**Q1.** Reboot now, and schedule a reboot at 02:00 with a message. How do you cancel the scheduled one?

<details><summary>Answer</summary>

`sudo systemctl reboot`. `sudo shutdown -r 02:00 'Kernel update'`. Cancel with `sudo shutdown -c`.

</details>

**Q2.** Show the default boot target and change it to text mode permanently.

<details><summary>Answer</summary>

`systemctl get-default`, then `sudo systemctl set-default multi-user.target`.

</details>

**Q3.** Switch the running system to rescue mode without rebooting.

<details><summary>Answer</summary>

`sudo systemctl isolate rescue.target`

</details>

**Q4.** At the GRUB menu, what do you add to the `linux` line to boot into emergency mode? What about when root has no password (Ubuntu)?

<details><summary>Answer</summary>

`systemd.unit=emergency.target`. Without a root password use `init=/bin/bash`, then `mount -o remount,rw /`. Press Ctrl+X to boot the edited entry.

</details>

**Q5.** Reset a forgotten root password on Rocky Linux. Which extra step is needed because of SELinux?

<details><summary>Answer</summary>

Add `rd.break` to the kernel line, then `mount -o remount,rw /sysroot`, `chroot /sysroot`, `passwd root`, `touch /.autorelabel`, and exit twice. Without the relabel, the new `/etc/shadow` has the wrong label and logins fail.

</details>

**Q6.** The system drops to emergency mode because of a bad `/etc/fstab` line. List the fix steps.

<details><summary>Answer</summary>

Log in, run `mount -o remount,rw /`, fix or comment out the line in `/etc/fstab`, run `systemctl daemon-reload` and `mount -a` (it must succeed), then reboot. Add `nofail` to non-critical mounts.

</details>

**Q7.** Check an ext4 filesystem on `/dev/sdb1` and repair it automatically. What must be true first?

<details><summary>Answer</summary>

It must be unmounted. Then `sudo fsck.ext4 -fy /dev/sdb1`. For XFS use `sudo xfs_repair /dev/sdb1`.

</details>

**Q8.** Regenerate the GRUB config on Ubuntu and on Rocky (BIOS).

<details><summary>Answer</summary>

Ubuntu: `sudo update-grub`. Rocky: `sudo grub2-mkconfig -o /boot/grub2/grub.cfg`.

</details>

**Q9.** Set `vm.swappiness` to 10 now and at every boot.

<details><summary>Answer</summary>

`echo 'vm.swappiness = 10' | sudo tee /etc/sysctl.d/90-swappiness.conf` then `sudo sysctl --system` (or `sudo sysctl -p /etc/sysctl.d/90-swappiness.conf`). Check with `sysctl vm.swappiness`.

</details>

**Q10.** What is the difference between `sysctl -w` and a file in `/etc/sysctl.d/`?

<details><summary>Answer</summary>

`-w` changes the running kernel only and is lost at reboot. Files in `/etc/sysctl.d/` are applied at every boot, and `sysctl --system` applies them now.

</details>

**Q11.** Load the `nbd` module now and at every boot.

<details><summary>Answer</summary>

`sudo modprobe nbd` and `echo nbd | sudo tee /etc/modules-load.d/nbd.conf`

</details>

**Q12.** Where do you add a permanent kernel command-line option on Ubuntu, and how do you see the current command line?

<details><summary>Answer</summary>

Add it to `GRUB_CMDLINE_LINUX_DEFAULT` in `/etc/default/grub`, then run `sudo update-grub`. See the current one with `cat /proc/cmdline`. On Rocky use `grubby --update-kernel=ALL --args=...`.

</details>

**Q13.** Find the three processes using the most memory.

<details><summary>Answer</summary>

`ps aux --sort=-%mem | head -4`, or `top` and press `M`.

</details>

**Q14.** Lower the priority of the running PID 2345 to nice 10, and start `backup.sh` at nice 15.

<details><summary>Answer</summary>

`sudo renice 10 -p 2345` and `nice -n 15 ./backup.sh`

</details>

**Q15.** Kill all processes named `stress` with SIGKILL.

<details><summary>Answer</summary>

`sudo pkill -9 stress` or `sudo killall -9 stress`

</details>

**Q16.** Which process is listening on TCP port 8080?

<details><summary>Answer</summary>

`sudo ss -tlnp 'sport = :8080'`, `sudo ss -tlnp | grep :8080`, or `sudo lsof -i :8080`.

</details>

**Q17.** Show log entries for `nginx` since boot with priority error or worse.

<details><summary>Answer</summary>

`journalctl -u nginx -b -p err`

</details>

**Q18.** Make the journal persistent across reboots.

<details><summary>Answer</summary>

`sudo mkdir -p /var/log/journal` and/or set `Storage=persistent` in `/etc/systemd/journald.conf`, then `sudo systemctl restart systemd-journald`.

</details>

**Q19.** Write a crontab entry for user `alice` that runs `/home/alice/sync.sh` at 23:30 Monday to Friday.

<details><summary>Answer</summary>

`sudo crontab -u alice -e` and add `30 23 * * 1-5 /home/alice/sync.sh`.

</details>

**Q20.** What is the difference between a user crontab line and a line in `/etc/crontab`?

<details><summary>Answer</summary>

`/etc/crontab` and `/etc/cron.d/*` lines have an extra user field after the five time fields.

</details>

**Q21.** Run `/root/cleanup.sh` once at 16:00 tomorrow. How do you list and remove pending jobs?

<details><summary>Answer</summary>

`echo /root/cleanup.sh | at 16:00 tomorrow`. List with `atq`. Remove with `atrm <job>`.

</details>

**Q22.** What does anacron add over cron?

<details><summary>Answer</summary>

It runs daily, weekly and monthly jobs that were missed while the machine was off. Jobs are configured in `/etc/anacrontab`.

</details>

**Q23.** Create a systemd timer alternative: which two unit files are needed and what do you enable?

<details><summary>Answer</summary>

`name.service` (what to run) and `name.timer` (with `OnCalendar=`, for example `*-*-* 03:00:00`). Enable the timer: `systemctl enable --now name.timer`. List timers with `systemctl list-timers`.

</details>

**Q24.** Prevent `nginx` from being upgraded by apt, then allow it again.

<details><summary>Answer</summary>

`sudo apt-mark hold nginx` and `sudo apt-mark unhold nginx`

</details>

**Q25.** Which installed package owns `/usr/bin/ss`, on Ubuntu and on Rocky?

<details><summary>Answer</summary>

Ubuntu: `dpkg -S /usr/bin/ss`. Rocky: `rpm -qf /usr/bin/ss`.

</details>

**Q26.** Verify that no files of the `openssh-server` package have been modified.

<details><summary>Answer</summary>

Ubuntu: `dpkg -V openssh-server` (no output means clean). Rocky: `rpm -V openssh-server`.

</details>

**Q27.** Add a third-party apt repository securely. Where do the key and the source line go?

<details><summary>Answer</summary>

Put the key in `/etc/apt/keyrings/x.gpg` (dearmored), and the source line in `/etc/apt/sources.list.d/x.list` as `deb [signed-by=/etc/apt/keyrings/x.gpg] URL suite component`. Then `apt update`.

</details>

**Q28.** Add a yum/dnf repository by hand on Rocky.

<details><summary>Answer</summary>

Create `/etc/yum.repos.d/name.repo` with `[id]`, `name=`, `baseurl=`, `enabled=1` and `gpgcheck=`. Check with `dnf repolist`.

</details>

**Q29.** Undo the last dnf transaction.

<details><summary>Answer</summary>

`sudo dnf history` to find the ID, then `sudo dnf history undo <ID>`.

</details>

**Q30.** Set SELinux to enforcing at runtime and persistently.

<details><summary>Answer</summary>

`sudo setenforce 1`, and set `SELINUX=enforcing` in `/etc/selinux/config`.

</details>

**Q31.** Apache must serve `/srv/web` on Rocky with SELinux enforcing. Make the label persistent.

<details><summary>Answer</summary>

`sudo semanage fcontext -a -t httpd_sys_content_t "/srv/web(/.*)?"` then `sudo restorecon -Rv /srv/web`.

</details>

**Q32.** Why is `chcon` not enough for a permanent fix?

<details><summary>Answer</summary>

`chcon` only changes the current label. A `restorecon` or a full relabel resets it to the policy, and only `semanage fcontext` changes the policy.

</details>

**Q33.** Allow httpd to listen on TCP 8081 under SELinux.

<details><summary>Answer</summary>

`sudo semanage port -a -t http_port_t -p tcp 8081`. Use `-m` if the port is already defined with another type.

</details>

**Q34.** Allow httpd to make outbound network connections, persistently.

<details><summary>Answer</summary>

`sudo setsebool -P httpd_can_network_connect on`

</details>

**Q35.** Where do you look for SELinux denials and how do you get an explanation?

<details><summary>Answer</summary>

`sudo ausearch -m AVC -ts recent`. Pipe it to `audit2why` for an explanation, or use `sealert`/`journalctl -t setroubleshoot`.

</details>

**Q36.** Run an nginx container named `web`, publishing host 8080 to container 80, restarting unless stopped.

<details><summary>Answer</summary>

`sudo docker run -d --name web -p 8080:80 --restart unless-stopped nginx`

</details>

**Q37.** Mount host directory `/srv/html` read-only into that container's `/usr/share/nginx/html`.

<details><summary>Answer</summary>

Add `-v /srv/html:/usr/share/nginx/html:ro` to `docker run`. You can't add a volume to an existing container, so recreate it.

</details>

**Q38.** Show the logs of container `web` and open a shell inside it.

<details><summary>Answer</summary>

`sudo docker logs web` (`-f` to follow) and `sudo docker exec -it web sh`.

</details>

**Q39.** How do you make a rootless Podman container start at boot?

<details><summary>Answer</summary>

Generate a unit with `podman generate systemd --new --files --name web` (or write a Quadlet `.container` file), put it in `~/.config/systemd/user/`, run `systemctl --user enable --now`, then `loginctl enable-linger <user>`.

</details>

**Q40.** Where is the Docker daemon configured, and what must you do after changing it?

<details><summary>Answer</summary>

In `/etc/docker/daemon.json`. Then run `sudo systemctl restart docker`.

</details>

**Q41.** List all libvirt VMs including stopped ones, and make `vm1` start with the host.

<details><summary>Answer</summary>

`sudo virsh list --all` and `sudo virsh autostart vm1`

</details>

**Q42.** What is the difference between `virsh shutdown` and `virsh destroy`?

<details><summary>Answer</summary>

`shutdown` asks the guest to power off cleanly through ACPI. `destroy` pulls the power immediately. Neither deletes the VM. `undefine` does.

</details>

**Q43.** Give `vm1` 2 vCPUs and 2 GiB RAM in its persistent config.

<details><summary>Answer</summary>

`virsh setvcpus vm1 2 --config --maximum` then `virsh setvcpus vm1 2 --config`, and `virsh setmaxmem vm1 2G --config` then `virsh setmem vm1 2G --config`. Changes take effect at the next boot. You can also use `virsh edit vm1`.

</details>

**Q44.** Create a VM `vm2` from an existing qcow2 image without running an installer.

<details><summary>Answer</summary>

`sudo virt-install --name vm2 --memory 1024 --vcpus 1 --disk /var/lib/libvirt/images/vm2.qcow2 --import --os-variant generic --network network=default --graphics none --noautoconsole`

</details>

**Q45.** Delete VM `vm2` together with its disk.

<details><summary>Answer</summary>

`sudo virsh destroy vm2` (if it's running) then `sudo virsh undefine vm2 --remove-all-storage`.

</details>
