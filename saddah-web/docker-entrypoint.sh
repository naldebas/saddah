#!/bin/sh
set -e

# Extract DNS nameserver from /etc/resolv.conf for nginx resolver directive
# Railway uses its own internal DNS which can resolve *.railway.internal hostnames
RAW_NS=$(grep -m1 '^nameserver' /etc/resolv.conf | awk '{print $2}')

# Wrap IPv6 addresses in brackets for nginx resolver directive
case "$RAW_NS" in
  *:*) export NAMESERVER="[${RAW_NS}]" ;;
  *)   export NAMESERVER="${RAW_NS}" ;;
esac

echo "==> Detected DNS resolver: ${NAMESERVER} (raw: ${RAW_NS})"
echo "==> API_URL: ${API_URL}"
echo "==> PORT: ${PORT}"

# Run envsubst ONLY on our custom variables, preserving nginx's own $host, $uri, etc.
envsubst '${PORT} ${API_URL} ${NAMESERVER}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

echo "==> Generated nginx config:"
cat /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
