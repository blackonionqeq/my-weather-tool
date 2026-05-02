#!/usr/bin/env bash
set -euo pipefail

DIST_DIR="/var/www/my-weather-tool"

pnpm build
rm -rf "$DIST_DIR"
cp -r dist "$DIST_DIR"
echo "Deployed to $DIST_DIR"
