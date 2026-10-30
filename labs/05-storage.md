# Labs: Storage (20%)

Notes: [05-storage.md](../05-storage.md). Disks: node01 has `sdb`, `sdc`, `sdd`; node02 has `sdb`, `sdc`; rocky has `sdb`, each 2 GB. Check with `lsblk` first. To reset a disk: `sudo umount` everything on it, remove its fstab lines, run `sudo wipefs -a /dev/sdX`.

## Lab 5.1: Partitions and swap

Host: `node02`. Target: 10 min.

1. On `/dev/sdb`, create a GPT label with two partitions: `sdb1` of 512 MiB and `sdb2` using the rest.
2. Make `sdb1` a swap partition that is active at boot, by UUID, with priority 5.
3. Also create a 256 MiB swap file `/swapfile2` that is active at boot.

Verify: `swapon --show` lists both, and after a reboot `free -h` shows about 768 MiB more swap.

<details><summary>Solution</summary>

```bash
sudo parted -s /dev/sdb mklabel gpt mkpart swap1 linux-swap 1MiB 513MiB mkpart data 513MiB 100%
sudo mkswap /dev/sdb1
echo "UUID=$(sudo blkid -s UUID -o value /dev/sdb1) none swap defaults,pri=5 0 0" | sudo tee -a /etc/fstab
sudo fallocate -l 256M /swapfile2 && sudo chmod 600 /swapfile2 && sudo mkswap /swapfile2
echo '/swapfile2 none swap defaults 0 0' | sudo tee -a /etc/fstab
sudo swapon -a
```

</details>

## Lab 5.2: Filesystems, fstab and mount options

Host: `node02`. Target: 10 min.

1. Format `/dev/sdb2` as ext4 with label `appdata`, and `/dev/sdc` as XFS.
2. Mount `appdata` on `/srv/app` by label, with `noexec,nosuid`. Mount the XFS disk on `/srv/logs` by UUID, with `noatime`. Both persistent.
3. Reserve only 1% of `appdata` for root.

Verify:

```bash
findmnt /srv/app /srv/logs -o TARGET,SOURCE,FSTYPE,OPTIONS
sudo findmnt --verify
sudo tune2fs -l /dev/sdb2 | grep 'Reserved block count'
```

<details><summary>Solution</summary>

```bash
sudo mkfs.ext4 -L appdata /dev/sdb2 && sudo mkfs.xfs -f /dev/sdc
sudo mkdir -p /srv/app /srv/logs
echo 'LABEL=appdata /srv/app ext4 defaults,noexec,nosuid 0 2' | sudo tee -a /etc/fstab
echo "UUID=$(sudo blkid -s UUID -o value /dev/sdc) /srv/logs xfs defaults,noatime 0 0" | sudo tee -a /etc/fstab
sudo systemctl daemon-reload && sudo mount -a
sudo tune2fs -m 1 /dev/sdb2
```

</details>

## Lab 5.3: LVM

Host: `node01`. Target: 10 min.

1. Create volume group `vgdata` from `/dev/sdb` and `/dev/sdc`.
2. Create LV `lvweb` of 1 GiB (XFS, mounted on `/srv/web`) and LV `lvdb` using 50% of the remaining free space (ext4, mounted on `/srv/db`). Both persistent.

Verify: `sudo lvs vgdata` and `df -h /srv/web /srv/db`.

<details><summary>Solution</summary>

```bash
sudo pvcreate /dev/sdb /dev/sdc
sudo vgcreate vgdata /dev/sdb /dev/sdc
sudo lvcreate -L 1G -n lvweb vgdata
sudo lvcreate -l 50%FREE -n lvdb vgdata
sudo mkfs.xfs /dev/vgdata/lvweb && sudo mkfs.ext4 /dev/vgdata/lvdb
sudo mkdir -p /srv/web /srv/db
echo '/dev/vgdata/lvweb /srv/web xfs defaults 0 0' | sudo tee -a /etc/fstab
echo '/dev/vgdata/lvdb /srv/db ext4 defaults 0 2' | sudo tee -a /etc/fstab
sudo systemctl daemon-reload && sudo mount -a
```

</details>

## Lab 5.4: Resize and migrate LVM

Host: `node01` (after 5.3). Target: 10 min.

1. Grow `lvweb` by 500 MiB and its filesystem, online.
2. Grow `lvdb` to use all free space in the VG.
3. Add `/dev/sdd` to `vgdata`, then move all data off `/dev/sdb` and remove `/dev/sdb` from the VG. The data in `/srv/web` must stay intact.

