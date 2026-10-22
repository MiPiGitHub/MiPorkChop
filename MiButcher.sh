#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP=/opt/miporkchop
ENVFILE=/etc/miporkchop.env
SERVICE=/etc/systemd/system/porkchop.service
[[ "$EUID" -eq 0 ]] || { echo "Run with sudo"; exit 1; }
usage(){ echo "Usage: sudo bash MiButcher.sh {install|update|token-update|uninstall}"; }
write_config(){
  [[ -t 0 ]] || { echo "Interactive terminal required"; exit 1; }
  local url token tmp
  read -r -p "Cloudflare Worker HTTPS base URL: " url
  [[ "$url" =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?/?$ ]] || { echo "Invalid Worker HTTPS URL"; exit 1; }
  read -r -s -p "Device API token: " token; echo
  [[ -n "$token" && "$token" != *"'"* && "$token" != *$'\n'* && "$token" != *$'\r'* ]] || { echo "Invalid token"; exit 1; }
  tmp="$(mktemp /etc/.miporkchop.XXXXXX)"
  chmod 600 "$tmp"
  printf "WORKER_URL='%s'\nDEVICE_API_TOKEN='%s'\n" "$url" "$token" > "$tmp"
  chown root:root "$tmp"
  mv "$tmp" "$ENVFILE"
  unset token
}
replace_token(){
  [[ -f "$ENVFILE" ]] || { echo "Install first"; exit 1; }
  [[ -t 0 ]] || { echo "Interactive terminal required"; exit 1; }
  local token tmp
  read -r -s -p "New device API token: " token; echo
  [[ -n "$token" && "$token" != *"'"* && "$token" != *$'\n'* && "$token" != *$'\r'* ]] || { echo "Invalid token"; exit 1; }
  tmp="$(mktemp /etc/.miporkchop.XXXXXX)"
  chmod 600 "$tmp"
  grep -v '^DEVICE_API_TOKEN=' "$ENVFILE" > "$tmp" || true
  printf "DEVICE_API_TOKEN='%s'\n" "$token" >> "$tmp"
  chown root:root "$tmp"
  mv "$tmp" "$ENVFILE"
  unset token
}
install_files(){
  [[ -f "$ROOT/src/porkchop.py" && -f "$ROOT/systemd/porkchop.service" ]] || { echo "Source files missing"; exit 1; }
  python3 -c 'import gpiozero' || { echo "gpiozero missing; install Python GPIO dependency before continuing"; exit 1; }
  python3 -m py_compile "$ROOT/src/porkchop.py"
  id miporkchop &>/dev/null || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin miporkchop
  if getent group gpio >/dev/null; then usermod -aG gpio miporkchop; fi
  install -d -o root -g root -m 755 "$APP"
  install -o root -g root -m 644 "$ROOT/src/porkchop.py" "$APP/porkchop.py"
  install -o root -g root -m 644 "$ROOT/systemd/porkchop.service" "$SERVICE"
  systemctl daemon-reload
}
case "${1:-}" in
  install)
    [[ -f "$ENVFILE" ]] || write_config
    install_files
    systemctl disable porkchop.service >/dev/null 2>&1 || true
    echo "Installed; service not started or enabled."
    ;;
  update)
    [[ -f "$ENVFILE" ]] || { echo "Install first"; exit 1; }
    if systemctl is-active --quiet porkchop.service; then echo "Stop service before update"; exit 1; fi
    install_files
    echo "Updated; credentials preserved."
    ;;
  token-update)
    echo "Warning: token validation against Cloudflare is not yet implemented."
    replace_token
    if systemctl is-active --quiet porkchop.service; then systemctl restart porkchop.service; fi
    ;;
  uninstall)
    systemctl disable --now porkchop.service >/dev/null 2>&1 || true
    rm -f "$SERVICE"
    systemctl daemon-reload
    rm -rf "$APP"
    echo "Uninstalled; credentials preserved at $ENVFILE."
    ;;
  *) usage; exit 2 ;;
esac
