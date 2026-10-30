# Mock exam 1: solutions

There are usually several valid ways to solve a task. The grader checks results, not commands.

**Task 1**

```bash
sudo mkdir -p /root/m1-found
sudo find /opt/m1/data -type f -user m1user -size +1M -exec cp {} /root/m1-found/ \;
```

`-size +1M` rounds up to whole MiB, so the 500 KiB file counts as "1" and is excluded.

**Task 2**: `sudo tar -cJf /root/m1-data.tar.xz /opt/m1/data`

**Task 3**

```bash
sudo mkdir -p /etc/ssl/m1
sudo openssl req -x509 -newkey rsa:2048 -noenc -days 365 -keyout /etc/ssl/m1/m1.key -out /etc/ssl/m1/m1.crt -subj "/CN=mock1.lab"
sudo chmod 600 /etc/ssl/m1/m1.key
```

**Task 4**

```bash
sudo tee /etc/systemd/system/m1-web.service <<'X'
[Unit]
Description=Mock 1 web
After=network.target

[Service]
User=www-data
ExecStart=/usr/bin/python3 -m http.server 9001 --directory /srv/m1
MemoryMax=100M
Restart=on-failure

[Install]
WantedBy=multi-user.target
X
sudo systemctl daemon-reload && sudo systemctl enable --now m1-web
```

**Task 5**

```bash
printf 'vm.dirty_ratio = 15\nnet.ipv4.ip_forward = 1\n' | sudo tee /etc/sysctl.d/m1.conf
sudo sysctl -p /etc/sysctl.d/m1.conf
```

**Task 6**: run `sudo crontab -u m1user -e` and add `15 4 * * 0 /usr/local/bin/report.sh`.

**Task 7**

```bash
sudo dnf install -y httpd
sudo sed -i 's|^DocumentRoot.*|DocumentRoot "/srv/m1web"|' /etc/httpd/conf/httpd.conf
printf '<Directory "/srv/m1web">\n  Require all granted\n</Directory>\n' | sudo tee /etc/httpd/conf.d/m1.conf
sudo semanage fcontext -a -t httpd_sys_content_t '/srv/m1web(/.*)?'
sudo restorecon -Rv /srv/m1web
sudo systemctl enable --now httpd
```

**Task 8**: `sudo docker run -d --name m1-cache -p 127.0.0.1:6379:6379 --restart always redis:7-alpine`

**Task 9**: `sudo apt install -y jq && sudo apt-mark hold openssh-server`

**Task 10**

```bash
sudo groupadd -g 3100 developers
sudo useradd -m -u 2501 -s /bin/bash -G developers m1dev
sudo chage -E 2027-12-31 -M 45 m1dev
```

**Task 11**

```bash
echo '%m1ops ALL=(root) NOPASSWD: /usr/bin/systemctl restart nginx' | sudo tee /etc/sudoers.d/m1ops
sudo chmod 440 /etc/sudoers.d/m1ops && sudo visudo -c
```

**Task 12**: `sudo setfacl -m u:m1dev:rwx,d:u:m1dev:rw /srv/m1acl`

**Task 13**

```yaml
# /etc/netplan/60-m1.yaml (chmod 600), then sudo netplan apply
network:
  version: 2
  ethernets:
    enp0s9:
      dhcp4: false
      addresses: [10.99.0.12/24]
```

**Task 14**: add to the `enp0s8` block in `/etc/netplan/50-vagrant.yaml`:

```yaml
routes:
  - to: 10.60.0.0/24
    via: 192.168.56.11
```

Then `sudo netplan apply`.

**Task 15**

```bash
printf 'PermitRootLogin no\nMaxAuthTries 3\n' | sudo tee /etc/ssh/sshd_config.d/10-m1.conf
sudo sshd -t && sudo systemctl reload ssh
```

**Task 16**

```bash
sudo sysctl -w net.ipv4.ip_forward=1        # already persistent from Task 5
sudo iptables -t nat -A PREROUTING -p tcp --dport 9090 -j DNAT --to-destination 192.168.56.12:9001
sudo iptables -t nat -A POSTROUTING -d 192.168.56.12 -p tcp --dport 9001 -j MASQUERADE
sudo DEBIAN_FRONTEND=noninteractive apt install -y iptables-persistent
sudo netfilter-persistent save
```

**Task 17**

```bash
sudo timedatectl set-timezone Asia/Tokyo
sudo mkdir -p /etc/systemd/timesyncd.conf.d
printf '[Time]\nNTP=time.lab\n' | sudo tee /etc/systemd/timesyncd.conf.d/m1.conf
sudo systemctl restart systemd-timesyncd
sudo timedatectl set-ntp true
```

**Task 18**

```bash
sudo pvcreate /dev/sdb /dev/sdc && sudo vgcreate m1vg /dev/sdb /dev/sdc
sudo lvcreate -L 800M -n m1lv m1vg && sudo mkfs.xfs /dev/m1vg/m1lv
sudo mkdir -p /m1/data
echo '/dev/m1vg/m1lv /m1/data xfs defaults 0 0' | sudo tee -a /etc/fstab
sudo systemctl daemon-reload && sudo mount -a
```

**Task 19**

```bash
sudo fallocate -l 256M /m1swap && sudo chmod 600 /m1swap && sudo mkswap /m1swap && sudo swapon /m1swap
echo '/m1swap none swap defaults 0 0' | sudo tee -a /etc/fstab
```

**Task 20**

```bash
sudo mkdir -p /mnt/m1share
echo 'node01:/srv/m1share /mnt/m1share nfs defaults,_netdev,nofail 0 0' | sudo tee -a /etc/fstab
sudo systemctl daemon-reload && sudo mount -a
```
