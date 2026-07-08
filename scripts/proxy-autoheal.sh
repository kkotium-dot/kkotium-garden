#!/bin/bash
# PROXY-AUTOHEAL — detect stuck Tailscale Funnel / dead proxy and self-heal.
# Runbook: docs/runbook/PROXY_INCIDENT_RUNBOOK_2026-07-08.md (#205/#206/#215)
# Detection: curl the public Funnel URL. 401/200 = healthy (proxy reached).
#            503 = funnel serve stuck. timeout/other = unreachable.
# Heal: kickstart proxy if local dead, then serve reset + funnel re-assert.

TS=/Applications/Tailscale.app/Contents/MacOS/Tailscale
FUNNEL_URL="https://macbook-pro.tail36c35f.ts.net/"
LOG=/tmp/kkotium-proxy-autoheal.log
NOW=$(date "+%Y-%m-%d %H:%M:%S")

CODE=$(curl -sS -m 10 -o /dev/null -w "%{http_code}" "$FUNNEL_URL" 2>/dev/null)

if [ "$CODE" = "401" ] || [ "$CODE" = "200" ]; then
  echo "$NOW OK ($CODE)" >> "$LOG"
else
  echo "$NOW HEAL start (funnel_code=$CODE)" >> "$LOG"
  # 1) local proxy alive? (401 = auth-required = alive)
  LOCAL=$(curl -sS -m 5 -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null)
  if [ "$LOCAL" != "401" ] && [ "$LOCAL" != "200" ]; then
    echo "$NOW  local proxy dead (code=$LOCAL) -> kickstart" >> "$LOG"
    launchctl kickstart -k "gui/$(id -u)/com.kkotium.home-proxy" >> "$LOG" 2>&1
    sleep 2
  fi
  # 2) serve reset + funnel re-assert (fixes stuck serve/503)
  "$TS" serve reset >> "$LOG" 2>&1
  sleep 1
  "$TS" funnel --bg 3001 >> "$LOG" 2>&1
  sleep 2
  NEW=$(curl -sS -m 10 -o /dev/null -w "%{http_code}" "$FUNNEL_URL" 2>/dev/null)
  echo "$NOW HEAL done (new_code=$NEW)" >> "$LOG"
fi

# keep log bounded to last 300 lines
tail -300 "$LOG" > "${LOG}.tmp" 2>/dev/null && mv "${LOG}.tmp" "$LOG"
