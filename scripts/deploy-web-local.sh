#!/bin/bash

# Build and run the AgentForge WebUI SPA locally on this host (e.g. a MacBook) — the
# mirror of deploy-web-ally.sh for single-host use. No Traefik, no remote, no ssh.
#
# Runs ONLY the React web client as a standalone nginx container that serves the
# static bundle and reverse-proxies /ws, /api, /uploads to an AgentForge backend
# reachable from this host (default http://host.docker.internal:8200 — the local
# AgentForge web app from agent-forge/scripts/deploy-local.sh). The container is
# published straight onto a localhost port; nothing leaves the machine.
#
# Knobs come from deploy-web.local.env (optional) — copy deploy-web.local.env.example.
#
# Usage: deploy-web-local.sh [--dev] [--no-build] [--no-cache] [--foreground]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# Local config is optional — the defaults give a working single-host run with the
# backend on :8200. Absent is fine. (deploy-web.env is the remote/Traefik one and
# is intentionally NOT sourced here — it would point at the Ally.)
if [ -f "${PROJECT_ROOT}/deploy-web.local.env" ]; then
    set -a; . "${PROJECT_ROOT}/deploy-web.local.env"; set +a
fi

WEB_PORT="${WEB_PORT:-8400}"
AGENT_BACKEND="${AGENT_BACKEND:-http://host.docker.internal:8200}"

# Upstream Host header for the nginx proxy. A same-origin/local backend keeps
# nginx's own $host; a remote vhost (e.g. behind Traefik) must receive its real
# hostname or Host-routing 404s. Derive it from AGENT_BACKEND unless preset.
if [ -z "${AGENT_BACKEND_HOST:-}" ]; then
    case "${AGENT_BACKEND}" in
        http://host.docker.internal*|http://localhost*|http://127.0.0.1*|http://'[::1]'*)
            AGENT_BACKEND_HOST='$host' ;;
        *)
            AGENT_BACKEND_HOST="${AGENT_BACKEND#*://}"       # strip scheme://
            AGENT_BACKEND_HOST="${AGENT_BACKEND_HOST%%/*}"   # strip any path
            ;;
    esac
fi
export WEB_PORT AGENT_BACKEND AGENT_BACKEND_HOST

COMPOSE_FILE="docker-compose.web.local.yml"

DETACH="-d"
BUILD="--build"
NO_CACHE_FLAG=""
DEV_MODE=""
while [ $# -gt 0 ]; do
    case "$1" in
        --no-build)   BUILD="" ;;
        --no-cache)   NO_CACHE_FLAG="--no-cache" ;;
        --foreground) DETACH="" ;;
        --dev|--hot)  DEV_MODE="1" ;;
        -h|--help)
            cat <<'HLP'
Usage: deploy-web-local.sh [--dev] [--no-build] [--no-cache] [--foreground]

Builds + runs the AgentForge WebUI SPA container locally on this host.

  --dev          Hot-reload dev server (Vite HMR) on WEB_PORT instead of the
                 nginx container — proxies /ws /api /uploads to AGENT_BACKEND,
                 no container, no rebuilds while iterating
  --no-build     Recreate the container without rebuilding the image
  --no-cache     Force a clean image build (no Docker layer cache)
  --foreground   Run attached (stream logs) instead of detached

Knobs read from deploy-web.local.env (optional): WEB_PORT (default 8400),
AGENT_BACKEND (default http://host.docker.internal:8200).

Tear down with: scripts/teardown-web-local.sh
HLP
            exit 0 ;;
        *) echo "Unknown flag: $1 (try --help)" >&2; exit 2 ;;
    esac
    shift
done

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

# --- Hot-reload dev mode: Vite dev server on the host (no container) ---------
# Serves on WEB_PORT with HMR; vite.config proxies /ws /api /uploads to
# VITE_BACKEND_URL. host.docker.internal is a container-only name, so the
# host-side dev server reaches a local backend via localhost (remote vhosts
# pass through untouched).
if [ -n "${DEV_MODE}" ]; then
    DEV_BACKEND="${AGENT_BACKEND/host.docker.internal/localhost}"
    echo -e "${BLUE}AgentForge WebUI — Vite dev server (hot reload)${NC}"
    echo -e "  url     : ${YELLOW}http://localhost:${WEB_PORT}${NC}"
    echo -e "  backend : ${YELLOW}${DEV_BACKEND}${NC}  (proxied: /ws /api /uploads)"
    echo ""
    if [ ! -d "node_modules" ]; then
        echo -e "${GREEN}Installing dependencies (first run)...${NC}"
        npm install
    fi
    # --strictPort: fail clearly if WEB_PORT is taken (e.g. the nginx container
    # is still up) instead of silently hopping to the next free port.
    exec env VITE_BACKEND_URL="${DEV_BACKEND}" npm run dev -- --port "${WEB_PORT}" --strictPort
fi

echo -e "${BLUE}AgentForge WebUI — local run on this host${NC}"
echo -e "  url     : ${YELLOW}http://localhost:${WEB_PORT}${NC}"
echo -e "  backend : ${YELLOW}${AGENT_BACKEND}${NC}  (proxied: /ws /api /uploads)"
[ "${AGENT_BACKEND_HOST}" != '$host' ] && echo -e "  host hdr: ${YELLOW}${AGENT_BACKEND_HOST}${NC}  (sent upstream + SNI)"
echo ""

if [ -n "${NO_CACHE_FLAG}" ]; then
    docker compose -f "${COMPOSE_FILE}" build --no-cache
    BUILD=""
fi
docker compose -f "${COMPOSE_FILE}" up ${DETACH} ${BUILD}

# Detached run: wait, then health-check. A foreground run already streamed logs.
if [ -n "${DETACH}" ]; then
    echo -e "\n${GREEN}Waiting for the container...${NC}"
    sleep 4
    docker compose -f "${COMPOSE_FILE}" ps
    echo ""
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${WEB_PORT}/" 2>/dev/null || echo 000)
    case "$code" in
        200|301|302|304) echo -e "  ${GREEN}[OK]${NC}   SPA reachable at http://localhost:${WEB_PORT} (HTTP $code)" ;;
        *)               echo -e "  ${YELLOW}[WAIT]${NC} SPA returned $code — give it a moment" ;;
    esac
    # Best-effort backend probe from the host. host.docker.internal is a
    # container-only name, so translate it to localhost for the host-side check.
    HOST_BACKEND="${AGENT_BACKEND/host.docker.internal/localhost}"
    if curl -sf "${HOST_BACKEND}/api/health" >/dev/null 2>&1; then
        echo -e "  ${GREEN}[OK]${NC}   backend reachable at ${HOST_BACKEND} (/api/health)"
    else
        echo -e "  ${YELLOW}[!]${NC}    backend not reachable at ${HOST_BACKEND}/api/health — is the AgentForge web app up?"
    fi
    echo ""
    echo -e "Web   : ${YELLOW}http://localhost:${WEB_PORT}${NC}"
    echo -e "Logs  : ${YELLOW}docker compose -f ${COMPOSE_FILE} logs -f${NC}"
    echo -e "Down  : ${YELLOW}scripts/teardown-web-local.sh${NC}"
fi
