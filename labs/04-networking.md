# Labs: Networking (25%)

Notes: [04-networking.md](../04-networking.md).

Run `ip -br link` on node02 first. On VirtualBox the interfaces are usually `enp0s3` (NAT, Vagrant's management link), `enp0s8` (192.168.56.0/24), and `enp0s9` and `enp0s10` (the spare NICs on the internal network `lfcs-bond`). Never break `enp0s3`, or `vagrant ssh` stops working. Take a snapshot before these labs.

## Lab 4.1: Static addressing

Host: `node02`. Target: 10 min.

Using netplan, in a new file `/etc/netplan/60-lab.yaml`:

1. Give `enp0s9` the static addresses `10.99.0.12/24` and `fd00:99::12/64`, with no DHCP.
2. Give it the DNS server `192.168.56.11` and the search domain `lab.local`, for that link.
3. The configuration must be valid and survive a reboot.

Verify:

```bash
ip -br addr show enp0s9
resolvectl status enp0s9 | grep -E 'DNS Servers|DNS Domain'
sudo netplan get ethernets.enp0s9
```

<details><summary>Solution</summary>

```yaml
network:
  version: 2
  ethernets:
    enp0s9:
      dhcp4: false
      dhcp6: false
      addresses: [10.99.0.12/24, "fd00:99::12/64"]
      nameservers:
        addresses: [192.168.56.11]
        search: [lab.local]
```

```bash
sudo chmod 600 /etc/netplan/60-lab.yaml
sudo netplan try    # press Enter to keep it
```

</details>

## Lab 4.2: Static routing

Hosts: `node01`, `node02`. Target: 10 min.

Setup on node01. It simulates a network 10.50.0.0/24 behind node01:

```bash
sudo ip link add dummy0 type dummy && sudo ip addr add 10.50.0.1/24 dev dummy0 && sudo ip link set dummy0 up
```

Task:

1. On node01, enable IPv4 forwarding persistently.
2. On node02, add a persistent route to `10.50.0.0/24` via `192.168.56.11`.
3. On node02, write the interface used to reach `10.50.0.1` to `/root/route-dev.txt`.

Verify (node02): `ping -c1 10.50.0.1` works, and `ip route get 10.50.0.1` shows `via 192.168.56.11 dev enp0s8`, including after a reboot.

<details><summary>Solution</summary>

```bash
# node01
echo 'net.ipv4.ip_forward = 1' | sudo tee /etc/sysctl.d/90-forward.conf && sudo sysctl --system
# node02: add under enp0s8 in /etc/netplan/50-vagrant.yaml, or in a new file that repeats the interface:
#   routes:
#     - to: 10.50.0.0/24
#       via: 192.168.56.11
sudo netplan apply
ip route get 10.50.0.1 | grep -o 'dev [^ ]*' | awk '{print $2}' | sudo tee /root/route-dev.txt
```

The ping already works without forwarding, because node01 owns 10.50.0.1 itself. Forwarding matters for hosts behind node01. Turning it on is part of being a router.

</details>

## Lab 4.3: Hostname and resolution

Host: `node02`. Target: 6 min.

1. Set the hostname to `node02.lab.local` permanently.
2. Make `db.lab.local` and `db` resolve to `192.168.56.13`, locally and without DNS.
3. Write the DNS server currently used by systemd-resolved for `enp0s3` to `/root/dns.txt`.

Verify: `hostnamectl --static`, `getent hosts db`, `ping -c1 db`.

<details><summary>Solution</summary>

```bash
sudo hostnamectl set-hostname node02.lab.local
echo '192.168.56.13 db.lab.local db' | sudo tee -a /etc/hosts
resolvectl dns enp0s3 | awk '{print $NF}' | sudo tee /root/dns.txt
```

</details>

## Lab 4.4: Bonding

Host: `node02`. Target: 10 min. Restore the snapshot first, or remove `/etc/netplan/60-lab.yaml` from Lab 4.1.

Create `bond0` from `enp0s9` and `enp0s10`: mode `active-backup`, primary `enp0s9`, MII monitoring every 100 ms, address `10.99.0.20/24`. It must be persistent.

Verify:

```bash
grep -E 'Bonding Mode|Currently Active|MII Status' /proc/net/bonding/bond0
ip -br addr show bond0
sudo ip link set enp0s9 down; grep 'Currently Active' /proc/net/bonding/bond0   # enp0s10
sudo ip link set enp0s9 up
```

<details><summary>Solution</summary>

```yaml
# /etc/netplan/60-bond.yaml (chmod 600)
network:
  version: 2
  ethernets:
    enp0s9: { dhcp4: false }
    enp0s10: { dhcp4: false }
  bonds:
    bond0:
      interfaces: [enp0s9, enp0s10]
      addresses: [10.99.0.20/24]
      parameters:
        mode: active-backup
        primary: enp0s9
        mii-monitor-interval: 100
```

`sudo netplan apply`

</details>

## Lab 4.5: Bridging

Host: `node02`. Target: 8 min. Remove the bond from Lab 4.4 first (delete the file, `sudo ip link del bond0`, `sudo netplan apply`).

Create bridge `br0` with member `enp0s10`, STP off, address `10.99.0.30/24`. It must be persistent.

Verify: `bridge link` shows `enp0s10 ... master br0`, and `ip -br addr show br0` shows the address.

<details><summary>Solution</summary>

```yaml
# /etc/netplan/60-br.yaml (chmod 600)
network:
  version: 2
  ethernets:
    enp0s10: { dhcp4: false }
  bridges:
    br0:
      interfaces: [enp0s10]
      addresses: [10.99.0.30/24]
      parameters:
        stp: false
```

</details>

## Lab 4.6: OpenSSH server and client

Hosts: `node02` (server), `base` (client). Target: 12 min.

On node02:

1. Create user `sshuser` with password `Lfcs2026!`.
2. Configure sshd so that root can't log in, and password authentication is disabled for everyone except connections from `192.168.56.10`. Put the global settings in `/etc/ssh/sshd_config.d/10-lab.conf`.
3. Only `vagrant` and `sshuser` may log in.

On base (as vagrant):

4. Create an ed25519 key `~/.ssh/lab_ed25519` and install it for `sshuser@node02`.
5. Add an alias so that `ssh n2` logs in as `sshuser` on node02 with that key.

Verify:

```bash
# node02
sudo sshd -t && sudo sshd -T -C addr=192.168.56.11,user=vagrant,host=node01 | grep -i passwordauthentication   # no
sudo sshd -T -C addr=192.168.56.10,user=vagrant,host=base | grep -i passwordauthentication     # yes
# base
ssh n2 whoami        # sshuser, no password prompt
```

<details><summary>Solution</summary>

```bash
# node02
sudo useradd -m -s /bin/bash sshuser && echo 'sshuser:Lfcs2026!' | sudo chpasswd
sudo tee /etc/ssh/sshd_config.d/10-lab.conf <<'X'
PermitRootLogin no
PasswordAuthentication no
AllowUsers vagrant sshuser
X
# a Match block applies until the next Match or the end of the file, so append it to the END of the main file
printf '\nMatch Address 192.168.56.10\n    PasswordAuthentication yes\n' | sudo tee -a /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl reload ssh
# base
ssh-keygen -t ed25519 -f ~/.ssh/lab_ed25519 -N ''
ssh-copy-id -i ~/.ssh/lab_ed25519.pub sshuser@node02      # password works: base is 192.168.56.10
cat >> ~/.ssh/config <<'X'
Host n2
    HostName node02
    User sshuser
    IdentityFile ~/.ssh/lab_ed25519
X
```

`/etc/ssh/sshd_config.d/50-cloudimg-settings.conf` (if present) may set `PasswordAuthentication yes`. `10-lab.conf` is read first, so its value wins.

</details>

## Lab 4.7: Packet filtering with iptables

Host: `node02`. Target: 10 min.

1. Install `nginx`.
2. With iptables, allow HTTP (80/tcp) only from `192.168.56.10` (base) and reject it from everyone else. Leave all other traffic as it is.
3. Drop all ICMP echo requests from `192.168.56.11` (node01).
4. The rules must survive a reboot.

Verify: from base `curl -sI node02 | head -1` gives 200. From node01, `curl -m3 node02` is refused and `ping -c1 -W2 node02` fails. Check again after a reboot.

<details><summary>Solution</summary>

```bash
sudo apt install -y nginx
sudo iptables -A INPUT -p tcp --dport 80 -s 192.168.56.10 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j REJECT
sudo iptables -A INPUT -p icmp --icmp-type echo-request -s 192.168.56.11 -j DROP
sudo DEBIAN_FRONTEND=noninteractive apt install -y iptables-persistent
sudo netfilter-persistent save
```

</details>

## Lab 4.8: Port forwarding and NAT

Hosts: `node01` (gateway), `node02` (backend with nginx from 4.7; flush its iptables rules first). Target: 12 min.

On node01, forward TCP port `8888` to `node02:80`, so that `curl node01:8888` from base returns node02's nginx page. Persist the rules.

Verify: from base, `curl -s node01:8888 | grep -i nginx`. On node02, `sudo tail -1 /var/log/nginx/access.log` shows the client as `192.168.56.11`, which proves the masquerade works.

<details><summary>Solution</summary>

```bash
# node01
echo 'net.ipv4.ip_forward = 1' | sudo tee /etc/sysctl.d/90-forward.conf && sudo sysctl --system
sudo iptables -t nat -A PREROUTING -p tcp --dport 8888 -j DNAT --to-destination 192.168.56.12:80
sudo iptables -t nat -A POSTROUTING -d 192.168.56.12 -p tcp --dport 80 -j MASQUERADE
sudo DEBIAN_FRONTEND=noninteractive apt install -y iptables-persistent && sudo netfilter-persistent save
```

Without the MASQUERADE rule, node02 replies directly to base (same subnet), and base drops the reply because it expected it from node01. If Docker is installed on node01, its FORWARD policy is DROP. Add `sudo iptables -I DOCKER-USER -d 192.168.56.12 -j ACCEPT` or use a node without Docker.

</details>

## Lab 4.9: nftables

Host: `rocky` (stop firewalld first: `sudo systemctl disable --now firewalld`). Target: 12 min.

Write `/etc/sysconfig/nftables.conf` (the file Rocky's `nftables.service` loads) so that:

1. In table `inet lab`, incoming TCP 23 is dropped and everything else is accepted.
2. Incoming TCP 8080 is redirected to local port 80, in table `ip labnat`.
3. The ruleset loads at boot.

Verify: `sudo nft list ruleset` shows both tables. Install `httpd` and start it, then from base `curl -s rocky:8080` returns the httpd page. Check again after a reboot.

<details><summary>Solution</summary>

```
table inet lab {
  chain input {
    type filter hook input priority 0; policy accept;
    tcp dport 23 drop
  }
}
table ip labnat {
  chain prerouting {
    type nat hook prerouting priority dstnat;
    tcp dport 8080 redirect to :80
  }
}
```

```bash
sudo nft -c -f /etc/sysconfig/nftables.conf
sudo systemctl enable --now nftables
sudo dnf install -y httpd && sudo systemctl enable --now httpd
```

On Ubuntu the file is `/etc/nftables.conf`.

</details>

## Lab 4.10: Time synchronization

Hosts: `node01` (server), `node02` (client). Target: 10 min.

1. Set the timezone of both hosts to `Europe/Paris`.
2. Install chrony on node01 and let it serve time to `192.168.56.0/24`.
3. On node02, use chrony with node01 as the only time source.

Verify (node02): `chronyc sources` shows `^* node01` (wait up to a minute), and `timedatectl` shows `Europe/Paris` and `System clock synchronized: yes`.

<details><summary>Solution</summary>

```bash
# both
sudo timedatectl set-timezone Europe/Paris
sudo apt install -y chrony
# node01: add to /etc/chrony/chrony.conf
allow 192.168.56.0/24
local stratum 10          # keep serving even without internet time
# node02: in /etc/chrony/chrony.conf comment out the pool lines and add
server node01 iburst
# both
sudo systemctl restart chrony
```

</details>

## Lab 4.11: Reverse proxy and load balancer

Hosts: `node02` (backends), `node01` (proxy). Target: 15 min.

1. On node02, make nginx serve `backend A` on port 8001 and `backend B` on port 8002, using two server blocks.
2. On node01, configure nginx as a load balancer on port 80. It sends `/` to both backends with the least-connections method. `/api/` goes only to `node02:8001`, and the original `Host` header and client IP are passed on.

Verify: from base, `for i in 1 2 3 4; do curl -s node01/; done` prints both A and B, and `curl -s node01/api/` returns `backend A`.

<details><summary>Solution</summary>

```nginx
# node02: /etc/nginx/sites-available/backends  (ln -s into sites-enabled)
server { listen 8001; location / { return 200 "backend A\n"; } }
server { listen 8002; location / { return 200 "backend B\n"; } }
```

```nginx
# node01: /etc/nginx/sites-available/lb  (ln -s into sites-enabled, remove default)
upstream app {
    least_conn;
    server node02:8001;
    server node02:8002;
}
server {
    listen 80;
    location / { proxy_pass http://app; }
    location /api/ {
        proxy_pass http://node02:8001;
        include proxy_params;      # Host, X-Real-IP, X-Forwarded-For
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

</details>

## Lab 4.12: Troubleshoot a dead web service

Host: `node02`. Target: 10 min. Restore the snapshot first.

Setup:

```bash
sudo apt install -y nginx
sudo sed -i 's/listen 80 default_server;/listen 127.0.0.1:80 default_server;/' /etc/nginx/sites-available/default
sudo systemctl restart nginx
sudo iptables -I INPUT -p tcp --dport 80 -j DROP
```

Task: users on base can't open `http://node02/`. Find and fix every cause so that it works persistently. Write a one-line description of each cause to `/root/causes.txt`.

Verify: from base, `curl -sI node02 | head -1` gives `200 OK`, including after a reboot.

<details><summary>Solution</summary>

1. `sudo ss -tlnp | grep :80` shows nginx listening only on `127.0.0.1`. Restore `listen 80 default_server;`, run `nginx -t`, then reload.
2. `sudo iptables -L INPUT -n --line-numbers` shows the DROP rule. Delete it with `sudo iptables -D INPUT 1`. It was never saved, so a reboot would also clear it, but delete it now.

</details>
