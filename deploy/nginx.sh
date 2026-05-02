#!/usr/bin/env bash
set -euo pipefail

CONF_DIR="/etc/nginx/conf.d"

echo "==> Copying nginx configs..."
for f in deploy/nginx/*.conf; do
  echo "    $f -> $CONF_DIR/$(basename "$f")"
  cp "$f" "$CONF_DIR/$(basename "$f")"
done

echo "==> Validating nginx config..."
nginx -t

echo "==> Reloading nginx..."
nginx -s reload

echo "==> Done."
