# Quiz: Storage (20%)

Answer from memory first, then open the answer. Mark each miss in the "Misses" list in [PLAN.md](../PLAN.md) and redo it two days later. Notes: [05-storage.md](../05-storage.md).

**Q1.** Show all block devices with filesystem type, label and UUID.

<details><summary>Answer</summary>

`lsblk -f` (or `blkid`).

</details>

**Q2.** Create a GPT partition table and one 1 GiB partition on `/dev/sdb` non-interactively.

<details><summary>Answer</summary>

`sudo parted -s /dev/sdb mklabel gpt mkpart data 1MiB 1025MiB`, or interactively with `fdisk`/`gdisk`/`cfdisk`.

</details>

**Q3.** Create a 512 MiB swap file `/swapfile`, enable it, and make it persistent.

<details><summary>Answer</summary>

`sudo fallocate -l 512M /swapfile` (or `dd`), `chmod 600`, `mkswap`, `swapon /swapfile`, and add `/swapfile none swap defaults 0 0` to fstab. Check with `swapon --show`.

</details>

**Q4.** Turn a partition `/dev/sdc2` into swap with priority 10, persistently.

<details><summary>Answer</summary>

`sudo mkswap /dev/sdc2` and the fstab line `UUID=<uuid> none swap defaults,pri=10 0 0`, then `swapon -a`.

</details>

**Q5.** Format `/dev/sdb1` as XFS with label `logs`.

<details><summary>Answer</summary>

`sudo mkfs.xfs -L logs /dev/sdb1`

</details>

**Q6.** What are the six fstab fields?

<details><summary>Answer</summary>

Device (UUID=, LABEL=, path), mount point, type, options, dump (0) and fsck pass (0, 1 for root, 2 for others).

</details>

**Q7.** How do you test a new fstab entry safely, without rebooting?

<details><summary>Answer</summary>

`sudo findmnt --verify` and `sudo mount -a`. Then check with `findmnt /mnt/point`.

</details>

**Q8.** Why prefer `UUID=` over `/dev/sdb1` in fstab?

<details><summary>Answer</summary>

Device names can change between boots when disks are added or reordered. The UUID belongs to the filesystem and stays the same.

</details>

**Q9.** Mount `/dev/sdb1` on `/data` read-only, with no executables and no setuid, persistently.

<details><summary>Answer</summary>

Use the options `ro,noexec,nosuid` in fstab, then `mount -a` (or `mount -o remount /data` if it is already mounted).

</details>

**Q10.** Show only mounted XFS and ext4 filesystems.

<details><summary>Answer</summary>

`findmnt -t xfs,ext4`

</details>

**Q11.** Export `/srv/share` read-write to 192.168.56.0/24 and read-only to everyone else.

<details><summary>Answer</summary>

In `/etc/exports`: `/srv/share 192.168.56.0/24(rw,sync,no_subtree_check) *(ro)`. Then `sudo exportfs -ra`, and check with `exportfs -v`.

</details>

**Q12.** What does `no_root_squash` do and why is it risky?

<details><summary>Answer</summary>

Root on the client stays root on the share. Normally root is mapped to `nobody`. With this option, any client root can write files as root on the server.

</details>

**Q13.** Mount `node01:/srv/share` on `/mnt/share` persistently, without blocking boot if node01 is down.

<details><summary>Answer</summary>

fstab: `node01:/srv/share /mnt/share nfs defaults,_netdev,nofail 0 0`. The client needs the `nfs-common` package.

</details>

**Q14.** Create PV, VG `vgdata` and a 1 GiB LV `lvapp` from `/dev/sdb` and `/dev/sdc`.

<details><summary>Answer</summary>

`sudo pvcreate /dev/sdb /dev/sdc`, `sudo vgcreate vgdata /dev/sdb /dev/sdc`, `sudo lvcreate -L 1G -n lvapp vgdata`

</details>

**Q15.** Create an LV using all remaining free space in `vgdata`.

<details><summary>Answer</summary>

`sudo lvcreate -l 100%FREE -n lvrest vgdata`

</details>

**Q16.** Grow `vgdata/lvapp` by 500 MiB together with its filesystem, in one command.

<details><summary>Answer</summary>

`sudo lvextend -r -L +500M vgdata/lvapp`

</details>

**Q17.** Grow an XFS filesystem after the LV was extended without `-r`. And ext4?

<details><summary>Answer</summary>

XFS: `sudo xfs_growfs /mountpoint`. ext4: `sudo resize2fs /dev/vgdata/lvapp`.

</details>

**Q18.** Can you shrink XFS? How do you shrink ext4 on LVM?

<details><summary>Answer</summary>

XFS can't be shrunk. For ext4, unmount it, then `sudo lvreduce -r -L <size> vg/lv`.

</details>

