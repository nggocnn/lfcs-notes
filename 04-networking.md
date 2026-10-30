# Networking

This section covers IP addressing, interface inspection, service listening state, network configuration, bridging and bonding concepts, firewall rules, NAT and port forwarding, reverse proxies/load balancers, time synchronization, netplan and static routes, name resolution, iptables/nftables NAT, OpenSSH, chrony, and network troubleshooting.

## 1. IPv4, IPv6, and CIDR notation

Most networking tasks depend on a solid understanding of address prefixes, so these fundamentals come first.

Examples:

- IPv4: `192.168.1.101`
- IPv4 with CIDR: `192.168.1.101/24`
- IPv6: `2001:db8::ff00:42:8329/64`

Key idea:

- CIDR suffix tells you how many leading bits are the network prefix
- `/24` in IPv4 usually means the first 3 octets are the network part

## 2. Inspecting interfaces and addresses

Main tools:

- `ip a`
- `ip route show`
- `ss`
- `netstat`

Examples:

```bash
$ ip a
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    inet 192.168.9.3/24 brd 192.168.9.255 scope global eth0
```

```bash
$ ip route show
default via 192.168.9.1 dev eth0
192.168.9.0/24 dev eth0 proto kernel scope link src 192.168.9.3
```

Add a temporary address:

```bash
$ sudo ip a add 192.168.9.3/24 dev eth1
```

## 3. Finding services listening on the network

The lecture strongly emphasizes `ss -tunlp`.

Meaning of options:

- `-t` TCP
- `-u` UDP
- `-n` numeric output
- `-l` listening sockets
- `-p` process name/PID

Example:

```bash
$ sudo ss -tunlp
Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
tcp   LISTEN 0      128    0.0.0.0:22         0.0.0.0:*         users:(("sshd",pid=679,fd=3))
tcp   LISTEN 0      80     127.0.0.1:3306     0.0.0.0:*         users:(("mariadbd",pid=812,fd=18))
```

Interpretation:

- `127.0.0.1:3306` means local-only access
- `0.0.0.0:22` means all IPv4 addresses
- `[::]:22` means all IPv6 addresses

Legacy equivalent:

```bash
$ sudo netstat -tulpn
```

## 4. Managing network services

After identifying a listening service, you manage it through `systemctl`.

Examples:

```bash
$ systemctl status ssh.service
● ssh.service - OpenBSD Secure Shell server
   Active: active (running)
```

```bash
$ sudo systemctl stop mariadb.service
$ sudo systemctl disable mariadb.service
$ sudo systemctl enable mariadb.service
$ sudo systemctl start mariadb.service
```

## 5. Configuring network settings on Ubuntu

Ubuntu uses `netplan` for network configuration.

Apply configuration:

```bash
$ sudo netplan apply
```

Typical admin tasks:

- assign static addresses
- define gateways/routes
- configure DNS
- activate new settings without rebooting

The exact YAML varies by interface names and topology, but the operational flow is:

1. edit netplan config under `/etc/netplan/`
2. validate syntax
3. apply with `netplan apply`

## 6. Bridging vs bonding

The lectures explain the difference conceptually.

Bridge:

- joins separate networks
- makes them behave like one larger network
- the virtual device is the controller
- member interfaces are ports

Bond:

- joins multiple links to the same network
- improves redundancy, reliability, or throughput
- applications use one bond interface instead of separate NICs

Common bonding modes:

- mode 0: round-robin
- mode 1: active-backup
- mode 2: XOR
- mode 3: broadcast
- mode 4: IEEE 802.3ad
- mode 5: adaptive transmit load balancing
- mode 6: adaptive load balancing

The key exam takeaway is usually conceptual: know when you want a bridge vs when you want a bond.

## 7. Firewalling with UFW

The course uses UFW as the practical firewall tool on Ubuntu.

Enable firewall:

```bash
$ sudo ufw enable
Firewall is active and enabled on system startup
```

Allow SSH:

```bash
$ sudo ufw allow 22
Rule added
```

Deny HTTPS:

```bash
$ sudo ufw deny 443/tcp
Rule added
```

Show numbered rules:

