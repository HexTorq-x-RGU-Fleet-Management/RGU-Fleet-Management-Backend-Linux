#!/bin/sh
set -eu
script=$1
shift
task_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
case "$script" in
  "$task_root/vendor/camera-sdk/native/pool.py"|"$task_root/vendor/camera-sdk/native/probe.py"|"$task_root/tools/check-sdk.py") ;;
  *) echo 'Unsupported receiver script' >&2; exit 2 ;;
esac
exec "${WINE_BIN:-/usr/lib/wine/wine64}" "${HIK_WINE_PYTHON:-/opt/windows-python/python.exe}" "Z:$script" "$@"
