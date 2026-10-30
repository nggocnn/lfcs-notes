#!/bin/bash
# Prepares the VMs for mock exam 1. Restore the "clean" snapshot first, then run on base:
#   bash /lfcs/mock/setup-mock-1.sh
cd "$(dirname "$0")" && source ./lib.sh

step node01 "users, files and report script" <<'S'
id m1user >/dev/null 2>&1 || useradd -m -s /bin/bash m1user
mkdir -p /opt/m1/data/{a,b,c}
fallocate -l 2M /opt/m1/data/a/report-2025.bin
fallocate -l 3M /opt/m1/data/b/archive.bin
fallocate -l 500K /opt/m1/data/b/small.bin
fallocate -l 5M /opt/m1/data/c/root-owned.bin
fallocate -l 4M /opt/m1/data/c/m1-dump.bin
chown m1user: /opt/m1/data/a/report-2025.bin /opt/m1/data/b/archive.bin /opt/m1/data/b/small.bin /opt/m1/data/c/m1-dump.bin
printf '#!/bin/bash\ndf -h > /tmp/report.txt\n' > /usr/local/bin/report.sh && chmod 755 /usr/local/bin/report.sh
S

step node01 "NFS export /srv/m1share" <<'S'
export DEBIAN_FRONTEND=noninteractive
apt-get install -y -qq nfs-kernel-server
mkdir -p /srv/m1share && chmod 1777 /srv/m1share && echo "mock1 share" > /srv/m1share/README
grep -q m1share /etc/exports || echo '/srv/m1share 192.168.56.0/24(rw,sync,no_subtree_check)' >> /etc/exports
exportfs -ra
S

step node02 "web content, groups, docker engine, nfs client" <<'S'
export DEBIAN_FRONTEND=noninteractive
mkdir -p /srv/m1 && echo "mock1 service" > /srv/m1/index.html
getent group m1ops >/dev/null || groupadd m1ops
id m1op >/dev/null 2>&1 || useradd -m -G m1ops m1op
mkdir -p /srv/m1acl && chmod 750 /srv/m1acl
apt-get install -y -qq docker.io nfs-common
S

step rocky "web content" <<'S'
mkdir -p /srv/m1web && echo "mock1 selinux" > /srv/m1web/index.html
S

echo "Mock 1 is ready. Start a 2-hour timer and open mock/mock-1.md."
