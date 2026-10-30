# Mock exam 3: solutions

**Task 1**

```bash
grep ' 404 ' /opt/m3/access.log | sudo tee /root/m3-404.txt >/dev/null
awk '{print $1}' /opt/m3/access.log | sort -u | wc -l | sudo tee /root/m3-ipcount.txt
```

**Task 2**

```bash
sudo find /opt/m3/perm -type f -perm -4000 | sudo tee /root/m3-suid.txt
sudo find /opt/m3/perm -type f -perm -o+w -exec chmod o-w {} \;
```

**Task 3**

```bash
sudo systemctl edit m3-worker
# in the editor:
[Service]
Environment=LEVEL=debug
CPUQuota=20%
LimitNOFILE=2048
# then
sudo systemctl enable --now m3-worker
sudo systemctl restart m3-worker        # apply the new settings if it was already running
```

**Task 4**

```bash
sudo mkdir -p /srv/m3restore
sudo tar -xzf /opt/m3/backup.tar.gz -C /srv/m3restore etc/app/b.conf
tar -tzf /opt/m3/backup.tar.gz | sudo tee /root/m3-list.txt
```

**Task 5**

```bash
sudo fsck.ext4 -fy /dev/sdc            # uses a backup superblock automatically
sudo mkdir -p /m3/recovered
echo "UUID=$(sudo blkid -s UUID -o value /dev/sdc) /m3/recovered ext4 defaults 0 2" | sudo tee -a /etc/fstab
sudo systemctl daemon-reload && sudo mount -a
```

**Task 6**

```bash
sudo tee /etc/yum.repos.d/m3local.repo <<'X'
[m3local]
name=Mock 3 local
baseurl=file:///opt/m3repo
enabled=1
gpgcheck=0
X
sudo dnf install -y tree
```

**Task 7**

```bash
printf 'FROM nginx:alpine\nCOPY index.html /usr/share/nginx/html/index.html\n' | sudo tee /srv/m3site/Dockerfile
sudo docker build -t m3/site:1.0 /srv/m3site
sudo docker run -d --name m3-site -p 8083:80 --restart unless-stopped m3/site:1.0
```

**Task 8**: `echo '0 */6 * * * root /usr/bin/tar -czf /root/m3-etc.tgz /etc' | sudo tee /etc/cron.d/m3-backup`

**Task 9**

```bash
sudo setenforce 1
sudo sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config
sudo setsebool -P httpd_can_network_connect_db on
sudo semanage fcontext -a -t httpd_log_t '/srv/m3logs(/.*)?'
sudo restorecon -Rv /srv/m3logs
```

**Task 10**

```bash
sudo chage -d 0 -m 2 -M 60 -W 10 m3a
sudo passwd -l m3b
sudo usermod -s /usr/sbin/nologin m3b
```

**Task 11**

```bash
sudo groupmod -n m3team -g 4200 m3old
sudo usermod -aG m3team m3b
```

Files that had GID 4100 keep the old number. Fix them with `find / -gid 4100 -exec chgrp m3team {} +` if needed.

**Task 12**: the mask was `r--` (from `chmod 740`), which cut `m3a` down to read-only.

```bash
getfacl /srv/m3proj                     # user:m3a:rwx  #effective:r--
sudo setfacl -m m::rwx,g:m3team:r-x /srv/m3proj
sudo chmod o-rwx /srv/m3proj
```

`chmod` on the group bits of a file with an ACL changes the mask. Use `setfacl -m m::...` to set it explicitly.

**Task 13**: a netplan `bridges: br0:` block with `interfaces: [enp0s10]`, `addresses: [10.99.0.33/24]` and `parameters: {stp: false}`. See [Lab 4.5](../labs/04-networking.md#lab-45-bridging).

**Task 14**

```yaml
# /etc/netplan/60-m3.yaml (chmod 600), then sudo netplan apply
network:
  version: 2
  ethernets:
    enp0s9:
      dhcp4: false
      dhcp6: false
      addresses: ["fd00:99::12/64"]
      nameservers:
        addresses: [192.168.56.11]
        search: [mock3.lab]
```

**Task 15**

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-port=8443/tcp
sudo firewall-cmd --permanent --add-forward-port=port=8084:proto=tcp:toport=80
sudo firewall-cmd --reload
```

**Task 16**

```bash
# node01
sudo apt install -y chrony
printf 'allow 192.168.56.0/24\nlocal stratum 10\n' | sudo tee /etc/chrony/conf.d/m3.conf
sudo systemctl restart chrony
# node02
sudo apt install -y chrony
sudo sed -i -E 's/^(pool|server) /#&/' /etc/chrony/chrony.conf
echo 'server node01 iburst' | sudo tee /etc/chrony/sources.d/m3.sources
sudo systemctl restart chrony
chronyc sources
```

`conf.d` and `sources.d` are included by Ubuntu's default `chrony.conf`. If yours doesn't include them, put the lines in `chrony.conf` directly.

**Task 17**

```bash
sudo apt install -y nginx
sudo tee /etc/nginx/sites-available/m3lb <<'X'
upstream m3 {
    least_conn;
    server node02:9101;
    server node02:9102;
}
server {
    listen 80 default_server;
    location / { proxy_pass http://m3; }
}
X
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/m3lb /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Task 18**

```bash
sudo pvcreate /dev/sdc
sudo vgextend m3vg /dev/sdc
sudo pvmove /dev/sdb /dev/sdc
sudo vgreduce m3vg /dev/sdb
sudo pvremove /dev/sdb
```

**Task 19**

```bash
sudo mkdir -p /m3/auto
echo 'node01:/srv/m3nfs /m3/auto nfs ro,noauto,x-systemd.automount,x-systemd.idle-timeout=60,_netdev 0 0' | sudo tee -a /etc/fstab
sudo systemctl daemon-reload && sudo systemctl restart remote-fs.target
ls /m3/auto
```

**Task 20**

```bash
sudo parted -s /dev/sdb mklabel gpt mkpart swap linux-swap 1MiB 513MiB
sudo mkswap /dev/sdb1
echo "UUID=$(sudo blkid -s UUID -o value /dev/sdb1) none swap defaults,pri=10 0 0" | sudo tee -a /etc/fstab
sudo swapon -a
```
