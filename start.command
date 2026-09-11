#!/bin/bash
# Double-click this to start the dashboard.
cd "$(dirname "$0")"
open http://localhost:4732
exec node server.mjs
