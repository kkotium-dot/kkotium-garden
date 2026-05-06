#!/bin/bash
# scripts/install-home-proxy.sh
# Installs the home-proxy launchd job for Naver Commerce API relay.
#
# Usage (꽃졔 to run once):
#   bash scripts/install-home-proxy.sh
#
# Re-installation: safe to run again. Will unload old job first if exists.

set -e

PROJECT_DIR="/Users/jyekkot/Desktop/kkotium-garden"
PLIST_NAME="com.kkotium.home-proxy.plist"
SOURCE_PLIST="${PROJECT_DIR}/scripts/${PLIST_NAME}"
TARGET_PLIST="${HOME}/Library/LaunchAgents/${PLIST_NAME}"

echo "================================================================"
echo "꽃틔움 가든 — home-proxy launchd 설치"
echo "================================================================"
echo ""

# 1. Prerequisite check
echo "[1/6] Prerequisite check..."
if [ ! -f "${SOURCE_PLIST}" ]; then
  echo "  ERROR: Source plist not found at ${SOURCE_PLIST}"
  exit 1
fi
if [ ! -f "${PROJECT_DIR}/scripts/home-proxy.mjs" ]; then
  echo "  ERROR: home-proxy.mjs not found"
  exit 1
fi
if ! command -v node &> /dev/null; then
  echo "  ERROR: node not in PATH. Install Node.js (brew install node) first."
  exit 1
fi
NODE_PATH=$(which node)
echo "  OK: node at ${NODE_PATH}"
echo "  OK: scripts directory complete"
echo ""

# 2. Unload existing job if present
echo "[2/6] Unload existing launchd job (if any)..."
if launchctl list | grep -q com.kkotium.home-proxy; then
  launchctl unload "${TARGET_PLIST}" 2>/dev/null || true
  echo "  OK: existing job unloaded"
else
  echo "  OK: no existing job"
fi
echo ""

# 3. Copy plist to LaunchAgents
echo "[3/6] Copy plist to ~/Library/LaunchAgents/..."
mkdir -p "${HOME}/Library/LaunchAgents"
cp "${SOURCE_PLIST}" "${TARGET_PLIST}"
echo "  OK: plist installed at ${TARGET_PLIST}"
echo ""

# 4. Load plist
echo "[4/6] Load launchd job..."
launchctl load "${TARGET_PLIST}"
echo "  OK: job loaded"
echo ""

# 5. Wait for proxy to start, then verify
echo "[5/6] Wait 3 seconds for proxy to start, then verify..."
sleep 3
if curl -sS http://127.0.0.1:3001/health > /tmp/home-proxy-health.json 2>&1; then
  echo "  OK: health check passed"
  cat /tmp/home-proxy-health.json
  echo ""
else
  echo "  ERROR: health check failed"
  echo "  Last 20 lines of /tmp/kkotium-home-proxy.log:"
  tail -20 /tmp/kkotium-home-proxy.log 2>/dev/null || echo "  (no log file yet)"
  echo ""
  echo "  Last 20 lines of /tmp/kkotium-home-proxy.err:"
  tail -20 /tmp/kkotium-home-proxy.err 2>/dev/null || echo "  (no err file yet)"
  exit 1
fi
echo ""

# 6. Show next steps
echo "================================================================"
echo "[6/6] 설치 완료. 다음 단계:"
echo "================================================================"
echo ""
echo "  1) Tailscale Funnel 시작 (1회):"
echo "     tailscale funnel --bg http://localhost:3001"
echo ""
echo "  2) Funnel URL 확인:"
echo "     tailscale funnel status"
echo ""
echo "  3) Vercel 환경변수 NAVER_PROXY_URL 업데이트 (해당 Funnel URL)"
echo ""
echo "  4) Vercel redeploy (다음 git commit + push로 자동)"
echo ""
echo "  관리 명령어:"
echo "     home-proxy 상태:   launchctl list | grep kkotium"
echo "     home-proxy 로그:   tail -f /tmp/kkotium-home-proxy.log"
echo "     home-proxy 헬스:   curl http://127.0.0.1:3001/health"
echo "     home-proxy 중지:   launchctl unload ~/Library/LaunchAgents/com.kkotium.home-proxy.plist"
echo "     home-proxy 시작:   launchctl load   ~/Library/LaunchAgents/com.kkotium.home-proxy.plist"
echo "     Funnel 중지:       tailscale funnel --https=443 off"
echo ""
echo "================================================================"
