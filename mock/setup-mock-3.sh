#!/bin/bash
# Prepares the VMs for mock exam 3. Restore the "clean" snapshot first, then run on base:
#   bash /lfcs/mock/setup-mock-3.sh
cd "$(dirname "$0")" && source ./lib.sh

step node01 "log file, permission tree, backup archive, site files" <<'S'
mkdir -p /opt/m3/perm/sub /opt/m3/src/etc/app /srv/m3site
: > /opt/m3/access.log
for i in $(seq 1 200); do
  code=200; [ $((i % 9)) -eq 0 ] && code=404
  echo "10.0.$((i % 7)).$((i % 13)) - - [01/Jan/2026:10:00:$((i % 60))] \"GET /p$i HTTP/1.1\" $code 512" >> /opt/m3/access.log
done
for f in a b c d e sub/f; do echo "$f" > /opt/m3/perm/$f; done
chmod 4755 /opt/m3/perm/a; chmod 2755 /opt/m3/perm/b; chmod 0777 /opt/m3/perm/c
chmod 0666 /opt/m3/perm/d; chmod 0644 /opt/m3/perm/e; chmod 4711 /opt/m3/perm/sub/f
for f in a b c; do echo "setting_$f=1" > /opt/m3/src/etc/app/$f.conf; done
tar -czf /opt/m3/backup.tar.gz -C /opt/m3/src etc
rm -rf /opt/m3/src
echo "mock3 container site" > /srv/m3site/index.html
S

step node01 "docker engine" <<'S'
export DEBIAN_FRONTEND=noninteractive
apt-get install -y -qq docker.io
S

step node01 "LVM volume m3vg/m3lv on /m3/data" <<'S'
pvcreate -q /dev/sdb && vgcreate -q m3vg /dev/sdb && lvcreate -q -y -L 1G -n m3lv m3vg
mkfs.xfs -q /dev/m3vg/m3lv && mkdir -p /m3/data
echo '/dev/m3vg/m3lv /m3/data xfs defaults 0 0' >> /etc/fstab
systemctl daemon-reload && mount /m3/data && echo "m3 keep" > /m3/data/keep.txt
S

step node01 "NFS export /srv/m3nfs" <<'S'
export DEBIAN_FRONTEND=noninteractive
apt-get install -y -qq nfs-kernel-server
mkdir -p /srv/m3nfs && echo "m3 nfs" > /srv/m3nfs/README
grep -q m3nfs /etc/exports || echo '/srv/m3nfs 192.168.56.0/24(ro,sync,no_subtree_check)' >> /etc/exports
exportfs -ra
S

step node02 "vendor service m3-worker" <<'S'
printf '#!/bin/bash\nwhile true; do echo "level=$LEVEL" >> /var/log/m3-worker.log; sleep 30; done\n' > /usr/local/bin/m3-worker.sh
chmod 755 /usr/local/bin/m3-worker.sh
cat > /lib/systemd/system/m3-worker.service <<'U'
[Unit]
Description=Mock 3 worker (vendor unit, do not edit)

[Service]
ExecStart=/usr/local/bin/m3-worker.sh

[Install]
WantedBy=multi-user.target
U
md5sum /lib/systemd/system/m3-worker.service | cut -d' ' -f1 > /var/lib/.m3unit.md5
systemctl daemon-reload
S

step node02 "corrupted filesystem on /dev/sdc" <<'S'
mkfs.ext4 -q -F /dev/sdc && mkdir -p /mnt/m3tmp && mount /dev/sdc /mnt/m3tmp
echo "m3 important" > /mnt/m3tmp/important.txt && umount /mnt/m3tmp && rmdir /mnt/m3tmp
dd if=/dev/zero of=/dev/sdc bs=1024 seek=1 count=1 conv=notrunc status=none
S

step node02 "users, group and ACL directory" <<'S'
getent group m3old >/dev/null || groupadd -g 4100 m3old
for u in m3a m3b; do id $u >/dev/null 2>&1 || useradd -m -s /bin/bash $u; done
echo 'm3a:Mock3pass!' | chpasswd; echo 'm3b:Mock3pass!' | chpasswd
usermod -aG m3old m3a
mkdir -p /srv/m3proj && chmod 770 /srv/m3proj
setfacl -m u:m3a:rwx /srv/m3proj && chmod 740 /srv/m3proj
S

step node02 "two web backends on 9101 and 9102" <<'S'
for n in 1 2; do
  mkdir -p /srv/m3b$n && echo "m3 backend $n" > /srv/m3b$n/index.html
  cat > /etc/systemd/system/m3-backend$n.service <<U
[Service]
User=www-data
ExecStart=/usr/bin/python3 -m http.server 910$n --directory /srv/m3b$n
[Install]
WantedBy=multi-user.target
U
done
systemctl daemon-reload && systemctl enable --now m3-backend1 m3-backend2
S

step rocky "local repository, SELinux permissive, log directory" <<'S'
dnf install -y -q createrepo_c dnf-plugins-core
dnf remove -y -q tree >/dev/null 2>&1 || true
mkdir -p /opt/m3repo && cd /opt/m3repo && dnf download -q tree && createrepo_c -q /opt/m3repo
setenforce 0
sed -i 's/^SELINUX=.*/SELINUX=permissive/' /etc/selinux/config
mkdir -p /srv/m3logs && echo "log" > /srv/m3logs/app.log
S

echo "Mock 3 is ready. Start a 2-hour timer and open mock/mock-3.md."