**Q19.** Remove `/dev/sdb` from `vgdata` while keeping the data.

<details><summary>Answer</summary>

`sudo pvmove /dev/sdb`, `sudo vgreduce vgdata /dev/sdb`, then optionally `sudo pvremove /dev/sdb`. The VG needs enough free space on the other PVs.

</details>

**Q20.** Which command shows on which PVs an LV lives?

<details><summary>Answer</summary>

`sudo lvs -o +devices`

</details>

**Q21.** `umount /data` says "target is busy". How do you find the cause?

<details><summary>Answer</summary>

`sudo lsof +f -- /data` or `sudo fuser -vm /data`. Also check whether your own shell is inside `/data`.

</details>

**Q22.** Grant `bob` read access to `/srv/projects` and all files in it, including future ones.

<details><summary>Answer</summary>

`setfacl -R -m u:bob:rX /srv/projects` and `setfacl -R -m d:u:bob:rX /srv/projects`

</details>

**Q23.** Configure autofs so that `/mnt/nfs/share` mounts `node01:/srv/share` on access.

<details><summary>Answer</summary>

In `/etc/auto.master`: `/mnt/nfs /etc/auto.nfs --timeout=60`. In `/etc/auto.nfs`: `share -rw node01:/srv/share`. Then `systemctl enable --now autofs` (restart it after edits).

</details>

**Q24.** What does `* -rw node01:/home/&` mean in an autofs map?

<details><summary>Answer</summary>

A wildcard key: any name accessed under the parent directory mounts `node01:/home/<that name>`. `&` repeats the key.

</details>

**Q25.** How do you configure an autofs direct map?

<details><summary>Answer</summary>

Put `/- /etc/auto.direct` in `auto.master`. The map holds lines with absolute paths, such as `/data/share -rw node01:/srv/share`.

</details>

**Q26.** Make `/mnt/share` an NFS automount using only fstab and systemd.

<details><summary>Answer</summary>

Use the options `noauto,x-systemd.automount,x-systemd.idle-timeout=60,_netdev`, then `systemctl daemon-reload` and `systemctl restart remote-fs.target`.

</details>

**Q27.** For a hand-written systemd automount of `/srv/backup`, what must the unit files be called, and which one do you enable?

<details><summary>Answer</summary>

`srv-backup.mount` and `srv-backup.automount`, the escaped path. Enable the `.automount`.

</details>

**Q28.** Mount a 200 MiB tmpfs on `/mnt/scratch` persistently.

<details><summary>Answer</summary>

fstab: `tmpfs /mnt/scratch tmpfs size=200M 0 0`

</details>

**Q29.** Make `/srv/data` also appear at `/var/www/data`, persistently.

<details><summary>Answer</summary>

Bind mount. fstab: `/srv/data /var/www/data none bind 0 0`. Runtime: `mount --bind /srv/data /var/www/data`.

</details>

**Q30.** What are `/proc/sys` and `/sys/block/sda/queue/scheduler`?

<details><summary>Answer</summary>

`/proc/sys` is the tree of kernel parameters behind `sysctl`. `/sys/block/.../scheduler` is a sysfs file that shows and sets the I/O scheduler of that disk. Writes there are runtime-only.

</details>

**Q31.** Attach a file `disk.img` as a block device and show which loop device it got.

<details><summary>Answer</summary>

`sudo losetup -fP --show disk.img`. List with `losetup -a`. Detach with `losetup -d /dev/loopN`.

</details>

**Q32.** Export `/srv/nbd.img` with nbd-server and attach it on the client as `/dev/nbd0`.

<details><summary>Answer</summary>

Server: add a `[disk1]` section with `exportname = /srv/nbd.img` to `/etc/nbd-server/config` and restart `nbd-server`. Client: `modprobe nbd` then `nbd-client node01 -N disk1 /dev/nbd0`.

</details>

**Q33.** Make an NBD device reconnect and mount at boot.

<details><summary>Answer</summary>

Add `nbd0 node01 disk1` to `/etc/nbdtab`, load the module via `/etc/modules-load.d/nbd.conf`, and add an fstab entry with `_netdev,nofail`.

</details>

**Q34.** Discover and log in to an iSCSI target at 192.168.56.11.

<details><summary>Answer</summary>

`iscsiadm -m discovery -t sendtargets -p 192.168.56.11` then `iscsiadm -m node -T <iqn> -p 192.168.56.11 --login`.

</details>

**Q35.** Which tool shows per-device throughput and utilisation every 2 seconds?

<details><summary>Answer</summary>

`iostat -dxh 2` (package `sysstat`). Look at `%util`, `r/s`, `w/s` and `await`.

</details>

**Q36.** Which tool shows which process does the most disk I/O?

<details><summary>Answer</summary>

`pidstat -d 2` (or `iotop`).

</details>
