#!/bin/bash
# Grades mock exam 2. Run on base: bash /lfcs/mock/check-mock-2.sh
cd "$(dirname "$0")" && source ./lib.sh
echo "Mock 2 results"

task 1 node01 "deleted file released, holder PID recorded" <<'C'
[ "$(tr -d ' \n' < /root/m2-holder.pid)" = "$(cat /var/lib/.m2pid)" ]
if lsof +L1 2>/dev/null | grep -q /var/tmp/m2; then exit 1; fi
C
task 2 node01 "branch hotfix pushed with FIX.txt" <<'C'
git --git-dir=/srv/git/m2.git show hotfix:FIX.txt | grep -qx fixed
git --git-dir=/srv/git/m2.git show hotfix:README | grep -q 'mock 2 repo'
C
task 3 node02 "m2-app.service fixed" <<'C'
[ "$(systemctl is-enabled m2-app)" = enabled ]
systemctl is-active -q m2-app
[ "$(systemctl show -p User --value m2-app)" = m2app ]
curl -s -m5 localhost:9002/ | grep -q 'mock2 app'
C
task 4 node01 "key and CSR in /root/m2/csr" <<'C'
openssl req -in /root/m2/csr/app.csr -noout -verify
openssl req -in /root/m2/csr/app.csr -noout -subject | grep -Eq 'O ?= ?LFCS'
openssl req -in /root/m2/csr/app.csr -noout -subject | grep -Eq 'CN ?= ?app\.mock2\.lab'
[ "$(openssl req -in /root/m2/csr/app.csr -noout -pubkey | openssl sha256)" = "$(openssl pkey -in /root/m2/csr/app.key -pubout | openssl sha256)" ]
C
task 5 node01 "m2-clean timer" <<'C'
[ "$(systemctl is-enabled m2-clean.timer)" = enabled ]
systemctl is-active -q m2-clean.timer
systemctl show m2-clean.timer -p TimersCalendar | grep -q '01:30:00'
systemctl cat m2-clean.service | grep -Eq '^ExecStart=.*find /var/tmp .*\*\.old.*-delete'
C
task 6 node02 "rootless podman m2-web with systemd" <<'C'
uid=$(id -u vagrant)
loginctl show-user vagrant -p Linger | grep -qx 'Linger=yes'
[ "$(sudo -u vagrant XDG_RUNTIME_DIR=/run/user/$uid systemctl --user is-enabled container-m2-web)" = enabled ]
curl -s -m5 localhost:8082/ | grep -qi nginx
C
task 7 node01 "libvirt VM m2vm" <<'C'
[ "$(virsh domstate m2vm)" = running ]
virsh dominfo m2vm | grep -Eq '^Autostart:\s+enable'
virsh dominfo m2vm | grep -Eq '^Max memory:\s+262144 KiB'
C
task 8 rocky "httpd on 8089 with SELinux" <<'C'
[ "$(getenforce)" = Enforcing ]
semanage port -l | grep '^http_port_t' | grep -qw 8089
ss -tlnp | grep ':8089 ' | grep -q httpd
[ "$(systemctl is-enabled httpd)" = enabled ]
C
task 9 node01 "br_netfilter and bridge sysctl" <<'C'
lsmod | grep -q '^br_netfilter'
grep -rqs '^br_netfilter' /etc/modules-load.d/
[ "$(sysctl -n net.bridge.bridge-nf-call-iptables)" = 1 ]
grep -rqsE '^\s*net\.bridge\.bridge-nf-call-iptables\s*=\s*1' /etc/sysctl.d/
C
task 10 node02 "LDAP users via SSSD" <<'C'
[ "$(getent passwd jdoe | cut -d: -f3)" = 10001 ]
getent group developers | grep -q asmith
grep -E '^passwd:' /etc/nsswitch.conf | grep -qw sss
grep -q pam_mkhomedir /etc/pam.d/common-session
C
task 11 node02 "M2_ENV for login shells, skel file" <<'C'
[ "$(env -i bash -lc 'echo $M2_ENV')" = exam ]
[ -f /etc/profile.d/m2.sh ]
[ -f /etc/skel/.m2rc ]
C
task 12 node02 "limits for m2limited" <<'C'
grep -rhsE '^\s*m2limited\s+(hard|-)\s+nproc\s+50\s*$' /etc/security/limits.conf /etc/security/limits.d/ | grep -q .
grep -rhsE '^\s*m2limited\s+(soft|-)\s+nofile\s+4096\s*$' /etc/security/limits.conf /etc/security/limits.d/ | grep -q .
C
task 13 node02 "bond0 active-backup" <<'C'
grep -q 'Bonding Mode: fault-tolerance (active-backup)' /proc/net/bonding/bond0
[ "$(grep -c '^Slave Interface' /proc/net/bonding/bond0)" = 2 ]
ip -4 -br addr show bond0 | grep -q '10\.99\.0\.22/24'
grep -rqs bond0 /etc/netplan/
C
task 14 base "key login as m2ops via alias m2" <<'C'
[ -f ~/.ssh/m2_ed25519 ]
ssh -n -o BatchMode=yes -o ConnectTimeout=5 m2 whoami | grep -qx m2ops
C
task 15 base "nftables on rocky" <<'C'
code=$(curl -s -m5 -o /dev/null -w '%{http_code}' http://rocky:8081/)
case "$code" in 200|403) ;; *) exit 1 ;; esac
ssh -n rocky 'sudo nft list ruleset' | grep -q 'tcp dport 23 drop'
ssh -n rocky 'systemctl is-enabled nftables' | grep -qx enabled
ssh -n rocky 'sudo grep -q 8081 /etc/sysconfig/nftables.conf'
C
task 16 node02 "hostname and static names" <<'C'
[ "$(hostnamectl --static)" = node02.mock2.lab ]
[ "$(getent hosts db.mock2 | awk '{print $1}')" = 192.168.56.13 ]
[ "$(getent hosts api.mock2 | awk '{print $1}')" = 192.168.56.11 ]
C
task 17 base "reverse proxy node01 -> node02:9002" <<'C'
curl -s -m5 http://node01/ | grep -q 'mock2 app'
ssh -n node01 'sudo nginx -t' 2>&1 | grep -q 'successful'
C
task 18 node01 "m2lv extended to 1.5 GiB" <<'C'
[ "$(vgs --noheadings -o pv_count m2vg | tr -d ' ')" = 2 ]
[ "$(lvs --noheadings --units m --nosuffix -o lv_size m2vg/m2lv | tr -d ' ' | cut -d. -f1)" -ge 1536 ]
[ "$(df -BM --output=size /m2/data | tail -1 | tr -dc 0-9)" -ge 1400 ]
grep -qx 'keep me' /m2/data/keep.txt
C
task 19 node02 "autofs /m2auto/<name>" <<'C'
[ "$(systemctl is-enabled autofs)" = enabled ]
grep -qx 'share beta' /m2auto/beta/README
findmnt -n -o SOURCE /m2auto/beta | grep -q '/srv/m2exports/beta'
C
task 20 node02 "label mount and tmpfs" <<'C'
[ "$(blkid -s LABEL -o value /dev/sdb)" = M2DATA ]
findmnt -n -o OPTIONS /m2/label | grep -qw noexec
findmnt -n -o OPTIONS /m2/label | grep -qw nodev
grep -Eq '^LABEL=M2DATA\s+/m2/label\s+ext4' /etc/fstab
[ "$(findmnt -n -o FSTYPE /m2/tmp)" = tmpfs ]
grep -Eq '^\S+\s+/m2/tmp\s+tmpfs\s+\S*size=64M' /etc/fstab
C

summary
