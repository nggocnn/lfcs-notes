# LFCS study plan

**Paused on 2026-11-02. Planned restart: after 2026-12-01.**

Six weeks at about 7 hours a week: revision, recall quizzes, hands-on labs, then timed mock exams. Exam facts were checked against the Linux Foundation pages on 2026-10-30.

## The exam

| Item         | Value                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| Format       | Online, proctored, performance-based tasks in a Linux terminal                                                        |
| Length       | 2 hours, 17-20 tasks                                                                                                  |
| Pass mark    | 67%                                                                                                                   |
| Retake       | One free retake                                                                                                       |
| Simulator    | Two killer.sh sessions with the exam purchase, 36 hours of access each, same questions every time                     |
| Distribution | Not named by the Linux Foundation ("distribution independent"). Community reports say Ubuntu 22.04                    |
| Allowed help | `man`, `--help`, `/usr/share/doc`, packages you install. Nothing outside the exam terminal                            |
| Environment  | You `ssh <node>` to the host named in each task, `sudo -i` for root, `exit` before the next host (no nested ssh)      |
| Don'ts       | Don't reboot `base`, don't block ports 8080, 4505 or 4506, don't press INSERT (use `i` in vim), Ctrl+W closes the tab |

Domains and weights (curriculum in force since 11 May 2023):

| Domain                | Weight | Notes                               | Quiz                                        | Labs                                     |
| --------------------- | -----: | ----------------------------------- | ------------------------------------------- | ---------------------------------------- |
| Operations Deployment |    25% | [02](./02-operations-deployment.md) | [02](./quizzes/02-operations-deployment.md) | [02](./labs/02-operations-deployment.md) |
| Networking            |    25% | [04](./04-networking.md)            | [04](./quizzes/04-networking.md)            | [04](./labs/04-networking.md)            |
| Storage               |    20% | [05](./05-storage.md)               | [05](./quizzes/05-storage.md)               | [05](./labs/05-storage.md)               |
| Essential Commands    |    20% | [01](./01-essential-commands.md)    | [01](./quizzes/01-essential-commands.md)    | [01](./labs/01-essential-commands.md)    |
| Users and Groups      |    10% | [03](./03-users-and-groups.md)      | [03](./quizzes/03-users-and-groups.md)      | [03](./labs/03-users-and-groups.md)      |

RAID and disk quotas were in older curricula and are no longer listed. They live in [99-extensions.md](./99-extensions.md) for later reading.

## Schedule

Each week has about 5 sessions of 80-90 minutes. Every session starts with 10 minutes of quiz recall on earlier domains (spaced repetition), then revision or labs. Tick the boxes as you go.

### Week 1: lab setup, Essential Commands, Users and Groups

- [ ] Build the lab ([labs/00-environment.md](./labs/00-environment.md)), take the `clean` snapshot, practise `ssh node01` / `sudo -i` / `exit` from `base`
- [ ] Revise notes 01 §1-13 and §28-33 (disk space, services, constraints, SSL, Git)
- [ ] Quiz 01, then Labs 1.1-1.5
- [ ] Labs 1.6-1.10
- [ ] Revise notes 03 (all, including §25 LDAP and §26 ACLs), quiz 03, Labs 3.1-3.7

### Week 2: Operations Deployment I

- [ ] Revise notes 02 §1-11 and §13-18 (boot, systemd, logs, cron/at, packages, processes, sysctl)
- [ ] Revise 02 §21 recovery, §22 packages and repositories, §26 kernel modules
- [ ] Quiz 02 Q1-29, re-quiz 01
- [ ] Labs 2.1-2.4, 2.8
- [ ] Labs 2.5-2.7 (console recovery; snapshot first)

### Week 3: Operations Deployment II