Verify: `sudo pvs` shows `sdb` without a VG, `df -h /srv/web` shows about 1.5 G, and test files you created before are still there.

<details><summary>Solution</summary>

```bash
echo test | sudo tee /srv/web/keep.txt
sudo lvextend -r -L +500M vgdata/lvweb
sudo lvextend -r -l +100%FREE vgdata/lvdb
sudo vgextend vgdata /dev/sdd
```

`pvmove` needs free space equal to what is on `sdb`. Step 2 used all free space, so `sdd` (2 GB) must be big enough for everything on `sdb`. Check `sudo pvs` first.

```bash
sudo pvmove /dev/sdb
sudo vgreduce vgdata /dev/sdb && sudo pvremove /dev/sdb
cat /srv/web/keep.txt
```

</details>

## Lab 5.5: NFS

Hosts: `node01` (server), `node02` (client). Target: 12 min.

1. On node01, export `/srv/share` read-write to `node02` only, and `/srv/pub` read-only to `192.168.56.0/24`. Root on clients must stay squashed.
2. On node02, mount `node01:/srv/share` on `/mnt/share` persistently. It must not block boot when node01 is down.

Verify:

```bash
# node01
sudo exportfs -v
# node02
showmount -e node01
touch /mnt/share/x 2>&1     # as vagrant: permission depends on directory mode; try sudo chmod 1777 /srv/share on node01
findmnt /mnt/share
```

<details><summary>Solution</summary>

```bash
# node01
sudo apt install -y nfs-kernel-server
sudo mkdir -p /srv/share /srv/pub && sudo chmod 1777 /srv/share
printf '/srv/share node02(rw,sync,no_subtree_check)\n/srv/pub 192.168.56.0/24(ro,sync,no_subtree_check)\n' | sudo tee -a /etc/exports
sudo exportfs -ra
# node02
sudo apt install -y nfs-common
sudo mkdir -p /mnt/share
echo 'node01:/srv/share /mnt/share nfs defaults,_netdev,nofail 0 0' | sudo tee -a /etc/fstab
sudo systemctl daemon-reload && sudo mount -a
```

</details>

## Lab 5.6: autofs

Host: `node02` (after 5.5; remove the `/mnt/share` fstab line and unmount it first). Target: 12 min.

1. Accessing `/nfs/share` mounts `node01:/srv/share` read-write, and `/nfs/pub` mounts `node01:/srv/pub` read-only. They unmount after 30 s idle.
2. On node01, create `/srv/homes/jdoe` and `/srv/homes/asmith` and export `/srv/homes` to node02. On node02, `/rhome/<name>` must automount `node01:/srv/homes/<name>` for any name.

Verify:

```bash
ls /nfs                      # empty before access
ls /nfs/share ; findmnt /nfs/share
ls /rhome/jdoe ; findmnt /rhome/jdoe
sleep 40 ; findmnt /nfs/share   # gone
```

<details><summary>Solution</summary>

```bash
# node01
sudo mkdir -p /srv/homes/{jdoe,asmith}
echo '/srv/homes node02(rw,sync,no_subtree_check)' | sudo tee -a /etc/exports && sudo exportfs -ra
# node02
sudo apt install -y autofs
printf '/nfs   /etc/auto.nfs   --timeout=30\n/rhome /etc/auto.rhome --timeout=30\n' | sudo tee -a /etc/auto.master
printf 'share -rw node01:/srv/share\npub   -ro node01:/srv/pub\n' | sudo tee /etc/auto.nfs
echo '* -rw node01:/srv/homes/&' | sudo tee /etc/auto.rhome
sudo systemctl enable autofs && sudo systemctl restart autofs
```

</details>

## Lab 5.7: systemd automount

Host: `node02`. Target: 8 min.

Without autofs, make `/mnt/pub` mount `node01:/srv/pub` read-only on first access and unmount after 60 s idle. Do it with fstab only.

Verify: `systemctl status mnt-pub.automount` is active, `ls /mnt/pub` works, and then `findmnt /mnt/pub` shows nfs.

<details><summary>Solution</summary>

```bash
sudo mkdir -p /mnt/pub
echo 'node01:/srv/pub /mnt/pub nfs ro,noauto,x-systemd.automount,x-systemd.idle-timeout=60,_netdev 0 0' | sudo tee -a /etc/fstab
sudo systemctl daemon-reload
sudo systemctl restart remote-fs.target
```

</details>

## Lab 5.8: Virtual filesystems

Host: `node02`. Target: 8 min.

