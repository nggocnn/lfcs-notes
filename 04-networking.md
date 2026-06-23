# Networking

This section covers IP addressing, interface inspection, service listening state, network configuration, bridging and bonding concepts, firewall rules, NAT and port forwarding, reverse proxies/load balancers, and time synchronization.

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

Minimal reverse proxy config — forward all requests to an upstream server:

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

- `/etc/nginx/sites-available/` — holds all config files (active or not)
- `/etc/nginx/sites-enabled/` — Nginx only reads files here

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

The `upstream` block defines a named group of servers. The `proxy_pass` then references that group name instead of a direct IP. With no extra directives, Nginx uses round-robin — requests alternate randomly between the listed servers.

**`least_conn`** — send each request to the server with the fewest active connections:

```nginx
upstream mywebservers {
    least_conn;
    server 1.2.3.4;
    server 5.6.7.8;
}
```

**`weight`** — give more traffic to a more powerful server (default weight is 1):

```nginx
upstream mywebservers {
    least_conn;
    server 1.2.3.4 weight=3;
    server 5.6.7.8;
}
```

With `weight=3` on the first server, roughly 3 of every 4 requests go to `1.2.3.4` and 1 goes to `5.6.7.8`.

**`down`** — temporarily remove a server from rotation without deleting it (useful during maintenance):

```nginx
upstream mywebservers {
    least_conn;
    server 1.2.3.4 weight=3 down;
    server 5.6.7.8;
}
```

**`backup`** — keep a server in reserve; it only receives traffic if all primary servers are unavailable:

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

Hardware clocks in computers are not perfect — they slowly drift away from real time. To stay accurate, Linux systems periodically contact NTP (Network Time Protocol) servers on the internet to correct the drift.

On Ubuntu, time synchronization is handled by `systemd-timesyncd`, which is part of the systemd suite.

List available timezones (navigate with Page Up/Down or arrow keys, quit with `q`):

```bash
$ timedatectl list-timezones
Africa/Abidjan
Africa/Accra
America/New_York
...
```

Set timezone — continent first, then city (use underscore for spaces):

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

- `NTP` — primary servers to contact
- `FallbackNTP` — used if the `NTP` line is empty or all servers fail
- `RootDistanceMaxSec` — maximum allowed round-trip time to an NTP server before falling back
- `PollIntervalMinSec` / `PollIntervalMaxSec` — how often to poll (timesyncd adapts between these bounds based on observed clock drift)

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

## 14. What to practice for LFCS

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
