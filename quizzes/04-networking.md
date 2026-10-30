# Quiz: Networking (25%)

Answer from memory first, then open the answer. Mark each miss in the "Misses" list in [PLAN.md](../PLAN.md) and redo it two days later. Notes: [04-networking.md](../04-networking.md).

**Q1.** How many usable host addresses are in a /26, and what is the network address of 10.1.1.77/26?

<details><summary>Answer</summary>

62 usable addresses (64 minus network and broadcast). The network is 10.1.1.64.

</details>

**Q2.** Shorten the IPv6 address `2001:0db8:0000:0000:0000:0000:0000:0001`.

<details><summary>Answer</summary>

`2001:db8::1`

</details>

**Q3.** Show all interfaces with their addresses in one line each.

<details><summary>Answer</summary>

`ip -br addr`

</details>

**Q4.** Add 10.0.0.5/24 to `enp0s9` until reboot, and bring the link up.

<details><summary>Answer</summary>

`sudo ip addr add 10.0.0.5/24 dev enp0s9` and `sudo ip link set enp0s9 up`

</details>

**Q5.** Which netplan command applies a config but rolls it back if you lose access?

<details><summary>Answer</summary>

`sudo netplan try`. It reverts after 120 seconds unless you confirm.

</details>

**Q6.** Write the netplan keys for a static address 192.168.56.20/24, default gateway .1 and DNS 1.1.1.1 on `enp0s8`.

<details><summary>Answer</summary>

Under `ethernets: enp0s8:` set `dhcp4: false`, `addresses: [192.168.56.20/24]`, `routes: [{to: default, via: 192.168.56.1}]` and `nameservers: {addresses: [1.1.1.1]}`.

</details>

**Q7.** Add a runtime route to 172.16.0.0/16 via 192.168.56.254, and make it persistent on Ubuntu.

<details><summary>Answer</summary>

Runtime: `sudo ip route add 172.16.0.0/16 via 192.168.56.254`. Persistent: add `- to: 172.16.0.0/16` with `via: 192.168.56.254` under the interface's `routes:` in netplan, then `netplan apply`.

</details>

**Q8.** Which interface and gateway would be used to reach 8.8.8.8?

<details><summary>Answer</summary>

`ip route get 8.8.8.8`

</details>

**Q9.** Make a persistent static route with NetworkManager.

<details><summary>Answer</summary>

`sudo nmcli con mod <con> +ipv4.routes "172.16.0.0/16 192.168.56.254"` then `sudo nmcli con up <con>`.

</details>

**Q10.** Enable IPv4 forwarding persistently.

<details><summary>Answer</summary>

`echo 'net.ipv4.ip_forward = 1' | sudo tee /etc/sysctl.d/90-forward.conf` then `sudo sysctl --system`.

</details>

**Q11.** Set the hostname to `web01` permanently.

<details><summary>Answer</summary>

`sudo hostnamectl set-hostname web01`. Also update `/etc/hosts` if the old name is listed there.

</details>

**Q12.** `ping db01` fails but `ping 192.168.56.12` works. What do you check, in which order?

<details><summary>Answer</summary>

`getent hosts db01`; `/etc/hosts`; the `hosts:` line in `/etc/nsswitch.conf`; `resolvectl status` (which DNS server is used); `dig db01` against that server.

</details>

**Q13.** Why shouldn't you edit `/etc/resolv.conf` directly on Ubuntu?

<details><summary>Answer</summary>

It is a symlink managed by `systemd-resolved`, which points to the stub 127.0.0.53. Set DNS in netplan or `/etc/systemd/resolved.conf` instead.

</details>

**Q14.** Bridge vs bond: which one joins interfaces into one logical link for redundancy, and which one connects VMs to the LAN?

<details><summary>Answer</summary>

A bond aggregates NICs for redundancy or throughput. A bridge is a software switch, for example to connect VMs or containers to the physical network.

</details>

**Q15.** How do you see which bond member is active and the bond mode?

<details><summary>Answer</summary>

`cat /proc/net/bonding/bond0`

</details>

**Q16.** Name the bond mode that needs no switch configuration and gives failover only.

<details><summary>Answer</summary>

`active-backup` (mode 1).

</details>

**Q17.** In a netplan bridge, where does the IP address go?

<details><summary>Answer</summary>

On the bridge (`bridges: br0: addresses:`). The member interface gets no address.

</details>

**Q18.** List iptables rules with counters and line numbers, then delete INPUT rule 4.

<details><summary>Answer</summary>

`sudo iptables -L -n -v --line-numbers` then `sudo iptables -D INPUT 4`.

</details>

**Q19.** Drop all incoming traffic from 10.0.0.66 with iptables, as the first rule.

<details><summary>Answer</summary>

`sudo iptables -I INPUT 1 -s 10.0.0.66 -j DROP`

</details>

**Q20.** Forward incoming TCP 8081 on this host to 10.0.0.12:80. Which two prerequisites are easy to forget?

<details><summary>Answer</summary>