- [ ] Revise 02 §12, §19, §23 (SELinux) and Labs 2.9-2.10 on `rocky`
- [ ] Revise 02 §20, §24 (containers), Labs 2.11-2.12
- [ ] Revise 02 §25 (libvirt), Lab 2.13
- [ ] Quiz 02 Q30-45, re-quiz 03
- [ ] Redo any lab from weeks 1-3 that took more than its target time

### Week 4: Storage

- [ ] Revise 05 §1-9, §12-16 (partitions, swap, filesystems, fstab, NFS, LVM basics)
- [ ] Revise 05 §19-23 (LVM resize, troubleshooting, automount, VFS, NBD/iSCSI) and §11, §17-18 (performance)
- [ ] Quiz 05, Labs 5.1-5.4
- [ ] Labs 5.5-5.10
- [ ] Re-quiz 02 (all)

### Week 5: Networking, then mock 1

- [ ] Revise 04 §1-8, §14-18 (addressing, netplan, routes, resolution, bonds/bridges, firewalling, NAT)
- [ ] Revise 04 §9-13, §19-21 (proxy/LB, time, SSH, chrony, troubleshooting), quiz 04
- [ ] Labs 4.1-4.6
- [ ] Labs 4.7-4.12
- [ ] **Mock 1** ([mock/mock-1.md](./mock/mock-1.md)): 2 hours, graded. Log every failed task in "Misses"

### Week 6: exam readiness

