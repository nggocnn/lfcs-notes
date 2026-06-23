# Storage

This section covers swap, partitions, filesystems, mounting, mount options, `/etc/fstab`, NFS, remote block devices, LVM, RAID, ACLs, quotas, and storage monitoring.

## 1. Block devices and partitions

The storage workflow starts by identifying disks and partitions.

Useful commands:

- `lsblk`
- `fdisk`
- `cfdisk`

Example:

```bash
$ lsblk
NAME   MAJ:MIN RM SIZE RO TYPE MOUNTPOINTS
vda    252:0    0  40G  0 disk
├─vda1 252:1    0   1G  0 part /boot
└─vda2 252:2    0  39G  0 part /
vdb    252:16   0  20G  0 disk
└─vdb3 252:19   0   2G  0 part
```

Partitioning tools:

```bash
$ sudo fdisk /dev/vdb
$ sudo cfdisk /dev/vdb
```

## 2. Swap partitions and swap files

Swap extends usable memory by moving less-active pages out of RAM.

Check active swap:

```bash
$ swapon --show
NAME      TYPE SIZE USED PRIO
/dev/vdb3 partition 2G   0B   -2
```

Create and enable swap on a partition:

```bash
$ sudo mkswap /dev/vdb3
Setting up swapspace version 1, size = 2 GiB

$ sudo swapon -v /dev/vdb3
swapon /dev/vdb3
```

Disable it:

```bash
$ sudo swapoff /dev/vdb3
```

Create swap file:

```bash
$ sudo dd if=/dev/zero of=/swap bs=1M count=128 status=progress
134217728 bytes (134 MB, 128 MiB) copied

$ sudo chmod 600 /swap
$ sudo mkswap /swap
$ sudo swapon -v /swap
```

## 3. Creating filesystems

The course covers common filesystems such as XFS and ext4.

Examples:

```bash
$ sudo mkfs.xfs -L "DataDisk" /dev/vdb
meta-data=/dev/vdb               isize=512    agcount=4 ...
```

```bash
$ sudo mkfs.ext4 -N 2048 /dev/vdc
mke2fs 1.47.0
Creating filesystem with 2048 inodes
```

Change labels:

```bash
$ sudo xfs_admin -L "SwapFS" /dev/vdb
writing all SBs
new label = "SwapFS"
```

## 4. Mounting and unmounting filesystems

Mounting makes a filesystem accessible through a directory.

Manual mount:

```bash
$ sudo mount /dev/vdb1 /mnt
$ ls -l /mnt
total 0
```

Unmount:

```bash
$ sudo umount /mnt
```

Confirm mounted state:

```bash
$ lsblk
$ findmnt /dev/vdb1
```

## 5. Persistent mounts with /etc/fstab

`/etc/fstab` defines mounts that should happen automatically at boot.

A typical fstab line:

```text
/dev/vdb1 /mybackups xfs defaults 0 2
```

Meaning of the six fields:

1. source device
2. mount point
3. filesystem type
4. mount options
5. dump backup flag
6. fsck order

Reload systemd after editing:

```bash
$ sudo systemctl daemon-reload
```

## 6. Mount options

Mount options fall into two categories: general (filesystem-independent) and filesystem-specific.

Common filesystem-independent options:

- `ro` read-only
- `rw` read-write
- `noexec` do not execute binaries from that mount
- `nosuid` ignore SUID bits
- `remount` change options on a mounted filesystem

Examples:

```bash
$ sudo mount -o ro /dev/vdb2 /mnt
$ sudo touch /mnt/testfile
touch: cannot touch '/mnt/testfile': Read-only file system
```

```bash
$ sudo mount -o ro,noexec,nosuid /dev/vdb2 /mnt
$ findmnt /dev/vdb2
TARGET SOURCE    FSTYPE OPTIONS
/mnt   /dev/vdb2 ext4   ro,noexec,nosuid,...
```

Remount with new options:

```bash
$ sudo mount -o remount,rw,noexec,nosuid /dev/vdb2 /mnt
```

In `fstab`, custom options replace `defaults`:

```text
/dev/vdb1 /mybackups xfs ro,noexec 0 2
```

## 7. NFS remote filesystems

NFS is the primary Linux-to-Linux remote filesystem mechanism.

### NFS server side

Install server package:

```bash
$ sudo apt install nfs-kernel-server
```

Define exports in `/etc/exports`:

