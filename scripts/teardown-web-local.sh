#!/bin/bash

# Tear down the local AgentForge WebUI SPA container — the mirror of teardown-web-remote.sh
# for single-host use. There is no persistent data (the bundle is rebuilt from
# source on the next deploy), so nothing is lost.
#
# Usage: teardown-web-local.sh [--rmi] [-y]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# Defaults so compose can interpolate WEB_PORT/AGENT_BACKEND even on `down`.
if [ -f "${PROJECT_ROOT}/deploy-web.local.env" ]; then
    set -a; . "${PROJECT_ROOT}/deploy-web.local.env"; set +a
fi
WEB_PORT="${WEB_PORT:-8400}"
AGENT_BACKEND="${AGENT_BACKEND:-http://host.docker.internal:8200}"
export WEB_PORT AGENT_BACKEND

COMPOSE_FILE="docker-compose.web.local.yml"

REMOVE_IMAGE=false
for arg in "$@"; do
    case "$arg" in
        --rmi)    REMOVE_IMAGE=true ;;
        -h|--help)
            cat <<'HLP'
Usage: teardown-web-local.sh [--rmi] [-y]

Stops and removes the local AgentForge WebUI SPA container. No persistent data exists.

  --rmi        Also remove the built agentforge-web-ui:local image
  -y, --yes    Skip the confirmation prompt
HLP
            exit 0 ;;
        *) echo "Unknown flag: ${arg} (try --help)" >&2; exit 2 ;;
    esac
done

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}AgentForge WebUI — local teardown${NC}"

echo -e "\n${GREEN}Stopping the SPA...${NC}"
docker compose -f "${COMPOSE_FILE}" down --remove-orphans

if [ "${REMOVE_IMAGE}" = true ]; then
    echo -e "\n${GREEN}Removing the built image...${NC}"
    docker image rm agentforge-web-ui:local 2>/dev/null || true
fi

echo -e "\n${GREEN}Done.${NC} Bring it back with: ${YELLOW}scripts/deploy-web-local.sh${NC}"
