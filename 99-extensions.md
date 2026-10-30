# Extensions: topics outside the current curriculum

These topics were in older LFCS curricula or in the course material, but they are not in the competency list published by the Linux Foundation for the current exam. Read them once the five domains are solid. They are not part of the quizzes, labs or mocks.

## 1. RAID with mdadm

Linux can manage software RAID entirely without special hardware using `mdadm`.

Example RAID 1 creation:

```bash
$ sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/vdb /dev/vdc
mdadm: array /dev/md0 started.
```

Why RAID matters:

- RAID 1 mirrors data for redundancy
- Linux can manage software RAID without special hardware

Inspect an array:

```bash
$ cat /proc/mdstat
$ sudo mdadm --detail /dev/md0
```

Make the array assemble with the same name at boot:

```bash
$ sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf   # /etc/mdadm.conf on RHEL
$ sudo update-initramfs -u                                         # dracut -f on RHEL
```

Replace a failed member:

```bash
$ sudo mdadm --manage /dev/md0 --fail /dev/vdb --remove /dev/vdb
$ sudo mdadm --manage /dev/md0 --add /dev/vdd
$ watch cat /proc/mdstat          # rebuild progress
```

Stop and wipe an array:

```bash
$ sudo mdadm --stop /dev/md0
$ sudo mdadm --zero-superblock /dev/vdb /dev/vdc
```

## 2. Disk quotas

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

XFS quotas only work if the filesystem is mounted with `uquota` (users) or `gquota` (groups) in `/etc/fstab`:

```bash
/dev/vdb1  /home  xfs  defaults,uquota  0 0
$ sudo xfs_quota -x -c 'report -h' /home
```

On ext4, use the `quota` package instead:

```bash
# fstab options: defaults,usrquota,grpquota
$ sudo mount -o remount /home
$ sudo quotacheck -cugm /home
$ sudo quotaon /home
$ sudo setquota -u john 100M 500M 0 0 /home
$ sudo repquota -s /home
```
