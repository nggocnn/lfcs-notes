# Labs: Essential Commands (20%)

Read [00-environment.md](./00-environment.md) first. Each lab has a host, a time target, the task as the exam would phrase it, a way to verify, and a hidden solution. Try it without opening the solution. Notes: [01-essential-commands.md](../01-essential-commands.md).

## Lab 1.1: Find and archive

Host: `node01`. Target: 8 min.

1. Find every regular file under `/usr/share/doc` larger than 20 KB that was modified more than 30 days ago. Save the list of absolute paths, one per line, to `/root/bigdocs.txt`.
2. Create a bzip2-compressed archive `/root/docs.tar.bz2` that contains `/usr/share/doc/bash` and `/usr/share/doc/git`.
3. Extract only the `bash` directory from that archive into `/opt/restore`.

Verify:

```bash
sudo head -3 /root/bigdocs.txt                 # absolute paths
sudo tar -tjf /root/docs.tar.bz2 | head -3     # usr/share/doc/...
ls /opt/restore/usr/share/doc/bash
```

<details><summary>Solution</summary>

```bash
sudo find /usr/share/doc -type f -size +20k -mtime +30 > /tmp/b && sudo mv /tmp/b /root/bigdocs.txt
sudo tar -cjf /root/docs.tar.bz2 /usr/share/doc/bash /usr/share/doc/git
sudo mkdir -p /opt/restore
sudo tar -xjf /root/docs.tar.bz2 -C /opt/restore usr/share/doc/bash
```

</details>

## Lab 1.2: Permissions, special bits and links

Host: `node01`. Target: 8 min.

1. Create group `projects` and directory `/srv/projects`, owned by `root:projects`.
2. Members of `projects` must be able to create files there. New files must inherit the group `projects`, and users must not delete each other's files. Others get no access.
3. Create a symbolic link `/root/proj` to `/srv/projects` and a hard link `/root/hosts.hard` to `/etc/hosts`.

Verify:

```bash
stat -c '%A %U:%G' /srv/projects      # drwxrws--T root:projects
readlink /root/proj                   # /srv/projects
stat -c %i /etc/hosts /root/hosts.hard   # same inode twice
```

<details><summary>Solution</summary>

```bash
sudo groupadd projects
sudo mkdir /srv/projects && sudo chown root:projects /srv/projects
sudo chmod 3770 /srv/projects         # setgid (2) + sticky (1), rwx for owner and group
sudo ln -s /srv/projects /root/proj
sudo ln /etc/hosts /root/hosts.hard
```

</details>

## Lab 1.3: Text processing

Host: `node01`. Target: 8 min.

1. Write the usernames of all accounts whose login shell is `/bin/bash`, sorted alphabetically, to `/root/bash-users.txt`.
2. Write all active (non-comment, non-blank) lines of `/etc/ssh/sshd_config` to `/root/sshd-active.txt`.
3. Copy `/etc/services` to `/root/services`. In the copy, replace every `tcp` with `TCP`, then save the number of lines containing `TCP` to `/root/tcp-count.txt`.

Verify:

```bash
sudo cat /root/bash-users.txt          # root, vagrant, ...
sudo grep -c '^#' /root/sshd-active.txt   # 0
sudo cat /root/tcp-count.txt
```

<details><summary>Solution</summary>

```bash
awk -F: '$7=="/bin/bash"{print $1}' /etc/passwd | sort | sudo tee /root/bash-users.txt
grep -Ev '^\s*(#|$)' /etc/ssh/sshd_config | sudo tee /root/sshd-active.txt
sudo cp /etc/services /root/services
sudo sed -i 's/tcp/TCP/g' /root/services
grep -c TCP /root/services | sudo tee /root/tcp-count.txt
```

</details>

## Lab 1.4: Redirection

Host: `node01`. Target: 5 min.

Run `find /etc -name '*.conf'` as the `vagrant` user. Save the normal output to `/tmp/conf-found.txt` and the error messages to `/tmp/conf-errors.txt`. Then append the current date to `/tmp/conf-found.txt`.

Verify: `grep -c 'Permission denied' /tmp/conf-errors.txt` is more than 0, and `tail -1 /tmp/conf-found.txt` shows the date.

