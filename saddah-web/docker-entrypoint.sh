#!/bin/sh
set -e

# Extract DNS nameserver from /etc/resolv.conf for nginx resolver directive
# Railway uses its own internal DNS which can resolve *.railway.internal hostnames
export NAMESERVER=$(grep -m1 '^nameserver' /etc/resolv.conf | awk '{print $2}')

echo "==> Detected DNS resolver: ${NAMESERVER}"
echo "==> API_URL: ${API_URL}"
echo "==> PORT: ${PORT}"

# Run nginx's built-in envsubst on templates
# This replaces ${PORT}, ${API_URL}, and ${NAMESERVER} in the nginx config template
envsubst '${PORT} ${API_URL} ${NAMESERVER}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

echo "==> Generated nginx config:"
cat /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