```bash
$ sudo ufw status numbered
[ 1] 22                         ALLOW IN    Anywhere
[ 2] 443/tcp                    DENY IN     Anywhere
```

Delete by rule text or number:

```bash
$ sudo ufw delete deny 443/tcp
$ sudo ufw delete 2
```

Allow by source IP or subnet:

```bash
$ sudo ufw allow from 207.45.232.181
$ sudo ufw allow from 10.11.12.0/24
```

## 8. Port forwarding and NAT

The concept is architectural:

- a public server sits between the internet and private servers
- port forwarding directs incoming connections to the correct private host
- NAT rewrites packet addresses so responses can return properly

Concept example:

- incoming public port `80` forwarded to private web server
- incoming public port `993` forwarded to private mail server
- incoming public port `3306` forwarded to private database server

Operationally, the admin needs to understand:

- packet source and destination addresses
- why private subnets are not internet-routable directly
- why the gateway host must rewrite or redirect traffic

The deck discusses this mostly through `iptables` concepts even if the exact commands are less important than the traffic flow logic.

## 9. Reverse proxy and load balancer concepts

Front-end web traffic distribution is a common admin pattern worth understanding conceptually.

Reverse proxy:

- receives client requests
- forwards them to backend servers
- hides backend details from clients

Load balancer:

- distributes traffic across multiple backend servers
- improves capacity and availability

This is a common admin pattern when multiple web servers serve the same application.

## 10. Time and timezone management

Accurate time is important for logs, certificates, automation, and clustered services.

Check current time settings:

```bash
$ timedatectl
               Local time: Mon 2026-06-22 17:20:00 +07
           Universal time: Mon 2026-06-22 10:20:00 UTC
                Time zone: Asia/Bangkok (+07, +0700)
```

Change timezone:

```bash
$ sudo timedatectl set-timezone America/New_York
```

Typical goals:

- correct timezone
- synchronized clock
- consistent timestamps in logs and services

## 11. Implementing a reverse proxy with Nginx

The existing notes describe the concept. The PDF walks through the actual configuration.

Nginx is the primary tool used. Alternatives include HAProxy, Apache, Traefik, and Squid, but Nginx is covered in detail because it can act as both a web server and a reverse proxy.

Install:

```bash
$ sudo apt install nginx
```

Create a site config:

```bash
$ sudo vim /etc/nginx/sites-available/proxy.conf
```

Minimal reverse proxy config - forward all requests to an upstream server:

```nginx
server {
    listen 80;
    location / {
        proxy_pass http://1.1.1.1;
        include proxy_params;
    }
}
```

- `location /` matches every URL path (since every URL begins with `/`)
- `location /images` would restrict proxying to only URLs under `/images`
- `proxy_pass` accepts an IP address, hostname, or domain name
- Append `:port` if the upstream does not listen on port 80: `proxy_pass http://1.1.1.1:8081;`

The `include proxy_params` line pulls in `/etc/nginx/proxy_params`, which sets forwarding headers so the upstream sees the real client IP:

```
proxy_set_header Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

Without these headers the upstream web server sees all requests as coming from the proxy's own IP instead of the real visitor.

Nginx uses two directories:

- `/etc/nginx/sites-available/` - holds all config files (active or not)
- `/etc/nginx/sites-enabled/` - Nginx only reads files here

To activate the config, symlink it into `sites-enabled` and disable the default site:

```bash
$ sudo ln -s /etc/nginx/sites-available/proxy.conf /etc/nginx/sites-enabled/proxy.conf
$ sudo rm /etc/nginx/sites-enabled/default
```

Test config syntax before reloading:

```bash
$ sudo nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Apply the new config:

```bash
$ sudo systemctl reload nginx.service
```

## 12. Implementing a load balancer with Nginx

A load balancer is like a reverse proxy but distributes traffic across multiple backend servers instead of one. Nginx handles this with an `upstream` block.

Remove the previous proxy config link:

```bash
$ sudo rm /etc/nginx/sites-enabled/proxy.conf
```

Create a new load balancer config:

```bash
$ sudo vim /etc/nginx/sites-available/lb.conf
```

Basic round-robin example (default when no method is specified):