1. Mount a 128 MiB tmpfs on `/mnt/ram` with mode 1777, persistently.
2. Make `/srv/app` (from 5.2) also available read-only at `/var/www/app`, persistently.
3. Create a 300 MiB image file `/root/vault.img`, put an ext4 filesystem on it, and mount it on `/mnt/vault` through a loop device, persistently.
4. Write the current I/O scheduler of `sda` to `/root/scheduler.txt`.

Verify: `findmnt /mnt/ram /var/www/app /mnt/vault` (the `/var/www/app` line must show `ro`), and `touch /var/www/app/x` fails. Check again after a reboot.

<details><summary>Solution</summary>

```bash
sudo mkdir -p /mnt/ram /var/www/app /mnt/vault
echo 'tmpfs /mnt/ram tmpfs size=128M,mode=1777 0 0' | sudo tee -a /etc/fstab
echo '/srv/app /var/www/app none bind,ro 0 0' | sudo tee -a /etc/fstab
sudo truncate -s 300M /root/vault.img && sudo mkfs.ext4 -q /root/vault.img
echo '/root/vault.img /mnt/vault ext4 loop 0 0' | sudo tee -a /etc/fstab
sudo systemctl daemon-reload && sudo mount -a
grep -o '\[.*\]' /sys/block/sda/queue/scheduler | tr -d '[]' | sudo tee /root/scheduler.txt
```

A `bind,ro` line in fstab gives a read-only bind mount on current util-linux. On older systems you need a second `remount,ro` step.

</details>

## Lab 5.9: Network block device

Hosts: `node01` (server), `node02` (client). Target: 12 min.

1. On node01, export a 512 MiB image file `/srv/nbd/disk1.img` with nbd-server under the name `disk1`.
2. On node02, attach it as `/dev/nbd0`, create an XFS filesystem, and mount it on `/mnt/nbd`. It must reconnect and mount at boot.

Verify (node02): `lsblk /dev/nbd0`, `findmnt /mnt/nbd`, and the same after a reboot.

<details><summary>Solution</summary>

```bash
# node01
sudo apt install -y nbd-server
sudo mkdir -p /srv/nbd && sudo truncate -s 512M /srv/nbd/disk1.img && sudo chown -R nbd:nbd /srv/nbd
sudo tee /etc/nbd-server/config <<'X'
[generic]
    user = nbd
    group = nbd
    allowlist = true
[disk1]
    exportname = /srv/nbd/disk1.img
X
sudo systemctl restart nbd-server
# node02
sudo apt install -y nbd-client
echo nbd | sudo tee /etc/modules-load.d/nbd.conf && sudo modprobe nbd
echo 'nbd0 node01 disk1' | sudo tee -a /etc/nbdtab
sudo nbd-client node01 -N disk1 /dev/nbd0
sudo mkfs.xfs /dev/nbd0 && sudo mkdir -p /mnt/nbd
echo '/dev/nbd0 /mnt/nbd xfs _netdev,nofail 0 0' | sudo tee -a /etc/fstab
sudo systemctl daemon-reload && sudo mount -a
systemctl list-unit-files 'nbd*'      # see which boot unit your nbd-client version ships
```

The boot unit differs by version. Older packages ship an `nbd-client` init script that connects everything in `/etc/nbdtab`. Newer ones ship a template, `nbd@.service`, which you enable per device with `sudo systemctl enable nbd@nbd0`. After a reboot, if the mount runs before the device is connected, add `x-systemd.requires=<that unit>` to the fstab options.

</details>

## Lab 5.10: Storage performance

Host: `node01`. Target: 6 min.

Setup: `sudo apt install -y sysstat stress-ng && (sudo stress-ng --hdd 1 --hdd-bytes 300M --temp-path /srv/web --timeout 900 &)`

1. Write the name of the busiest block device (highest `%util`) to `/root/busy-dev.txt`.
2. Write the PID of the process doing the most writes to `/root/io-pid.txt`.
3. Stop the I/O load completely.

Verify: `pgrep -a stress-ng` is empty and `iostat -dx 2 2` shows the device idle.

<details><summary>Solution</summary>

```bash
iostat -dx 2 2                    # look at the second report, %util column
echo dm-0 | sudo tee /root/busy-dev.txt   # whatever device is busiest; LVs show as dm-N
pidstat -d 2 2                    # kB_wr/s column
echo <PID> | sudo tee /root/io-pid.txt
sudo pkill stress-ng               # killing only the worker PID lets the parent start a new one
```

`ls -l /dev/mapper` or `lsblk` maps `dm-N` to an LV name.

</details>