`sudo iptables -t nat -A PREROUTING -p tcp --dport 8081 -j DNAT --to-destination 10.0.0.12:80`. Easy to forget: `net.ipv4.ip_forward=1`, and a FORWARD chain that accepts the traffic (plus MASQUERADE/SNAT if the backend doesn't route back through this host).

</details>

**Q21.** Redirect TCP 80 to local port 8080 for external clients.

<details><summary>Answer</summary>

`sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 8080`. Local clients also need the same rule in the `OUTPUT` chain.

</details>

**Q22.** Masquerade traffic from 10.0.0.0/24 leaving via `enp0s3`.

<details><summary>Answer</summary>

`sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o enp0s3 -j MASQUERADE`

</details>

**Q23.** Persist iptables rules on Ubuntu.

<details><summary>Answer</summary>

`sudo apt install iptables-persistent`, then `sudo netfilter-persistent save`. This writes `/etc/iptables/rules.v4`.

</details>

**Q24.** Persist an nftables ruleset.

<details><summary>Answer</summary>

Write it to `/etc/nftables.conf`, check it with `nft -c -f /etc/nftables.conf`, then `sudo systemctl enable --now nftables`.

</details>

**Q25.** With UFW, allow 22/tcp only from 192.168.56.0/24.

<details><summary>Answer</summary>

`sudo ufw allow from 192.168.56.0/24 to any port 22 proto tcp`

</details>

**Q26.** Open http permanently and add a port forward with firewalld.

<details><summary>Answer</summary>

`firewall-cmd --permanent --add-service=http`, `firewall-cmd --permanent --add-forward-port=port=8081:proto=tcp:toport=80:toaddr=10.0.0.12`, then `firewall-cmd --reload`.

</details>

**Q27.** In `sshd_config` drop-ins, if two files set `PasswordAuthentication`, which value wins?

<details><summary>Answer</summary>

The first one read. Drop-ins in `/etc/ssh/sshd_config.d/` are included at the top of the main file, so they beat it, and lexically earlier files win.

</details>

**Q28.** Validate the sshd config and show the effective value of `PermitRootLogin`.

<details><summary>Answer</summary>

`sudo sshd -t` and `sudo sshd -T | grep -i permitrootlogin`

</details>

**Q29.** Allow only `alice` and `bob` to log in over SSH.

<details><summary>Answer</summary>

`AllowUsers alice bob` in sshd config, then `sudo systemctl reload ssh`.

</details>

**Q30.** Change sshd to port 2222 on Rocky with SELinux and firewalld. List every step.

<details><summary>Answer</summary>

Set `Port 2222`; `semanage port -a -t ssh_port_t -p tcp 2222`; `firewall-cmd --permanent --add-port=2222/tcp && firewall-cmd --reload`; `sshd -t`; `systemctl restart sshd`.

</details>

**Q31.** Set up key login from `alice@base` to `alice@node02`.

<details><summary>Answer</summary>

On base: `ssh-keygen -t ed25519` then `ssh-copy-id alice@node02`.

</details>

**Q32.** Key login still asks for a password. Which permissions do you check?

<details><summary>Answer</summary>

`~/.ssh` must be 700, `authorized_keys` 600, and the home directory must not be group- or world-writable. Check `journalctl -u ssh` on the server.

</details>

**Q33.** Create a client alias so that `ssh db` connects to 192.168.56.12 as `alice` on port 2222.

<details><summary>Answer</summary>

In `~/.ssh/config`: `Host db`, `HostName 192.168.56.12`, `User alice`, `Port 2222`.

</details>

**Q34.** Set the timezone to Europe/Berlin and turn on NTP sync.

<details><summary>Answer</summary>

`sudo timedatectl set-timezone Europe/Berlin` and `sudo timedatectl set-ntp true`

</details>

**Q35.** Point systemd-timesyncd to `time.lab` and check the result.

<details><summary>Answer</summary>

Set `NTP=time.lab` under `[Time]` in `/etc/systemd/timesyncd.conf`, run `sudo systemctl restart systemd-timesyncd`, then `timedatectl timesync-status`.

</details>

**Q36.** Configure chrony to use `time.lab` and serve time to 192.168.56.0/24. How do you check the source?

<details><summary>Answer</summary>

In `chrony.conf`: `server time.lab iburst` and `allow 192.168.56.0/24`. Restart `chrony` (Ubuntu) or `chronyd` (Rocky). Check with `chronyc sources -v`; `^*` marks the selected source.

</details>

**Q37.** A web service on node02 is unreachable from base. Give the troubleshooting order.

<details><summary>Answer</summary>

Check, in order: the link (`ip -br link`), the address (`ip -br addr`), the route (`ip route get`), `ping`, DNS (`getent hosts`), whether it listens (`ss -tlnp`: on 0.0.0.0 or only 127.0.0.1?), the firewall (`iptables -L`/`nft list ruleset`/`ufw status`), then `curl -v`. Use `tcpdump` to see if packets arrive.

</details>

**Q38.** Capture 10 packets to or from port 443 on `enp0s8` without resolving names.

<details><summary>Answer</summary>

`sudo tcpdump -i enp0s8 -nn -c 10 port 443`

</details>

**Q39.** Configure Nginx as a reverse proxy for `http://127.0.0.1:3000`.

<details><summary>Answer</summary>

In the `server` block: `location / { proxy_pass http://127.0.0.1:3000; include proxy_params; }`. Then `nginx -t` and `systemctl reload nginx`.

</details>

**Q40.** Load-balance Nginx between two backends, sending new requests to the one with the fewest connections, with a third as backup.

<details><summary>Answer</summary>

`upstream app { least_conn; server 10.0.0.11; server 10.0.0.12; server 10.0.0.13 backup; }` and `proxy_pass http://app;`.

</details>