```nginx
upstream mywebservers {
    server 1.2.3.4;
    server 5.6.7.8;
}

server {
    listen 80;
    location / {
        proxy_pass http://mywebservers;
    }
}
```

The `upstream` block defines a named group of servers. The `proxy_pass` then references that group name instead of a direct IP. With no extra directives, Nginx uses round-robin - requests alternate randomly between the listed servers.

**`least_conn`** - send each request to the server with the fewest active connections:

```nginx
upstream mywebservers {
    least_conn;
    server 1.2.3.4;
    server 5.6.7.8;
}
```

**`weight`** - give more traffic to a more powerful server (default weight is 1):

```nginx
upstream mywebservers {
    least_conn;
    server 1.2.3.4 weight=3;
    server 5.6.7.8;
}
```

With `weight=3` on the first server, roughly 3 of every 4 requests go to `1.2.3.4` and 1 goes to `5.6.7.8`.

**`down`** - temporarily remove a server from rotation without deleting it (useful during maintenance):

```nginx
upstream mywebservers {
    least_conn;
    server 1.2.3.4 weight=3 down;
    server 5.6.7.8;
}
```

**`backup`** - keep a server in reserve; it only receives traffic if all primary servers are unavailable:

```nginx
upstream mywebservers {
    least_conn;
    server 1.2.3.4;
    server 5.6.7.8;
    server 10.20.30.40 backup;
}
```

If a backend listens on a non-standard port, append it to the server entry:

```nginx
server 1.2.3.4:8081;
```

Activation steps are the same as for the reverse proxy:

```bash
$ sudo ln -s /etc/nginx/sites-available/lb.conf /etc/nginx/sites-enabled/lb.conf
$ sudo nginx -t
$ sudo systemctl reload nginx.service
```

## 13. NTP and systemd-timesyncd

Hardware clocks in computers are not perfect - they slowly drift away from real time. To stay accurate, Linux systems periodically contact NTP (Network Time Protocol) servers on the internet to correct the drift.

On Ubuntu, time synchronization is handled by `systemd-timesyncd`, which is part of the systemd suite.

List available timezones (navigate with Page Up/Down or arrow keys, quit with `q`):

```bash
$ timedatectl list-timezones
Africa/Abidjan
Africa/Accra
America/New_York
...
```

Set timezone - continent first, then city (use underscore for spaces):

```bash
$ sudo timedatectl set-timezone America/New_York
```

Confirm the change and check NTP status:

```bash
$ timedatectl
               Local time: Thu 2023-07-27 20:28:11 EDT
           Universal time: Fri 2023-07-27 00:28:11 UTC
                 RTC time: Fri 2023-07-27 20:28:11
                Time zone: America/New_York (EDT, -0400)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
```

`NTP service: active` means the clock is being kept accurate automatically.

If NTP is not active, install and enable it:

```bash
$ sudo apt install systemd-timesyncd
$ sudo timedatectl set-ntp true
```

Check that the `systemd-timesyncd` daemon is running:

```bash
$ systemctl status systemd-timesyncd.service
● systemd-timesyncd.service - Network Time Synchronization
     Active: active (running)
     Status: "Initial synchronization to time server 185.125.190.57.123 (ntp.ubuntu.com)."
```

To specify custom NTP servers, edit the config file:

```bash
$ sudo vim /etc/systemd/timesyncd.conf
```

Uncomment and set the `NTP=` line. Multiple servers go on the same line:

```ini
[Time]
NTP=0.us.pool.ntp.org 1.us.pool.ntp.org 2.us.pool.ntp.org 3.us.pool.ntp.org
#FallbackNTP=ntp.ubuntu.com
#RootDistanceMaxSec=5
#PollIntervalMinSec=32
#PollIntervalMaxSec=2048
```

Key settings in `timesyncd.conf`:

- `NTP` - primary servers to contact
- `FallbackNTP` - used if the `NTP` line is empty or all servers fail
- `RootDistanceMaxSec` - maximum allowed round-trip time to an NTP server before falling back
- `PollIntervalMinSec` / `PollIntervalMaxSec` - how often to poll (timesyncd adapts between these bounds based on observed clock drift)

