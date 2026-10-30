#!/bin/bash
# Grades mock exam 1. Run on base: bash /lfcs/mock/check-mock-1.sh
cd "$(dirname "$0")" && source ./lib.sh
echo "Mock 1 results"

task 1 node01 "m1user files >1M copied to /root/m1-found" <<'C'
diff <(find /opt/m1/data -type f -user m1user -size +1M -printf '%f\n' | sort) <(ls /root/m1-found | sort)
C
task 2 node01 "xz archive /root/m1-data.tar.xz" <<'C'
xz -t /root/m1-data.tar.xz
tar -tJf /root/m1-data.tar.xz | grep -q 'opt/m1/data/c/root-owned.bin'
C
task 3 node01 "self-signed certificate /etc/ssl/m1" <<'C'
openssl x509 -in /etc/ssl/m1/m1.crt -noout -subject | grep -Eq 'CN ?= ?mock1\.lab'
[ "$(stat -c %a /etc/ssl/m1/m1.key)" = 600 ]
[ "$(openssl x509 -in /etc/ssl/m1/m1.crt -noout -pubkey | openssl sha256)" = "$(openssl pkey -in /etc/ssl/m1/m1.key -pubout | openssl sha256)" ]
openssl x509 -in /etc/ssl/m1/m1.crt -noout -checkend $((364*86400))
if openssl x509 -in /etc/ssl/m1/m1.crt -noout -checkend $((366*86400)); then exit 1; fi
C
task 4 node02 "m1-web.service" <<'C'
[ "$(systemctl is-enabled m1-web)" = enabled ]
systemctl is-active -q m1-web
[ "$(systemctl show -p User --value m1-web)" = www-data ]
[ "$(systemctl show -p MemoryMax --value m1-web)" = 104857600 ]
curl -s -m5 localhost:9001/ | grep -q 'mock1 service'
C
task 5 node01 "kernel parameters in /etc/sysctl.d/m1.conf" <<'C'
[ "$(sysctl -n vm.dirty_ratio)" = 15 ]
[ "$(sysctl -n net.ipv4.ip_forward)" = 1 ]
grep -Eq '^\s*vm\.dirty_ratio\s*=\s*15' /etc/sysctl.d/m1.conf
grep -Eq '^\s*net\.ipv4\.ip_forward\s*=\s*1' /etc/sysctl.d/m1.conf
C
task 6 node01 "cron job for m1user" <<'C'
crontab -l -u m1user | grep -Eq '^\s*15\s+4\s+\*\s+\*\s+(0|7|[Ss]un)\s+/usr/local/bin/report\.sh'
C
task 7 rocky "httpd serves /srv/m1web under SELinux" <<'C'
[ "$(getenforce)" = Enforcing ]
semanage fcontext -l | grep -F '/srv/m1web' | grep -q httpd_sys_content_t
ls -Z /srv/m1web/index.html | grep -q httpd_sys_content_t
[ "$(systemctl is-enabled httpd)" = enabled ]
curl -s -m5 localhost/ | grep -q 'mock1 selinux'
C
task 8 node02 "container m1-cache" <<'C'
[ "$(docker inspect m1-cache --format '{{.Config.Image}} {{.HostConfig.RestartPolicy.Name}} {{.State.Running}}')" = "redis:7-alpine always true" ]
docker port m1-cache 6379 | grep -qx '127.0.0.1:6379'
C
task 9 node01 "jq installed, openssh-server held" <<'C'
dpkg -s jq | grep -q 'Status: install ok installed'
apt-mark showhold | grep -qx openssh-server
C
task 10 node02 "user m1dev" <<'C'
[ "$(id -u m1dev)" = 2501 ]
[ "$(getent group developers | cut -d: -f3)" = 3100 ]
id -nG m1dev | grep -qw developers
[ "$(getent passwd m1dev | cut -d: -f7)" = /bin/bash ]
[ -d /home/m1dev ]
chage -l m1dev | grep 'Account expires' | grep -q 'Dec 31, 2027'
chage -l m1dev | grep -Eq 'Maximum number of days between password change\s*:\s*45'
C
task 11 node02 "sudo rule for m1ops" <<'C'
visudo -cq
[ -f /etc/sudoers.d/m1ops ]
sudo -l -U m1op | grep -q 'NOPASSWD: /usr/bin/systemctl restart nginx'
if sudo -l -U m1op | grep -Eq '\) (NOPASSWD: )?ALL$'; then exit 1; fi
C
task 12 node02 "ACL on /srv/m1acl" <<'C'
getfacl -p /srv/m1acl | grep -q '^user:m1dev:rwx'
getfacl -p /srv/m1acl | grep -Eq '^default:user:m1dev:rw'
[ "$(stat -c %U:%G /srv/m1acl)" = root:root ]
C
task 13 node02 "static address 10.99.0.12/24" <<'C'
ip -4 -br addr | grep -q '10\.99\.0\.12/24'
grep -rqs '10.99.0.12/24' /etc/netplan/
C
task 14 node02 "persistent route 10.60.0.0/24" <<'C'
ip route show 10.60.0.0/24 | grep -q 'via 192.168.56.11'
grep -rqs '10.60.0.0/24' /etc/netplan/
C
task 15 node01 "sshd hardening" <<'C'
sshd -t
sshd -T | grep -qix 'permitrootlogin no'
sshd -T | grep -qix 'maxauthtries 3'
systemctl is-active -q ssh
C
task 16 base "port forward node01:9090 -> node02:9001" <<'C'
curl -s -m5 http://node01:9090/ | grep -q 'mock1 service'
ssh -n node01 "sudo grep -qs 9090 /etc/iptables/rules.v4 /etc/nftables.conf"
C
task 17 node02 "timezone and NTP server" <<'C'
[ "$(timedatectl show -p Timezone --value)" = Asia/Tokyo ]
[ "$(timedatectl show -p NTP --value)" = yes ]
grep -rhsE '^\s*NTP\s*=' /etc/systemd/timesyncd.conf /etc/systemd/timesyncd.conf.d/ | grep -q 'time\.lab'
C
task 18 node01 "LVM m1vg/m1lv on /m1/data" <<'C'
[ "$(vgs --noheadings -o pv_count m1vg | tr -d ' ')" = 2 ]
size=$(lvs --noheadings --units m --nosuffix -o lv_size m1vg/m1lv | tr -d ' ' | cut -d. -f1)
[ "$size" -ge 800 ]
[ "$size" -le 832 ]
[ "$(findmnt -n -o FSTYPE /m1/data)" = xfs ]
grep -Eq '^[^#]*\s/m1/data\s+xfs' /etc/fstab
C
task 19 node01 "swap file /m1swap" <<'C'
swapon --show=NAME --noheadings | grep -qx /m1swap
[ "$(stat -c %a /m1swap)" = 600 ]
[ "$(stat -c %s /m1swap)" -ge $((256*1024*1024)) ]
grep -Eq '^/m1swap\s+\S+\s+swap' /etc/fstab
C
task 20 node02 "NFS mount /mnt/m1share" <<'C'
findmnt -n -o SOURCE /mnt/m1share | grep -Eq '(node01|192\.168\.56\.11):/srv/m1share'
grep -Eq '^(node01|192\.168\.56\.11):/srv/m1share\s+/mnt/m1share\s+nfs' /etc/fstab
C

summary
