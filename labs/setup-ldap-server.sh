#!/bin/bash
# Installs a small OpenLDAP directory for the LDAP client labs.
# Run on node01 as root: sudo bash /lfcs/labs/setup-ldap-server.sh
#   base DN  dc=lab,dc=local     admin  cn=admin,dc=lab,dc=local / admin
#   users    jdoe (10001), asmith (10002), password = <user>123
#   group    developers (10000) with both users
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

debconf-set-selections <<'EOT'
slapd slapd/domain string lab.local
slapd shared/organization string Lab
slapd slapd/password1 password admin
slapd slapd/password2 password admin
slapd slapd/no_configuration boolean false
slapd slapd/purge_database boolean true
slapd slapd/move_old_database boolean true
EOT
apt-get install -y -qq slapd ldap-utils >/dev/null
dpkg-reconfigure -f noninteractive slapd >/dev/null 2>&1

user_ldif() { # name uid
  cat <<EOT
dn: uid=$1,ou=people,dc=lab,dc=local
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
uid: $1
cn: $1
sn: $1
uidNumber: $2
gidNumber: 10000
homeDirectory: /home/$1
loginShell: /bin/bash
userPassword: $(slappasswd -s "${1}123")

EOT
}

{
  printf 'dn: ou=people,dc=lab,dc=local\nobjectClass: organizationalUnit\nou: people\n\n'
  printf 'dn: ou=groups,dc=lab,dc=local\nobjectClass: organizationalUnit\nou: groups\n\n'
  printf 'dn: cn=developers,ou=groups,dc=lab,dc=local\nobjectClass: posixGroup\ncn: developers\ngidNumber: 10000\nmemberUid: jdoe\nmemberUid: asmith\n\n'
  user_ldif jdoe 10001
  user_ldif asmith 10002
} > /tmp/lab.ldif

ldapadd -c -x -D cn=admin,dc=lab,dc=local -w admin -f /tmp/lab.ldif >/dev/null || true
rm -f /tmp/lab.ldif
ldapsearch -x -LLL -H ldap://localhost -b dc=lab,dc=local '(objectClass=posixAccount)' uid uidNumber
echo "LDAP ready on ldap://node01 (base dc=lab,dc=local)"