After editing, restart the daemon:

```bash
$ sudo systemctl restart systemd-timesyncd
```

Verify which NTP servers are actually in use:

```bash
$ timedatectl show-timesync
SystemNTPServers=0.us.pool.ntp.org 1.us.pool.ntp.org 2.us.pool.ntp.org 3.us.pool.ntp.org
FallbackNTPServers=ntp.ubuntu.com
ServerName=0.us.pool.ntp.org
ServerAddress=198.60.22.240
```

See detailed sync statistics including current poll interval and root distance:

```bash
$ timedatectl timesync-status
       Server: 198.60.22.240 (0.us.pool.ntp.org)
 Poll interval: 34min 8s (min: 32s; max: 34min 8s)
         Leap: normal
      Stratum: 2
    Reference: B2BD7F95
    Precision: 1us (-22)
Root distance: 37.490ms (max: 5s)
       Offset: -17.854ms
        Delay: 39.844ms
        Jitter: 7.771ms
 Packet count: 6
    Frequency: -7.449ppm
```

## 14. Static IP, DNS and routes with netplan

Section 5 gives the netplan workflow. This is the full syntax for the most common tasks. Files live in `/etc/netplan/*.yaml`. They are read in lexical order, and later files override earlier ones. Keep them at mode 600, otherwise netplan warns about permissions.

```yaml
# /etc/netplan/60-static.yaml
network:
  version: 2
  ethernets:
    enp0s8:
      dhcp4: false
      addresses:
        - 192.168.56.11/24
        - "fd00:56::11/64"
      routes:
        - to: default
          via: 192.168.56.1
        - to: 10.20.0.0/16
          via: 192.168.56.254
      nameservers:
        addresses: [192.168.56.1, 1.1.1.1]
        search: [lab.example]
```

```bash
$ sudo chmod 600 /etc/netplan/60-static.yaml
$ sudo netplan generate           # syntax check
$ sudo netplan try                # applies, then rolls back after 120 s unless you press Enter
$ sudo netplan apply
$ ip -br addr ; ip route ; resolvectl status enp0s8
```

The old `gateway4:` key is deprecated. Use a route `to: default` instead.

## 15. Static routing

Runtime routes, which are lost at reboot:

```bash
$ sudo ip route add 10.20.0.0/16 via 192.168.56.254 dev enp0s8
$ sudo ip route add default via 192.168.56.1
$ sudo ip route del 10.20.0.0/16
$ ip route get 10.20.1.5          # which route and interface a packet would use
$ ip -6 route
```

To make a route persistent, use netplan `routes:` (section 14) on Ubuntu, or NetworkManager on RHEL/Rocky:

```bash
$ sudo nmcli connection modify eth1 +ipv4.routes "10.20.0.0/16 192.168.56.254"
$ sudo nmcli connection up eth1
```

A host only routes traffic between interfaces when forwarding is on:

```bash
$ sudo sysctl -w net.ipv4.ip_forward=1
$ echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/90-forward.conf
$ sudo sysctl --system
```

## 16. Hostname and name resolution

```bash
$ sudo hostnamectl set-hostname web01.lab.example
$ hostnamectl
$ echo "192.168.56.12  db01.lab.example db01" | sudo tee -a /etc/hosts
$ getent hosts db01               # uses nsswitch, the same path applications use
$ grep ^hosts /etc/nsswitch.conf
hosts: files dns                  # /etc/hosts first, then DNS
```

On Ubuntu, `systemd-resolved` owns DNS. `/etc/resolv.conf` is a symlink to its stub at `127.0.0.53`, so don't edit it directly.

```bash
$ resolvectl status
$ resolvectl query example.com
$ sudo resolvectl dns enp0s8 1.1.1.1    # runtime only
$ sudo resolvectl flush-caches
$ dig +short example.com ; dig @1.1.1.1 example.com AAAA
```

For persistent DNS, set `nameservers:` in netplan, or set `DNS=` and `Domains=` in `/etc/systemd/resolved.conf` and run `sudo systemctl restart systemd-resolved`.

## 17. Configuring bonds and bridges

Section 6 explains the difference between the two. This section configures them.

