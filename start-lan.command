#!/bin/bash
# Double-click to start with iPad/phone access (same Wi-Fi only).
cd "$(dirname "$0")"
exec env HOST=lan node server.mjs
