#!/bin/bash
# Grades mock exam 3. Run on base: bash /lfcs/mock/check-mock-3.sh
cd "$(dirname "$0")" && source ./lib.sh
echo "Mock 3 results"

task 1 node01 "404 lines and unique IP count" <<'C'
diff <(grep ' 404 ' /opt/m3/access.log) /root/m3-404.txt
[ "$(tr -d ' \n' < /root/m3-ipcount.txt)" = "$(awk '{print $1}' /opt/m3/access.log | sort -u | wc -l)" ]
C
task 2 node01 "SUID list and world-writable fix" <<'C'
diff <(find /opt/m3/perm -type f -perm -4000 | sort) <(sort /root/m3-suid.txt)
[ -z "$(find /opt/m3/perm -type f -perm -o+w)" ]
[ "$(stat -c %a /opt/m3/perm/a)" = 4755 ]
C
task 3 node02 "m3-worker drop-in" <<'C'
[ "$(md5sum /lib/systemd/system/m3-worker.service | cut -d' ' -f1)" = "$(cat /var/lib/.m3unit.md5)" ]
ls /etc/systemd/system/m3-worker.service.d/*.conf
systemctl show -p Environment --value m3-worker | grep -qw 'LEVEL=debug'
[ "$(systemctl show -p CPUQuotaPerSecUSec --value m3-worker)" = 200ms ]
[ "$(systemctl show -p LimitNOFILE --value m3-worker)" = 2048 ]
[ "$(systemctl is-enabled m3-worker)" = enabled ]
systemctl is-active -q m3-worker
C
task 4 node01 "selective restore and archive listing" <<'C'
grep -qx 'setting_b=1' /srv/m3restore/etc/app/b.conf
[ ! -e /srv/m3restore/etc/app/a.conf ]
diff <(tar -tzf /opt/m3/backup.tar.gz) /root/m3-list.txt
C
task 5 node02 "repaired /dev/sdc mounted by UUID" <<'C'
grep -qx 'm3 important' /m3/recovered/important.txt
[ "$(findmnt -n -o SOURCE /m3/recovered)" = /dev/sdc ]
grep -Eq "^UUID=\"?$(blkid -s UUID -o value /dev/sdc)\"?\s+/m3/recovered\s+ext4" /etc/fstab
C
task 6 rocky "tree from local repo m3local" <<'C'
dnf repolist --enabled | grep -q '^m3local'
rpm -q tree
dnf info --installed tree | grep -Eq '^From repo\s*:\s*m3local'
C
task 7 node01 "image m3/site:1.0 and container m3-site" <<'C'
docker image inspect m3/site:1.0 >/dev/null
[ "$(docker inspect m3-site --format '{{.Config.Image}} {{.HostConfig.RestartPolicy.Name}} {{.State.Running}}')" = "m3/site:1.0 unless-stopped true" ]
curl -s -m5 localhost:8083/ | grep -q 'mock3 container site'
C
task 8 node01 "cron.d backup job" <<'C'
grep -Eq '^\s*0\s+(\*/6|0,6,12,18)\s+\*\s+\*\s+\*\s+root\s+/usr/bin/tar\s+-czf\s+/root/m3-etc\.tgz\s+/etc\s*$' /etc/cron.d/m3-backup
C
task 9 rocky "SELinux enforcing, boolean, log label" <<'C'
[ "$(getenforce)" = Enforcing ]
grep -qx 'SELINUX=enforcing' /etc/selinux/config
getsebool httpd_can_network_connect_db | grep -q -- '--> on$'
semanage boolean -l -C | grep -q '^httpd_can_network_connect_db'
semanage fcontext -l | grep -F '/srv/m3logs' | grep -q httpd_log_t
ls -Z /srv/m3logs/app.log | grep -q httpd_log_t
C
task 10 node02 "password aging m3a, lock m3b" <<'C'
chage -l m3a | grep -q 'Last password change.*password must be changed'
chage -l m3a | grep -Eq 'Minimum number of days between password change\s*:\s*2$'
chage -l m3a | grep -Eq 'Maximum number of days between password change\s*:\s*60$'
chage -l m3a | grep -Eq 'Number of days of warning before password expires\s*:\s*10$'
[ "$(passwd -S m3b | awk '{print $2}')" = L ]
getent passwd m3b | cut -d: -f7 | grep -Eq '/(usr/)?sbin/nologin$'
C
task 11 node02 "group m3team" <<'C'
if getent group m3old >/dev/null; then exit 1; fi
[ "$(getent group m3team | cut -d: -f3)" = 4200 ]
id -nG m3a | grep -qw m3team
id -nG m3b | grep -qw m3team
C
task 12 node02 "ACLs on /srv/m3proj" <<'C'
sudo -u m3a touch /srv/m3proj/.m3check
rm -f /srv/m3proj/.m3check
getfacl -p /srv/m3proj | grep -q '^group:m3team:r-x'
[ "$(stat -c %A /srv/m3proj | cut -c8-10)" = '---' ]
C
task 13 node02 "bridge br0" <<'C'
bridge link | grep -q 'master br0'
ip -4 -br addr show br0 | grep -q '10\.99\.0\.33/24'
grep -rqs br0 /etc/netplan/
C
task 14 node02 "IPv6 address and per-link DNS" <<'C'
ip -6 -br addr | grep -q 'fd00:99::12/64'
resolvectl dns | grep -q '192\.168\.56\.11'
resolvectl domain | grep -q 'mock3\.lab'
grep -rqs 'fd00:99::12/64' /etc/netplan/
C
task 15 rocky "firewalld http, 8443, forward 8084" <<'C'
systemctl is-active -q firewalld
firewall-cmd --permanent --list-services | grep -qw http
firewall-cmd --permanent --list-ports | grep -qw 8443/tcp
firewall-cmd --permanent --list-forward-ports | grep -q 'port=8084:proto=tcp:toport=80'
firewall-cmd --list-services | grep -qw http
C
task 16 base "chrony: node01 serves, node02 follows node01 only" <<'C'
ssh -n node01 'grep -rhsE "^\s*allow\s+192\.168\.56\.0/24" /etc/chrony/' | grep -q .
ssh -n node01 'systemctl is-active chrony' | grep -qx active
srcs=$(ssh -n node02 'grep -rhsE "^\s*(server|pool)\s" /etc/chrony/chrony.conf /etc/chrony/sources.d/')
echo "$srcs" | grep -qE 'node01|192\.168\.56\.11'
if echo "$srcs" | grep -vqE 'node01|192\.168\.56\.11'; then exit 1; fi
ssh -n node02 'chronyc -n sources' | grep -q '192\.168\.56\.11'
C
task 17 base "nginx load balancer on node01" <<'C'
out=$(for i in 1 2 3 4 5 6; do curl -s -m5 http://node01/; done)
echo "$out" | grep -q 'm3 backend 1'
echo "$out" | grep -q 'm3 backend 2'
ssh -n node01 'grep -rqs least_conn /etc/nginx/'
C
task 18 node01 "m3vg moved from sdb to sdc" <<'C'
[ "$(pvs --noheadings -o vg_name /dev/sdc | tr -d ' ')" = m3vg ]
if pvs /dev/sdb >/dev/null 2>&1; then exit 1; fi
[ "$(vgs --noheadings -o pv_count m3vg | tr -d ' ')" = 1 ]
grep -qx 'm3 keep' /m3/data/keep.txt
C
task 19 node02 "systemd automount /m3/auto" <<'C'
systemctl is-active -q m3-auto.automount
grep -Eq '^\S+:/srv/m3nfs\s+/m3/auto\s+nfs4?\s+\S*x-systemd\.automount' /etc/fstab
grep -qx 'm3 nfs' /m3/auto/README
findmnt -n -t nfs,nfs4 /m3/auto
C
task 20 node02 "swap partition on sdb by UUID" <<'C'
swapon --show=NAME,PRIO --noheadings | grep -Eq '^/dev/sdb1\s+10$'
grep -Eq "^UUID=\"?$(blkid -s UUID -o value /dev/sdb1)\"?\s+(none|swap)\s+swap\s+\S*pri=10" /etc/fstab
[ "$(lsblk -bno SIZE /dev/sdb1)" -ge $((500*1024*1024)) ]
C

summary