Bond in netplan. The members must be declared under `ethernets` with no addresses:

```yaml
network:
  version: 2
  ethernets:
    enp0s9: { dhcp4: false }
    enp0s10: { dhcp4: false }
  bonds:
    bond0:
      interfaces: [enp0s9, enp0s10]
      addresses: [10.0.0.11/24]
      parameters:
        mode: active-backup
        primary: enp0s9
        mii-monitor-interval: 100
```

```bash
$ cat /proc/net/bonding/bond0     # mode, active member, link status
$ ip -d link show bond0
```

Common modes are `active-backup` (failover, works with any switch), `balance-rr`, `802.3ad` (LACP, needs switch support) and `balance-alb`.

Bridge in netplan. The IP goes on the bridge, not on the member:

```yaml
network:
  version: 2
  ethernets:
    enp0s9: { dhcp4: false }
  bridges:
    br0:
      interfaces: [enp0s9]
      addresses: [10.0.0.21/24]
      parameters:
        stp: false
        forward-delay: 0
```

```bash
$ bridge link                     # members of each bridge
$ ip -br link show master br0
```

The same with NetworkManager (RHEL/Rocky):

```bash
$ sudo nmcli con add type bond con-name bond0 ifname bond0 bond.options "mode=active-backup,miimon=100" \
    ipv4.method manual ipv4.addresses 10.0.0.11/24
$ sudo nmcli con add type ethernet con-name bond0-p1 ifname eth2 master bond0 slave-type bond
$ sudo nmcli con add type ethernet con-name bond0-p2 ifname eth3 master bond0 slave-type bond
$ sudo nmcli con add type bridge con-name br0 ifname br0 ipv4.method manual ipv4.addresses 10.0.0.21/24
$ sudo nmcli con add type ethernet con-name br0-p1 ifname eth4 master br0 slave-type bridge
$ sudo nmcli con up bond0 ; sudo nmcli con up br0
```

Runtime-only versions with `ip`, which are useful for quick tests:

```bash
$ sudo ip link add bond0 type bond mode active-backup
$ sudo ip link set enp0s9 down ; sudo ip link set enp0s9 master bond0
$ sudo ip link add br0 type bridge ; sudo ip link set enp0s10 master br0 ; sudo ip link set br0 up
```

## 18. Packet filtering, port redirection and NAT

Section 8 explains the concept. These are the commands. On Ubuntu 22.04, `iptables` is a front end to nftables (`iptables -V` shows `nf_tables`), so both tools see the same kernel tables. Never block the exam's ports 8080, 4505 or 4506.

### iptables

Filtering:

```bash
$ sudo iptables -L -n -v --line-numbers
$ sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
$ sudo iptables -A INPUT -s 10.0.0.50 -j DROP
$ sudo iptables -I INPUT 1 -i lo -j ACCEPT        # insert at position 1
$ sudo iptables -D INPUT 3                         # delete rule 3
$ sudo iptables -A INPUT -p tcp --dport 3306 ! -s 10.0.0.0/24 -j REJECT
```

Port forwarding (DNAT) to another host, and masquerading (SNAT) for a private subnet:

```bash
$ sudo sysctl -w net.ipv4.ip_forward=1             # required, persist it (section 15)
$ sudo iptables -t nat -A PREROUTING -i enp0s8 -p tcp --dport 8081 -j DNAT --to-destination 10.0.0.12:80
$ sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o enp0s3 -j MASQUERADE
$ sudo iptables -t nat -L -n -v
```

Redirect a port on the same host. `REDIRECT` in PREROUTING only catches traffic from outside. Add an OUTPUT rule for local clients:

```bash
$ sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 8080
$ sudo iptables -t nat -A OUTPUT -o lo -p tcp --dport 80 -j REDIRECT --to-ports 8080
```

Make rules persistent:

```bash
$ sudo apt install iptables-persistent       # offers to save the current rules
$ sudo netfilter-persistent save             # writes /etc/iptables/rules.v4 and rules.v6
```

### nftables