```text
/etc 127.0.0.1(ro)
```

Re-export config:

```bash
$ sudo exportfs -r
$ sudo exportfs -v
/etc           127.0.0.1(ro,sync,wdelay,hide,no_subtree_check,...)
```

Important export options:

- `rw`
- `ro`
- `sync`
- `async`
- `no_subtree_check`
- `no_root_squash`

### NFS client side

Install client tools:

```bash
$ sudo apt install nfs-common
```

Mount remote share:

```bash
$ sudo mount 127.0.0.1:/etc /mnt
$ ls /mnt | head
adduser.conf
apt
bash.bashrc
```

Persistent NFS mount:

```text
127.0.0.1:/etc /mnt nfs defaults 0 0
```

## 8. Remote block devices

Network block devices are worth understanding at a conceptual level.

Key idea:

- local block devices look like `/dev/vda`, `/dev/vdb`
- remote block devices can be attached locally as `/dev/nbd0`
- applications then treat the remote disk like a local block device

This matters because some workflows need block-level access, not just file sharing.

## 9. LVM: physical volumes, volume groups, logical volumes

LVM is one of the most important storage topics on the LFCS exam.

LVM layers:

- PV: physical volume
- VG: volume group
- LV: logical volume

Examples:

```bash
$ sudo pvcreate /dev/vdb /dev/vdc
  Physical volume "/dev/vdb" successfully created.
  Physical volume "/dev/vdc" successfully created.

$ pvs
PV         VG Fmt  Attr PSize  PFree
/dev/vdb      lvm2 ---  20.00g 20.00g
/dev/vdc      lvm2 ---  20.00g 20.00g
```

Create and extend a volume group:

```bash
$ sudo vgcreate volume1 /dev/vdb
$ sudo vgextend volume1 /dev/vdc
$ vgs
VG      #PV #LV #SN Attr   VSize  VFree
volume1   2   0   0 wz--n- 39.99g 39.99g
```

Create and resize a logical volume:

```bash
$ sudo lvcreate -L 512M -n smalldata volume1
$ sudo lvresize --size 752M volume1/smalldata
```

Format and remove LV:

```bash
$ sudo mkfs.xfs /dev/volume1/smalldata
$ sudo lvremove volume1/smalldata
```

## 10. RAID with mdadm

Linux can manage software RAID entirely without special hardware using `mdadm`.

Example RAID 1 creation:

```bash
$ sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/vdb /dev/vdc
mdadm: array /dev/md0 started.
```

Why RAID matters:

- RAID 1 mirrors data for redundancy
- Linux can manage software RAID without special hardware

## 11. Access Control Lists (ACLs)

ACLs extend normal owner/group/other permissions.

Inspect ACLs:

```bash
$ getfacl archive
# file: archive
# owner: alice
# group: alice
user::rw-
group::r--
other::---
```

Grant ACLs:

```bash
$ sudo setfacl --modify user:john:rw specialfile
$ sudo setfacl --modify group:mail:rx specialfile
```

Remove ACL entry:

```bash
$ sudo setfacl --remove user:john specialfile
```

Recursive ACL update:

```bash
$ sudo setfacl --recursive --modify user:john:rwx collection/
```

## 12. Disk quotas

The storage materials include quota management through `xfs_quota`.

Example:

```bash
$ sudo xfs_quota -x -c 'limit bsoft=100m bhard=500m john' /dev/vda1
```

Meaning:

- `bsoft=100m` soft block limit
- `bhard=500m` hard block limit
- applies to user `john`

Quotas matter when multiple users share the same filesystem and one user must not consume all space.

## 13. Monitoring storage performance

`iostat` and `pidstat` from the `sysstat` package are the main tools for storage performance monitoring.

Install tools:

```bash
$ sudo apt install sysstat
```

Disk summary:

```bash
$ iostat
Device            tps    kB_read/s    kB_wrtn/s
vda              3.22        42.10        18.05
vdb              0.91         1.12        64.33
```

What the main fields mean:

- `tps`: transfers per second
- `kB_read/s`: read throughput
- `kB_wrtn/s`: write throughput

This helps answer two different questions:

- which device is busy?
- which process is causing the load?

## 14. Swap in /etc/fstab

A swap partition needs its own fstab entry to be activated automatically at boot. The format differs slightly from a normal mount: the mount-point field is `none` (swap is not mounted into any directory) and the filesystem type is `swap`. Both the dump and fsck fields are `0` because swap does not need to be backed up or checked for errors.