- [ ] Redo the labs behind each mock 1 miss, re-quiz the weakest domain
- [ ] **Mock 2**, graded, log misses
- [ ] **killer.sh session 1**: do it timed, then use the rest of the 36 hours to study its solutions
- [ ] **Mock 3**, graded. Book the exam if mocks 2 and 3 are both at 80% or more
- [ ] **killer.sh session 2**, two days before the exam. Re-read the [exam instructions](https://docs.linuxfoundation.org/tc-docs/certification/instructions-lfcs-and-lfce)

## How to run the practice

**Quizzes**: answer out loud or on paper before opening the answer. A question counts as known only when you can type the command without looking. Log misses below and repeat them two days later.

**Labs**: restore the snapshot, work only from `man` and `--help`, and stay within the target time. Afterwards, reboot the node and verify again, because persistence is where most points are lost.

**Mocks**:

- Restore `clean`, run `setup-mock-N.sh` on `base`, then set a 2-hour timer.
- Skip any task after 8 minutes and come back to it at the end.
- Grade with `check-mock-N.sh`. Each task is worth the same, all or nothing. The real exam gives partial credit and weights tasks differently, so treat the score as a lower bound.
- Aim for 80% or more, which leaves a margin over the 67% pass mark.

| Run         | Date | Score | Weakest domain |
| ----------- | ---- | ----- | -------------- |
| Mock 1      |      |       |                |
| Mock 2      |      |       |                |
| killer.sh 1 |      |       |                |
| Mock 3      |      |       |                |
| killer.sh 2 |      |       |                |

## Misses

Log every quiz question, lab or mock task you got wrong, with the fix in one line. Re-test after 2 days and after 7 days.

| Date | Source (e.g. Q02-17, Lab 4.8, M1-T16) | What went wrong | Fix | Retest 2d | Retest 7d |
| ---- | ------------------------------------- | --------------- | --- | --------- | --------- |
|      |                                       |                 |     |           |           |

## Coverage: curriculum to material

Every competency on the [official curriculum](https://training.linuxfoundation.org/certification/linux-foundation-certified-sysadmin-lfcs/) maps to at least one notes section, quiz question and lab.

| Domain     | Competency                                                     | Notes                   | Quiz                | Labs          | Mocks                        |
| ---------- | -------------------------------------------------------------- | ----------------------- | ------------------- | ------------- | ---------------------------- |
| Ops        | Configure kernel parameters, persistent and non-persistent     | 02 §11, §18, §26        | 02 Q9-12            | 2.1           | M1-5, M2-9                   |
| Ops        | Diagnose, manage and troubleshoot processes and services       | 02 §4, §5, §8, §9, §17  | 02 Q13-18           | 2.8, 1.7      | M2-3, M3-3                   |
| Ops        | Manage or schedule jobs                                        | 02 §6, §13, §14         | 02 Q19-23           | 2.2           | M1-6, M2-5, M3-8             |
| Ops        | Install, validate and maintain packages and repositories       | 02 §7, §22              | 02 Q24-29           | 2.3, 2.4      | M1-9, M3-6                   |
| Ops        | Recover from hardware, OS or filesystem failures               | 02 §1, §2, §16, §21     | 02 Q1-8             | 2.5, 2.6, 2.7 | M3-5                         |
| Ops        | Manage virtual machines (libvirt)                              | 02 §25                  | 02 Q41-45           | 2.13          | M2-7                         |
| Ops        | Configure container engines, create and manage containers      | 02 §20, §24             | 02 Q36-40           | 2.11, 2.12    | M1-8, M2-6, M3-7             |
| Ops        | Create and enforce MAC using SELinux                           | 02 §12, §19, §23        | 02 Q30-35           | 2.9, 2.10     | M1-7, M2-8, M3-9             |
| Networking | Configure IPv4 and IPv6 networking and hostname resolution     | 04 §1, §2, §5, §14, §16 | 04 Q1-6, Q11-13     | 4.1, 4.3      | M1-13, M2-16, M3-14          |
| Networking | Set and synchronize system time using time servers             | 04 §10, §13, §20        | 04 Q34-36           | 4.10          | M1-17, M3-16                 |
| Networking | Monitor and troubleshoot networking                            | 04 §2, §3, §21          | 04 Q37-38           | 4.12          | (labs only)                  |
| Networking | Configure the OpenSSH server and client                        | 04 §19                  | 04 Q27-33           | 4.6           | M1-15, M2-14                 |
| Networking | Configure packet filtering, port redirection and NAT           | 04 §7, §8, §18          | 04 Q18-26           | 4.7, 4.8, 4.9 | M1-16, M2-15, M3-15          |
| Networking | Configure static routing                                       | 04 §15                  | 04 Q7-10            | 4.2           | M1-14                        |
| Networking | Configure bridge and bonding devices                           | 04 §6, §17              | 04 Q14-17           | 4.4, 4.5      | M2-13, M3-13                 |
| Networking | Implement reverse proxies and load balancers                   | 04 §9, §11, §12         | 04 Q39-40           | 4.11          | M2-17, M3-17                 |
| Storage    | Configure and manage LVM storage                               | 05 §9, §19              | 05 Q14-20           | 5.3, 5.4      | M1-18, M2-18, M3-18          |
| Storage    | Manage and configure the virtual file system                   | 05 §22                  | 05 Q28-31           | 5.8           | M2-20                        |
| Storage    | Create, manage and troubleshoot filesystems                    | 05 §3-6, §13-15, §20    | 05 Q1-2, Q5-10, Q21 | 5.2, 2.7      | M2-20, M3-5                  |
| Storage    | Use remote filesystems and network block devices               | 05 §7, §8, §16, §23     | 05 Q11-13, Q32-34   | 5.5, 5.9      | M1-20                        |
| Storage    | Configure and manage swap space                                | 05 §2, §12              | 05 Q3-4             | 5.1           | M1-19, M3-20                 |
| Storage    | Configure filesystem automounters                              | 05 §21                  | 05 Q23-27           | 5.6, 5.7      | M2-19, M3-19                 |
| Storage    | Monitor storage performance                                    | 05 §11, §17, §18        | 05 Q35-36           | 5.10          | (labs only)                  |
| Essential  | Basic Git operations                                           | 01 §13, §33             | 01 Q33-35           | 1.9           | M2-2                         |
| Essential  | Create, configure and troubleshoot services                    | 01 §29                  | 01 Q22-24           | 1.6, 1.7      | M1-4, M2-3                   |
| Essential  | Monitor and troubleshoot system performance and services       | 01 §31, 02 §9, §15      | 01 Q28              | 1.10          | M2-1                         |
| Essential  | Determine application and service specific constraints         | 01 §30                  | 01 Q25-27           | 1.6           | M1-4, M3-3                   |
| Essential  | Troubleshoot disk space issues                                 | 01 §28                  | 01 Q18-21           | 1.5           | M2-1                         |
| Essential  | Work with SSL certificates                                     | 01 §12, §32             | 01 Q29-32           | 1.8           | M1-3, M2-4                   |
| Essential  | (core skills used in every task: find, grep, tar, permissions) | 01 §1-11, §15-27        | 01 Q1-17            | 1.1-1.4       | M1-1, M1-2, M3-1, M3-2, M3-4 |
| Users      | Create and manage local user and group accounts                | 03 §1-6, §10-17, §23-24 | 03 Q1-14, Q21-26    | 3.1, 3.2, 3.3 | M1-10, M1-11, M3-10, M3-11   |
| Users      | Manage personal and system-wide environment profiles           | 03 §7, §8, §18-21       | 03 Q15-18           | 3.4           | M2-11                        |
| Users      | Configure user resource limits                                 | 03 §9, §22              | 03 Q19-20           | 3.5           | M2-12                        |
| Users      | Configure and manage ACLs                                      | 03 §26, 05 §10          | 03 Q32-34           | 3.6           | M1-12, M3-12                 |
| Users      | Configure the system to use LDAP user and group accounts       | 03 §25                  | 03 Q27-31           | 3.7           | M2-10                        |

## Free resources

These were checked on 2026-10-30. They are all free unless noted otherwise.

- [LFCS curriculum and exam page](https://training.linuxfoundation.org/certification/linux-foundation-certified-sysadmin-lfcs/): the source of truth for domains and weights. Check it again before booking, because the curriculum can change.
- [LFCS exam instructions](https://docs.linuxfoundation.org/tc-docs/certification/instructions-lfcs-and-lfce): the terminal, ssh rules, allowed resources and the pass mark.
- [LFS101 Introduction to Linux](https://training.linuxfoundation.org/training/introduction-to-linux/): a free Linux Foundation course (60 hours, 90 days of access). Use chapters 7-16 and 18 only as a refresher if Essential Commands feels shaky.
- [KubeDojo LFCS path](https://kube-dojo.github.io/k8s/lfcs/): free, with a domain map, study order and a full mock exam module. Use it as an extra mock in week 6.
- [LabEx LFCS](https://labex.io/learn/lfcs): browser labs and two 20-task practice exams. The page doesn't state its pricing, so treat it as optional.
- killer.sh: comes with the exam purchase. It is harder than the real exam, so don't be discouraged by the score.
- Offline: `man -k <word>`, `apropos`, `/usr/share/doc/<pkg>/examples`, `man 5 fstab`, `man 5 exports`, `man 5 auto.master`, `man 5 sshd_config`, `man 5 crontab`, `man netplan`, `man nft`, `man iptables-extensions`, `man sssd-ldap`. These are the only help you get in the exam, so practise finding things in them.

Third-party guides list six domains or different weights. They describe the pre-2023 exam and are out of date.

## Exam-day checklist

- [ ] Read each task to the end, and note host, names, paths, owner, mode and "persistent"
- [ ] `ssh` to the right node first. `sudo -i`. `exit` before moving on
- [ ] After each config change, run the validator: `nginx -t`, `sshd -t`, `visudo -c`, `findmnt --verify`, `netplan try`, `nft -c -f`
- [ ] After each persistent change, prove it without rebooting: `systemctl is-enabled`, `mount -a`, `sysctl --system`, `swapon -a`
- [ ] Flag and skip any task after about 8 minutes. Come back with the time left
- [ ] Never reboot `base`. Never firewall ports 8080, 4505 or 4506