```bash
$ sudo nft list ruleset
$ sudo nft add table inet filter
$ sudo nft add chain inet filter input '{ type filter hook input priority 0; policy accept; }'
$ sudo nft add rule inet filter input tcp dport 23 drop
$ sudo nft -a list chain inet filter input   # -a shows handles
$ sudo nft delete rule inet filter input handle 5
```

For persistence, put the ruleset in `/etc/nftables.conf` and enable the service:

```
#!/usr/sbin/nft -f
flush ruleset

table inet filter {
  chain input {
    type filter hook input priority 0; policy accept;
    tcp dport 23 drop
  }
}

table ip nat {
  chain prerouting {
    type nat hook prerouting priority dstnat;
    tcp dport 8081 dnat to 10.0.0.12:80
  }
  chain postrouting {
    type nat hook postrouting priority srcnat;
    ip saddr 10.0.0.0/24 oifname "enp0s3" masquerade
  }
}
```

```bash
$ sudo nft -c -f /etc/nftables.conf          # check only
$ sudo systemctl enable --now nftables
```

`flush ruleset` also wipes rules that Docker or UFW created. On a host that uses them, flush only your own tables.

### UFW and firewalld

UFW (section 7) has no direct port-forward command. Add NAT rules in a `*nat` block at the top of `/etc/ufw/before.rules`, set `DEFAULT_FORWARD_POLICY="ACCEPT"` in `/etc/default/ufw`, and allow forwarded traffic with `ufw route allow`.

On RHEL/Rocky, firewalld is the default:

```bash
$ sudo firewall-cmd --permanent --add-service=http
$ sudo firewall-cmd --permanent --add-port=8081/tcp
$ sudo firewall-cmd --permanent --add-forward-port=port=8081:proto=tcp:toport=80:toaddr=10.0.0.12
$ sudo firewall-cmd --permanent --add-masquerade
$ sudo firewall-cmd --reload
$ sudo firewall-cmd --list-all
```

## 19. Configuring the OpenSSH server and client

### Server

The config is `/etc/ssh/sshd_config`. Ubuntu 22.04 and later also read `/etc/ssh/sshd_config.d/*.conf` through an `Include` at the top of the file. For each keyword sshd uses the **first** value it reads, so a drop-in beats the main file, and a line in the main file beats a later line.

```
# /etc/ssh/sshd_config.d/50-hardening.conf
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers alice bob
MaxAuthTries 3
ClientAliveInterval 300
```

A `Match` block overrides the global settings for the connections it matches. It applies until the next `Match` line or the end of the configuration, and everything after an included drop-in is still part of the main file. So append `Match` blocks to the end of `/etc/ssh/sshd_config`, not to a drop-in:

```
# end of /etc/ssh/sshd_config
Match Address 192.168.56.0/24
    PasswordAuthentication yes
```

```bash
$ sudo sshd -t                     # syntax check; no output = OK
$ sudo sshd -T | grep -i passwordauthentication   # effective value
$ sudo systemctl reload ssh        # the unit is ssh on Ubuntu, sshd on RHEL/Rocky
```

Port changes need extra steps:

- open the new port in the firewall
- on SELinux hosts, label it: `sudo semanage port -a -t ssh_port_t -p tcp 2222`
- Ubuntu 24.04 starts sshd from `ssh.socket`, so after changing `Port` run `sudo systemctl daemon-reload && sudo systemctl restart ssh.socket`

Keep a second session open while you test, so that a mistake doesn't lock you out. To regenerate the host keys, run `sudo ssh-keygen -A`.

### Client

```bash
$ ssh-keygen -t ed25519 -C "alice@lab"          # creates ~/.ssh/id_ed25519 and .pub
$ ssh-copy-id -i ~/.ssh/id_ed25519.pub alice@node02
$ ssh -i ~/.ssh/id_ed25519 -p 2222 alice@node02
$ ssh-keygen -R node02                           # forget a changed host key
```

Per-user client config in `~/.ssh/config` (mode 600):

```
Host db
    HostName 192.168.56.12
    User alice
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
```

Then `ssh db` is enough. System-wide defaults go in `/etc/ssh/ssh_config` or `/etc/ssh/ssh_config.d/*.conf`.

Permissions that break key login when wrong:

