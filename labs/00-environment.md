# Lab environment

The labs and mock exams assume four VMs that copy the shape of the real exam. You work from a jump host called `base` and reach each task's host with `ssh <node>`.

| VM       | OS            | IP            | RAM    | Extra disks            | Used for                                 |
| -------- | ------------- | ------------- | ------ | ---------------------- | ---------------------------------------- |
| `base`   | Ubuntu 22.04  | 192.168.56.10 | 512 MB | none                   | jump host, mock graders                  |
| `node01` | Ubuntu 22.04  | 192.168.56.11 | 2 GB   | 3 x 2 GB               | most tasks, LVM, NFS/NBD server, libvirt |
| `node02` | Ubuntu 22.04  | 192.168.56.12 | 1 GB   | 2 x 2 GB, 2 spare NICs | clients, bond/bridge, routing, firewall  |
| `rocky`  | Rocky Linux 9 | 192.168.56.13 | 1.5 GB | 1 x 2 GB               | SELinux, dnf, firewalld                  |

The Linux Foundation does not name the exam distribution. Community reports say Ubuntu 22.04, so most practice happens on Ubuntu, and `rocky` covers the RHEL-family tools.

## Requirements

- VirtualBox 7.x and Vagrant 2.3 or newer, on the same OS. On Windows, run both from Windows (PowerShell), not from WSL, and keep the repo on a Windows drive. VirtualBox cannot share folders from the WSL filesystem.
- About 5 GB of free RAM and 20 GB of disk.
- If Hyper-V or WSL2 is enabled, VirtualBox runs more slowly and nested virtualization (needed for the libvirt labs on `node01`) may not work. Use a Linux host or your homelab for those labs if needed.

## Start the lab

```bash
cd labs
export VAGRANT_EXPERIMENTAL="disks"        # PowerShell: $env:VAGRANT_EXPERIMENTAL="disks"
vagrant up                                  # first run downloads the boxes
vagrant ssh base
```

From `base`, connect to the other VMs exactly as in the exam:

```bash
ssh node01
sudo -i
exit        # back to base before the next host; nested ssh is not supported in the exam
```

Every VM shares one lab key, so `ssh` between them works without passwords. The repo is mounted at `/lfcs` on every VM, so labs and graders are available at `/lfcs/labs` and `/lfcs/mock`.

Check that the extra disks exist:

```bash
ssh node01 lsblk          # expect sdb, sdc, sdd of 2G each
```

## Snapshots: reset between labs

Take a clean snapshot once, right after the first `vagrant up`:

```bash
vagrant snapshot save clean
```

Before each lab block or mock exam, return to it:

```bash
vagrant snapshot restore clean            # all VMs
vagrant snapshot restore node01 clean     # one VM
```

## Practice rules

- Use only `man`, `--help`, `apropos` and `/usr/share/doc`, just like in the exam. Don't search the web during a lab.
- Every change must survive a reboot unless the task says "runtime only". After a lab, run `sudo reboot` on the node, then check again.
- Read the whole task before typing. Exam tasks often hide a detail in the last sentence, such as the owner, the mode, or "persistent".
- Device names in the labs (`/dev/sdb`, `enp0s9`) can differ on your VMs. Check them with `lsblk` and `ip -br link` first.

## Without Vagrant

Any four VMs work if they match the table: same hostnames, `/etc/hosts` entries, a passwordless SSH key from `base` to the other three with `sudo` rights, and spare disks on `node01`, `node02` and `rocky`. Clone or copy the repo to `/lfcs` on each VM.
