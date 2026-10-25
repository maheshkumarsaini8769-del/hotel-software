#!/usr/bin/env bash
# Wrapper to start the phone screen keep-alive Python service
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
exec python3 "$DIR/keep_phone_awake.py" "$@"
