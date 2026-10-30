#!/bin/bash
# Shared helpers for the mock setup and check scripts.
# Run the scripts on base as user vagrant: bash /lfcs/mock/check-mock-1.sh

PASS=0
TOTAL=0

# on <host>: run the bash script from stdin on <host> as root (on base: as vagrant)
on() {
  local host=$1
  if [ "$host" = base ]; then
    bash -s
  else
    ssh -o BatchMode=yes -o ConnectTimeout=5 "$host" sudo bash -s
  fi
}

# task <id> <host> <description>: the check script on stdin must exit 0 for PASS.
# Each check runs under "set -e", so every line must succeed. Don't use "! cmd" or
# "a && b" on one line: set -e ignores both. Use "if cmd; then exit 1; fi" and separate lines.
task() {
  local id=$1 host=$2 desc=$3
  TOTAL=$((TOTAL + 1))
  if { echo 'set -e'; cat; } | on "$host" >/dev/null 2>&1; then
    PASS=$((PASS + 1))
    printf '  PASS  %-4s %-7s %s\n' "$id" "$host" "$desc"
  else
    printf '  FAIL  %-4s %-7s %s\n' "$id" "$host" "$desc"
  fi
}

summary() {
  local pct=$((PASS * 100 / TOTAL))
  printf '\nScore: %d/%d tasks = %d%%  (pass mark 67%%, aim for 80%%+)\n' "$PASS" "$TOTAL" "$pct"
}

# setup helper: print a step and run its script on a host, stop on error
step() {
  local host=$1 desc=$2
  printf '  setup %-7s %s\n' "$host" "$desc"
  { echo 'set -e'; cat; } | on "$host" >/dev/null || { echo "setup failed on $host: $desc" >&2; exit 1; }
}
