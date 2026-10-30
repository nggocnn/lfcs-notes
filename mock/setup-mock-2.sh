#!/bin/bash
# Prepares the VMs for mock exam 2. Restore the "clean" snapshot first, then run on base:
#   bash /lfcs/mock/setup-mock-2.sh
cd "$(dirname "$0")" && source ./lib.sh

step node01 "process holding a deleted file" <<'S'
mkdir -p /var/tmp/m2
setsid nohup bash -c 'exec 3>/var/tmp/m2/held.log; fallocate -l 300M /var/tmp/m2/held.log; rm /var/tmp/m2/held.log; exec sleep infinity' >/dev/null 2>&1 </dev/null &
echo $! > /var/lib/.m2pid
S

step node01 "bare git repository /srv/git/m2.git" <<'S'
rm -rf /srv/git/m2.git /tmp/m2seed
git init -q --bare -b main /srv/git/m2.git
git clone -q /srv/git/m2.git /tmp/m2seed 2>/dev/null
cd /tmp/m2seed && git checkout -q -b main
echo "mock 2 repo" > README && git add README
git -c user.name=setup -c user.email=setup@lab commit -q -m "initial commit" && git push -q origin main
rm -rf /tmp/m2seed
S

step node01 "LVM volume m2vg/m2lv on /m2/data" <<'S'
pvcreate -q /dev/sdb && vgcreate -q m2vg /dev/sdb && lvcreate -q -y -L 500M -n m2lv m2vg
mkfs.ext4 -q /dev/m2vg/m2lv && mkdir -p /m2/data
echo '/dev/m2vg/m2lv /m2/data ext4 defaults 0 2' >> /etc/fstab
systemctl daemon-reload && mount /m2/data && echo "keep me" > /m2/data/keep.txt
S

step node01 "NFS exports for autofs" <<'S'
export DEBIAN_FRONTEND=noninteractive
apt-get install -y -qq nfs-kernel-server
for d in alpha beta; do mkdir -p /srv/m2exports/$d && echo "share $d" > /srv/m2exports/$d/README; done
grep -q m2exports /etc/exports || echo '/srv/m2exports 192.168.56.0/24(rw,sync,no_subtree_check)' >> /etc/exports
exportfs -ra
S

step node01 "libvirt and a cirros image" <<'S'
export DEBIAN_FRONTEND=noninteractive
apt-get install -y -qq qemu-kvm libvirt-daemon-system libvirt-clients virtinst
[ -f /var/lib/libvirt/images/m2.qcow2 ] || wget -q -O /var/lib/libvirt/images/m2.qcow2 https://download.cirros-cloud.net/0.6.2/cirros-0.6.2-x86_64-disk.img
S

step node01 "OpenLDAP directory dc=lab,dc=local" <<'S'
bash /lfcs/labs/setup-ldap-server.sh
S

step node02 "broken service and users" <<'S'
mkdir -p /srv/m2 && echo "mock2 app" > /srv/m2/index.html
printf '#!/bin/bash\nexec /usr/bin/python3 -m http.server 9002 --directory /srv/m2\n' > /usr/local/bin/m2-app.sh
chmod 644 /usr/local/bin/m2-app.sh
cat > /etc/systemd/system/m2-app.service <<'U'
[Unit]
Description=Mock 2 app
[Service]
User=m2app
ExecStart=m2-app.sh
[Install]
WantedBy=multi-user.target
U
systemctl daemon-reload
id m2limited >/dev/null 2>&1 || useradd -m -s /bin/bash m2limited
id m2ops >/dev/null 2>&1 || useradd -m -s /bin/bash m2ops
echo 'm2ops:Mock2pass!' | chpasswd
S

echo "Mock 2 is ready. Start a 2-hour timer and open mock/mock-2.md."