- `~/.ssh` must be 700
- `~/.ssh/authorized_keys` must be 600
- the home directory must not be group- or world-writable

The server log tells you which one is wrong: `journalctl -u ssh`.

Other client features:

```bash
$ scp file.txt alice@node02:/tmp/
$ rsync -avz -e ssh dir/ alice@node02:/backup/dir/
$ ssh -L 8080:localhost:80 alice@node02          # local port forward
$ ssh -J alice@jump alice@internal               # through a jump host
```

## 20. Time synchronization with chrony

Section 13 covers `systemd-timesyncd`, which is the default client on Ubuntu. `chrony` is the default on RHEL/Rocky, and it can also serve time to other hosts. Installing `chrony` on Ubuntu replaces timesyncd.

```bash
$ sudo apt install chrony                         # RHEL: dnf install chrony
```

The config is `/etc/chrony/chrony.conf` on Ubuntu and `/etc/chrony.conf` on RHEL/Rocky:

```
server time.lab.example iburst
pool 2.pool.ntp.org iburst
# act as a server for the lab subnet:
allow 192.168.56.0/24
```

```bash
$ sudo systemctl restart chrony                   # chronyd on RHEL/Rocky
$ chronyc sources -v                              # ^* marks the selected source
$ chronyc tracking                                # current offset
$ sudo chronyc makestep                           # jump the clock now instead of slewing
$ timedatectl                                     # "System clock synchronized: yes"
```

To set the time by hand, NTP must be off: run `sudo timedatectl set-ntp false` then `sudo timedatectl set-time "2026-01-01 12:00:00"`. `sudo hwclock --systohc` copies the system time to the hardware clock.

## 21. Monitoring and troubleshooting networking

Work from the bottom layer up:

```bash
$ ip -br link                       # is the link UP?
$ ip -s link show enp0s8            # error and drop counters
$ ip -br addr                       # right address and prefix?
$ ip route ; ip route get 8.8.8.8   # right gateway?
$ ip neigh                          # ARP/neighbour table
$ ping -c 3 192.168.56.1            # local network
$ tracepath 8.8.8.8                 # or traceroute / mtr
$ getent hosts example.com ; dig example.com   # DNS
$ ss -tulpn                         # is the service listening, and on which address?
$ nc -zv node02 80                  # can I reach the port?
$ curl -I http://node02/            # does the application answer?
$ sudo tcpdump -i enp0s8 -nn port 80 -c 20     # what is actually on the wire
$ sudo iptables -L -n -v ; sudo nft list ruleset   # is a firewall dropping it?
```

`nmcli device status` and `networkctl status` show the state from NetworkManager and systemd-networkd respectively. Use whichever one manages the host.

## 22. What to practice for LFCS

You should be comfortable with:

- reading IPv4/IPv6 and CIDR notation
- inspecting addresses and routes with `ip`
- checking open/listening ports with `ss`
- applying Ubuntu network config with `netplan`
- distinguishing bridge from bond use cases
- creating and removing UFW rules
- explaining basic NAT and port forwarding flow
- configuring Nginx as a reverse proxy using `proxy_pass` and `include proxy_params`
- configuring Nginx as a load balancer using `upstream` with `least_conn`, `weight`, `down`, and `backup`
- enabling and symlink-activating Nginx site configs with `sites-available`/`sites-enabled`
- validating Nginx config with `nginx -t`
- listing timezones and setting timezone with `timedatectl`
- enabling NTP sync with `timedatectl set-ntp true`
- installing and verifying `systemd-timesyncd`
- customizing NTP servers in `/etc/systemd/timesyncd.conf`
- checking sync details with `timedatectl show-timesync` and `timedatectl timesync-status`
- write netplan YAML for static addresses, routes, DNS, bonds and bridges
- add runtime and persistent static routes; enable IP forwarding
- set the hostname and fix name resolution (`/etc/hosts`, `resolvectl`)
- write filtering, DNAT, REDIRECT and MASQUERADE rules with iptables or nftables, and persist them
- harden `sshd_config`, validate with `sshd -t`, set up key-based login and `~/.ssh/config`
- configure chrony as a client or server and check it with `chronyc sources`
- troubleshoot connectivity layer by layer
