# Mock exam 2: solutions

**Task 1**

```bash
sudo lsof +L1 | grep /var/tmp/m2          # COMMAND sleep, PID n, (deleted)
echo <PID> | sudo tee /root/m2-holder.pid
sudo kill <PID>
```

**Task 2**

```bash
sudo -i
git clone /srv/git/m2.git /root/m2 && cd /root/m2
git switch -c hotfix
echo fixed > FIX.txt && git add FIX.txt
git -c user.name=root -c user.email=root@node01 commit -m "add fix"
git push -u origin hotfix
```

**Task 3**: `systemctl status m2-app` and `journalctl -u m2-app` show three problems: the user is missing, `ExecStart` is not an absolute path, and the script isn't executable.

```bash
sudo useradd -r -M -s /usr/sbin/nologin m2app
sudo chmod 755 /usr/local/bin/m2-app.sh
sudo sed -i 's|^ExecStart=m2-app.sh|ExecStart=/usr/local/bin/m2-app.sh|' /etc/systemd/system/m2-app.service
sudo systemctl daemon-reload && sudo systemctl enable --now m2-app
```

**Task 4**

```bash
sudo mkdir -p /root/m2/csr
sudo openssl req -new -newkey rsa:2048 -noenc -keyout /root/m2/csr/app.key -out /root/m2/csr/app.csr -subj "/O=LFCS/CN=app.mock2.lab"
```

**Task 5**

```bash
sudo tee /etc/systemd/system/m2-clean.service <<'X'
[Service]
Type=oneshot
ExecStart=/usr/bin/find /var/tmp -name '*.old' -delete
X
sudo tee /etc/systemd/system/m2-clean.timer <<'X'
[Timer]
OnCalendar=*-*-* 01:30:00

[Install]
WantedBy=timers.target
X
sudo systemctl daemon-reload && sudo systemctl enable --now m2-clean.timer
```

**Task 6**

```bash
sudo apt install -y podman
podman run -d --name m2-web -p 8082:80 docker.io/library/nginx:alpine
mkdir -p ~/.config/systemd/user && cd ~/.config/systemd/user
podman generate systemd --new --files --name m2-web && podman rm -f m2-web
systemctl --user daemon-reload && systemctl --user enable --now container-m2-web
sudo loginctl enable-linger vagrant
```

**Task 7**

```bash
sudo virt-install --name m2vm --memory 256 --vcpus 1 --disk /var/lib/libvirt/images/m2.qcow2 --import \
  --os-variant generic --network network=default --graphics none --noautoconsole
sudo virsh autostart m2vm
```

**Task 8**

```bash
sudo dnf install -y httpd
echo 'Listen 8089' | sudo tee /etc/httpd/conf.d/m2.conf
sudo semanage port -a -t http_port_t -p tcp 8089
sudo systemctl enable --now httpd
```

**Task 9**

```bash
sudo modprobe br_netfilter && echo br_netfilter | sudo tee /etc/modules-load.d/br_netfilter.conf
echo 'net.bridge.bridge-nf-call-iptables = 1' | sudo tee /etc/sysctl.d/90-bridge.conf && sudo sysctl --system
```

**Task 10**: see [Lab 3.7](../labs/03-users-and-groups.md#lab-37-ldap-accounts). Write `sssd.conf` with `ldap_uri = ldap://node01` and `ldap_search_base = dc=lab,dc=local`, run `chmod 600`, restart sssd, then `sudo pam-auth-update --enable mkhomedir`.

**Task 11**

```bash
echo 'export M2_ENV=exam' | sudo tee /etc/profile.d/m2.sh
sudo touch /etc/skel/.m2rc
```

**Task 12**

```bash
printf 'm2limited hard nproc 50\nm2limited soft nofile 4096\n' | sudo tee /etc/security/limits.d/m2.conf
```

**Task 13**: write a netplan file with a `bonds: bond0:` block, as in [Lab 4.4](../labs/04-networking.md#lab-44-bonding), with address `10.99.0.22/24`. Then `sudo netplan apply`.

**Task 14** (base)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/m2_ed25519 -N ''
ssh-copy-id -i ~/.ssh/m2_ed25519.pub m2ops@node02      # password Mock2pass!
printf 'Host m2\n    HostName node02\n    User m2ops\n    IdentityFile ~/.ssh/m2_ed25519\n' >> ~/.ssh/config
```

**Task 15**

```bash
sudo systemctl disable --now firewalld
sudo tee /etc/sysconfig/nftables.conf <<'X'
table inet m2 {
  chain input {
    type filter hook input priority 0; policy accept;
    tcp dport 23 drop
  }
}
table ip m2nat {
  chain prerouting {
    type nat hook prerouting priority dstnat;
    tcp dport 8081 redirect to :8089
  }
}
X
sudo nft -c -f /etc/sysconfig/nftables.conf && sudo systemctl enable --now nftables
```

The `redirect` arrives at port 8089, so SELinux sees httpd on 8089, which was allowed in Task 8.

**Task 16**

```bash
sudo hostnamectl set-hostname node02.mock2.lab
printf '192.168.56.13 db.mock2\n192.168.56.11 api.mock2\n' | sudo tee -a /etc/hosts
```

**Task 17**

```bash
sudo apt install -y nginx
sudo tee /etc/nginx/sites-available/m2proxy <<'X'
server {
    listen 80 default_server;
    location / {
        proxy_pass http://node02:9002;
        include proxy_params;
    }
}
X
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/m2proxy /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Task 18**

```bash
sudo vgextend m2vg /dev/sdc
sudo lvextend -r -L 1.5G m2vg/m2lv
```

**Task 19**

```bash
sudo apt install -y autofs
echo '/m2auto /etc/auto.m2 --timeout=30' | sudo tee -a /etc/auto.master
echo '* -rw node01:/srv/m2exports/&' | sudo tee /etc/auto.m2
sudo systemctl enable autofs && sudo systemctl restart autofs
```

**Task 20**

```bash
sudo mkfs.ext4 -L M2DATA /dev/sdb
sudo mkdir -p /m2/label /m2/tmp
echo 'LABEL=M2DATA /m2/label ext4 defaults,noexec,nodev 0 2' | sudo tee -a /etc/fstab
echo 'tmpfs /m2/tmp tmpfs size=64M 0 0' | sudo tee -a /etc/fstab
sudo systemctl daemon-reload && sudo mount -a
```