```text
/dev/vdb3 none swap defaults 0 0
```

After adding the line, confirm it survives a reboot:

```bash
$ swapon --show
NAME      TYPE      SIZE USED PRIO
/dev/vdb3 partition   2G   0B   -2
```

## 15. UUID-based device names in fstab

Device names like `/dev/vda` or `/dev/sda` are assigned in the order Linux sees storage devices at boot. Swapping cable order on a real server can change which device gets which name, causing the wrong thing to be mounted. UUIDs are burned into the filesystem and never change regardless of cable order.

Find the UUID of a partition:

```bash
$ sudo blkid /dev/vdb1
/dev/vdb1: LABEL="FirstFS" UUID="a51d7731-b033-4c07-b171-628ae951ea01" \
  BLOCK_SIZE="512" TYPE="xfs" PARTUUID="21b2fb38-0cb9-104b-bd17-a60362e5aacd"
```

List all UUID symlinks to see which UUID maps to which device:

```bash
$ ls -l /dev/disk/by-uuid/
a51d7731-b033-4c07-b171-628ae951ea01 -> ../../vdb1
ec83bbc6-458e-490c-9188-2d5cc97a0e20 -> ../../vda2
```

Use the UUID as the first field in fstab instead of the device path:

```text
UUID=9ab8cfa5-2813-4b70-ada0-7abd0ad9d289 /mybackups xfs defaults 0 2
```

Or use the longer `/dev/disk/by-uuid/` path form — both work identically:

```text
/dev/disk/by-uuid/9ab8cfa5-2813-4b70-ada0-7abd0ad9d289 /mybackups xfs defaults 0 2
```

## 16. Filtering mounted filesystems with findmnt -t

`findmnt` with no arguments prints everything including virtual pseudo-filesystems (`proc`, `tmpfs`, `devtmpfs`), which makes the output hard to scan. The `-t` flag limits output to specific filesystem types:

```bash
$ findmnt -t xfs,ext4
TARGET      SOURCE                              FSTYPE OPTIONS
/           /dev/mapper/ubuntu--vg-ubuntu--lv   ext4   rw,relatime,seclabel
├─/boot     /dev/vda2                           ext4   rw,relatime,seclabel
└─/mybackups /dev/vdb1                          xfs    rw,relatime,seclabel,attr2,inode64
```

Only currently-mounted filesystems appear — partitions that exist but are not yet mounted are invisible to `findmnt`.

## 17. Filesystem-specific mount options

Mount options fall into two categories:

- **Filesystem-independent** — documented in `man mount`; work on almost any filesystem (`ro`, `rw`, `noexec`, `nosuid`, `remount`, `async`, `atime`, etc.)
- **Filesystem-specific** — documented in the manual for that filesystem (`man xfs`, `man ext4`); only apply to one type

For XFS, `man xfs` lists options like `allocsize=N` which sets the buffered I/O end-of-file pre-allocation size:

```bash
$ sudo umount /dev/vdb1
$ sudo mount -o allocsize=32K /dev/vdb1 /mybackups
```

Important caveat: `mount -o remount` is safe for filesystem-independent options but may silently fail for filesystem-specific options. For filesystem-specific options, unmount and remount cleanly.

For ext4, use `man ext4` to see the equivalent options section.

## 18. NFS export syntax: multi-host, wildcards, CIDR

The `/etc/exports` format allows a single directory to be shared with multiple clients on the same line, each with different options:

```text
/srv/homes  hostname1(rw,sync,no_subtree_check) hostname2(ro,sync,no_subtree_check)
```

Client identifiers can be:

- hostname: `server1.example.com`
- IP address: `10.0.0.9`
- CIDR range: `10.0.16.0/24` (any host from 10.0.16.1 to 10.0.16.255)
- wildcard hostname: `*.example.com` (matches `server1.example.com`, `mail.example.com`, etc.)
- any client: `*` alone with no spaces before the opening parenthesis

```text
/etc  *.example.com(ro,sync,no_subtree_check)
/etc  *(ro,sync,no_subtree_check)
```

There must be no space between the client field and the opening parenthesis. A space would be misinterpreted.

What the main export options mean:

| Option | Meaning |
|---|---|
| `rw` | clients can read and write |
| `ro` | clients can only read |
| `sync` | NFS waits for data to reach storage before confirming the write |
| `async` | NFS confirms writes immediately; faster but risks data loss on crash |
| `no_subtree_check` | disables subtree checking; recommended default, avoids rename/move issues |
| `no_root_squash` | root on the client keeps root privileges on the share; by default root is mapped to `nobody` |

After editing `/etc/exports`, reload with `exportfs -r` and inspect the active shares:

```bash
$ sudo exportfs -r
$ sudo exportfs -v
/etc  127.0.0.1(sync,wdelay,hide,no_subtree_check,sec=sys,ro,secure,root_squash,no_all_squash)
```

The verbose output shows defaults the NFS server adds even when not explicitly set. Full option reference: `man exports`.

## 19. pidstat — finding which process is stressing storage

`iostat` shows which device is busy but not which process caused it. `pidstat` from the same `sysstat` package fills that gap. It shows I/O statistics broken down by process ID.

```bash
$ pidstat -d 1
Linux 5.15.0-76-generic   07/18/2023

10:42:01  UID  PID   kB_rd/s  kB_wr/s  kB_ccwr/s  iodelay  Command
10:42:02  0    1234  0.00     512.00   0.00        0        mysqld
10:42:02  1000 2891  128.00   0.00     0.00        0        rsync
```

The `-d` flag selects disk I/O. The interval argument (`1`) updates every second, making it useful for watching a live problem rather than seeing the boot-time average that plain `iostat` shows.

Fields:

- `kB_rd/s` — kilobytes read per second by this process
- `kB_wr/s` — kilobytes written per second
- `kB_ccwr/s` — kilobytes whose write was cancelled (written to page cache then truncated)
- `iodelay` — I/O delay the process accumulated after it finished (in clock ticks)

Workflow: use `iostat` to spot which device has high `tps` or `kB_wrtn/s`, then use `pidstat -d` to identify which PID is responsible.

## 20. Reading iostat output accurately

Plain `iostat` reports **averages since boot**, not current activity. If writes stopped five minutes ago, the numbers still look significant because they are divided across the full uptime.

```bash
$ iostat
Linux 5.15.0-76-generic  07/18/2023

avg-cpu:  %user  %nice  %system  %iowait  %steal  %idle
           0.47   0.00     1.09     4.17    0.03   94.24

Device   tps    kB_read/s  kB_wrtn/s  kB_dscd/s  kB_read   kB_wrtn  kB_dscd
vda    155.28     535.50     600.66       0.00    265686    298016        0
dm-0   197.23     517.01     600.42       0.00    256513    297900        0
```

Column meanings:

- `tps` — transfers per second (averaged since boot); high tps means the device receives many small requests
- `kB_read/s`, `kB_wrtn/s` — throughput averaged since boot
- `kB_read`, `kB_wrtn` — **running totals** since boot (not averages); these are exact

The CPU row adds `%iowait`: the percentage of time the CPU was idle while waiting for I/O to complete. Elevated `%iowait` alongside high device `tps` or throughput points to storage being the bottleneck.

A storage device can be stressed in two distinct ways:
1. Very frequent small operations — shows as high `tps`
2. Large data volumes — shows as high `kB_read/s` or `kB_wrtn/s`

Note: `iostat` numbers can be inflated for very small transfers because the device may report a full block updated even when the process only changed 1 KB.

## 21. What to practice for LFCS

Prioritize these storage tasks:

- inspect disks and partitions with `lsblk`
- create and enable swap partitions or files
- write fstab entries for swap (`none` mount point, type `swap`, `0 0`)
- build XFS/ext4 filesystems
- mount and unmount filesystems correctly
- write valid `fstab` entries using both device paths and UUIDs (`blkid`, `/dev/disk/by-uuid/`)
- filter mounted filesystems with `findmnt -t`
- apply secure mount options such as `ro`, `noexec`, and `nosuid`
- distinguish filesystem-independent from filesystem-specific options (`man xfs`, `man ext4`)
- export and mount NFS shares with hostname, IP, CIDR, and wildcard client specs
- understand all export options: `sync`/`async`, `no_subtree_check`, `no_root_squash`
- understand NBD conceptually
- create basic LVM and RAID layouts
- manage ACLs and quotas
- spot device-level pressure with `iostat` (tps, throughput, `%iowait`)
- identify the responsible process with `pidstat -d`