<details><summary>Solution</summary>

```bash
find /etc -name '*.conf' > /tmp/conf-found.txt 2> /tmp/conf-errors.txt
date >> /tmp/conf-found.txt
```

</details>

## Lab 1.5: Disk full

Host: `node01`. Target: 10 min.

Setup (run as given; it simulates a runaway log):

```bash
sudo mkdir -p /var/log/runaway
sudo fallocate -l 300M /var/log/runaway/huge.log
sudo bash -c 'exec 3>/var/log/runaway/held.log; fallocate -l 200M /var/log/runaway/held.log; rm /var/log/runaway/held.log; sleep 3600' &
```

Task:

1. Find the largest directory under `/var` and write its path to `/root/largest-var.txt`.
2. A deleted file is still using about 200 MB. Find the process holding it, write its PID to `/root/holder.pid`, and free the space without deleting anything else under `/var/log`.

Verify: `df -h /` shows about 200 MB more free space than before step 2, and `sudo lsof +L1 | grep held` returns nothing.

<details><summary>Solution</summary>

```bash
sudo du -xh --max-depth=2 /var 2>/dev/null | sort -h | tail -3
echo /var/log/runaway | sudo tee /root/largest-var.txt
sudo lsof +L1 | grep held.log         # note PID and FD
echo <PID> | sudo tee /root/holder.pid
sudo kill <PID>                       # or: sudo truncate -s 0 /proc/<PID>/fd/3
```

</details>

## Lab 1.6: Write a service

Host: `node01`. Target: 12 min.

1. Create the script `/usr/local/bin/heartbeat.sh`. It writes the line `alive <date>` to `/var/log/heartbeat.log` every 10 seconds in an endless loop.
2. Create the system user `heartbeat` (no login shell). It must own `/var/log/heartbeat.log`.
3. Create `heartbeat.service`. It runs the script as user `heartbeat`, restarts on failure after 5 seconds, and starts at boot.
4. Limit the service to 50 MB of memory and 10% CPU.

Verify:

```bash
systemctl is-enabled heartbeat; systemctl is-active heartbeat
systemctl show heartbeat -p User -p MemoryMax -p CPUQuotaPerSecUSec
tail -2 /var/log/heartbeat.log
sudo reboot   # then check again
```

<details><summary>Solution</summary>

```bash
sudo tee /usr/local/bin/heartbeat.sh <<'X'
#!/bin/bash
while true; do echo "alive $(date)" >> /var/log/heartbeat.log; sleep 10; done
X
sudo chmod 755 /usr/local/bin/heartbeat.sh
sudo useradd -r -M -s /usr/sbin/nologin heartbeat
sudo touch /var/log/heartbeat.log && sudo chown heartbeat: /var/log/heartbeat.log
sudo tee /etc/systemd/system/heartbeat.service <<'X'
[Unit]
Description=Heartbeat writer

[Service]
User=heartbeat
ExecStart=/usr/local/bin/heartbeat.sh
Restart=on-failure
RestartSec=5
MemoryMax=50M
CPUQuota=10%

[Install]
WantedBy=multi-user.target
X
sudo systemctl daemon-reload
sudo systemctl enable --now heartbeat
```

</details>

## Lab 1.7: Fix a broken service

Host: `node01`. Target: 10 min.

Setup:

```bash
sudo tee /etc/systemd/system/broken.service <<'X'
[Unit]
Description=Broken demo
[Service]
User=webuser
ExecStart=python3 -m http.server 8090 --directory /srv/broken
[Install]
WantedBy=multi-user.target
X
sudo systemctl daemon-reload
```

Task: `broken.service` must be running, enabled, and serving `/srv/broken` on TCP 8090 as a user called `webuser`. Fix everything that stops it. Don't change the port.

Verify: `curl -s localhost:8090 | head -3` returns a directory listing, and `systemctl is-enabled broken` says `enabled`.

<details><summary>Solution</summary>

Problems: `ExecStart` is not an absolute path, the user `webuser` doesn't exist, and `/srv/broken` doesn't exist. `systemctl status broken` and `journalctl -u broken` show each one in turn.

