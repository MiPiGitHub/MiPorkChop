#!/usr/bin/env bash
set -Eeuo pipefail
APP=/opt/miporkchop
ENV=/etc/miporkchop.env
SERVICE=/etc/systemd/system/porkchop.service
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ "$EUID" == 0 ]] || { echo "Run with sudo"; exit 1; }
usage(){ echo "Usage: sudo bash MiButcher.sh {install|update|token-update|uninstall}"; }
put_token(){
  [[ -t 0 ]] || { echo "Interactive terminal required"; exit 1; }
  local token tmp
  read -r -s -p "Device API token: " token; echo
  [[ -n "$token" && "$token" != *"'"* && "$token" != *$'\n'* ]] || { echo "Invalid token"; exit 1; }
  tmp="$(mktemp /etc/.miporkchop.XXXXXX)"
  chmod 600 "$tmp"
  [[ ! -f "$ENV" ]] || grep -v '^DEVICE_API_TOKEN=' "$ENV" > "$tmp" || true
  printf "DEVICE_API_TOKEN='%s'\n" "$token" >> "$tmp"
  chown root:root "$tmp"; mv "$tmp" "$ENV"
  unset token
}
put_url(){
  [[ -t 0 ]] || { echo "Interactive terminal required"; exit 1; }
  local url tmp
  read -r -p "Cloudflare Worker HTTPS base URL: " url
  [[ "$url" == https://* && "$url" != *"'"* && "$url" != *
  [[ -f "$ROOT/src/porkchop.py" && -f "$ROOT/systemd/porkchop.service" ]] || { echo "Missing source files"; exit 1; }
  id miporkchop &>/dev/null || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin miporkchop
  getent group gpio >/dev/null && usermod -aG gpio miporkchop || true
  install -d -m 755 "$APP"
  install -m 644 "$ROOT/src/porkchop.py" "$APP/porkchop.py"
  install -m 644 "$ROOT/systemd/porkchop.service" "$SERVICE"
  python3 -m py_compile "$APP/porkchop.py"\n  python3 -c "import gpiozero" || echo "WARNING: gpiozero dependency missing; install it before starting."
  systemctl daemon-reload
}
case "${1:-}" in
 install)
   install_files
   if [[ ! -f "$ENV" ]]; then
     echo "Cloudflare token is optional until Python cloud reporting is implemented."
     read -r -p "Configure device token now? [y/N] " ans
     [[ "$ans" == [yY] ]] && put_token || true
   fi
   systemctl disable porkchop.service >/dev/null 2>&1 || true
   echo "Installed but not started. Check GPIO permissions and Python gpiozero dependency."
   ;;
 update)
   systemctl is-active --quiet porkchop.service && { echo "Stop service before update"; exit 1; }
   install_files
   echo "Updated; credentials preserved."
   ;;
 token-update)
   echo "Warning: token is not validated remotely by this prototype."
   put_token
   if systemctl is-active --quiet porkchop.service; then systemctl restart porkchop.service; fi
   ;;
 uninstall)
   systemctl disable --now porkchop.service >/dev/null 2>&1 || true
   rm -f "$SERVICE"
   systemctl daemon-reload
   rm -rf "$APP"
   echo "Uninstalled. Credentials preserved at $ENV."
   ;;
 *) usage; exit 2 ;;
esac
\\n'* ]] || { echo "Invalid HTTPS URL"; exit 1; }
  tmp="$(mktemp /etc/.miporkchop.XXXXXX)"
  chmod 600 "$tmp"
  [[ ! -f "$ENV" ]] || grep -v '^WORKER_URL=' "$ENV" > "$tmp" || true
  printf "WORKER_URL='%s'\\n" "$url" >> "$tmp"
  chown root:root "$tmp"; mv "$tmp" "$ENV"
}
install_files(){
  [[ -f "$ROOT/src/porkchop.py" && -f "$ROOT/systemd/porkchop.service" ]] || { echo "Missing source files"; exit 1; }
  id miporkchop &>/dev/null || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin miporkchop
  getent group gpio >/dev/null && usermod -aG gpio miporkchop || true
  install -d -m 755 "$APP"
  install -m 644 "$ROOT/src/porkchop.py" "$APP/porkchop.py"
  install -m 644 "$ROOT/systemd/porkchop.service" "$SERVICE"
  python3 -m py_compile "$APP/porkchop.py"
  systemctl daemon-reload
}
case "${1:-}" in
 install)
   install_files
   if [[ ! -f "$ENV" ]]; then
     echo "Cloudflare token is optional until Python cloud reporting is implemented."
     read -r -p "Configure device token now? [y/N] " ans
     [[ "$ans" == [yY] ]] && put_token || true
   fi
   systemctl disable porkchop.service >/dev/null 2>&1 || true
   echo "Installed but not started. Check GPIO permissions and Python gpiozero dependency."
   ;;
 update)
   systemctl is-active --quiet porkchop.service && { echo "Stop service before update"; exit 1; }
   install_files
   echo "Updated; credentials preserved."
   ;;
 token-update)
   echo "Warning: token is not validated remotely by this prototype."
   put_token
   if systemctl is-active --quiet porkchop.service; then systemctl restart porkchop.service; fi
   ;;
 uninstall)
   systemctl disable --now porkchop.service >/dev/null 2>&1 || true
   rm -f "$SERVICE"
   systemctl daemon-reload
   rm -rf "$APP"
   echo "Uninstalled. Credentials preserved at $ENV."
   ;;
 *) usage; exit 2 ;;
esac
