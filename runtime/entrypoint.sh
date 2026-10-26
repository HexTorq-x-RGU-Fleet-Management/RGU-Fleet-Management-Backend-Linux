#!/bin/sh
set -eu
umask 077
if [ "$(uname -m)" != x86_64 ]; then echo 'amd64 Linux is required' >&2; exit 1; fi
exec xvfb-run -a --server-args='-screen 0 1024x768x24 -nolisten tcp' "$@"