```bash
sudo useradd -r -M -s /usr/sbin/nologin webuser
sudo mkdir -p /srv/broken
sudo sed -i 's|^ExecStart=python3|ExecStart=/usr/bin/python3|' /etc/systemd/system/broken.service
sudo systemctl daemon-reload
sudo systemctl enable --now broken
journalctl -u broken -n 20
```

</details>

## Lab 1.8: SSL certificates

Host: `node01`. Target: 10 min.

1. Create a 2048-bit RSA private key `/etc/ssl/private/lab.key` (mode 600) and a self-signed certificate `/etc/ssl/certs/lab.crt` for CN `node01.lab`, valid for 730 days.
2. Create a CSR `/root/app.csr` for CN `app.lab` with organisation `Lab` and a new key `/root/app.key`.
3. Write the certificate's expiry date (the `notAfter=` line) to `/root/lab-expiry.txt`.

Verify:

```bash
sudo openssl x509 -in /etc/ssl/certs/lab.crt -noout -subject -enddate
sudo openssl req -in /root/app.csr -noout -subject      # O = Lab, CN = app.lab
stat -c %a /etc/ssl/private/lab.key                     # 600
```

<details><summary>Solution</summary>

```bash
sudo openssl req -x509 -newkey rsa:2048 -noenc -days 730 \
  -keyout /etc/ssl/private/lab.key -out /etc/ssl/certs/lab.crt -subj "/CN=node01.lab"
sudo chmod 600 /etc/ssl/private/lab.key
sudo openssl req -new -newkey rsa:2048 -noenc -keyout /root/app.key -out /root/app.csr -subj "/O=Lab/CN=app.lab"
sudo openssl x509 -in /etc/ssl/certs/lab.crt -noout -enddate | sudo tee /root/lab-expiry.txt
```

</details>

## Lab 1.9: Git

Host: `node01` (as `vagrant`). Target: 10 min.

1. Create a bare repository `/srv/git/config.git` owned by `vagrant`.
2. Clone it to `~/config`. Commit a file `motd` containing `Welcome` on branch `main`, and push.
3. Create branch `feature`, change `motd` to `Welcome to LFCS`, commit, and merge it into `main`. Push `main`.
4. Tag the merged commit `v1.0` and push the tag.

Verify:

```bash
git --git-dir=/srv/git/config.git log --oneline main
git --git-dir=/srv/git/config.git tag             # v1.0
git --git-dir=/srv/git/config.git show main:motd  # Welcome to LFCS
```

<details><summary>Solution</summary>

```bash
sudo mkdir -p /srv/git && sudo chown vagrant: /srv/git
git init --bare -b main /srv/git/config.git
git clone /srv/git/config.git ~/config && cd ~/config
git config --global user.name lab; git config --global user.email lab@lab
git checkout -b main                  # an empty clone may start on 'master'
echo Welcome > motd && git add motd && git commit -m "add motd" && git push -u origin main
git switch -c feature && echo "Welcome to LFCS" > motd && git commit -am "update motd"
git switch main && git merge feature && git push
git tag v1.0 && git push origin v1.0
```

</details>

## Lab 1.10: Performance triage

Host: `node01`. Target: 8 min.

Setup: `sudo apt install -y stress-ng && (stress-ng --cpu 1 --vm 1 --vm-bytes 300M --timeout 600 &)`

Task:

1. Write the PID of the process using the most CPU to `/root/top-cpu.pid`.
2. Write the 5-minute load average to `/root/load5.txt`.
3. Lower the priority of every `stress-ng` process to nice 19.
4. Then stop all `stress-ng` processes.

Verify: `ps -o ni,comm -C stress-ng` shows 19 before step 4 and nothing after it.

<details><summary>Solution</summary>

```bash
ps -eo pid,%cpu,comm --sort=-%cpu | sed -n 2p | awk '{print $1}' | sudo tee /root/top-cpu.pid
awk '{print $2}' /proc/loadavg | sudo tee /root/load5.txt
sudo renice 19 -p $(pgrep stress-ng)
sudo pkill stress-ng
```

</details>
