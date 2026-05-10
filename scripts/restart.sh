#!/bin/bash
# Mission Control v2.0 重启脚本

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "重启 Mission Control..."
"./scripts/stop.sh"
sleep 2
"./scripts/start.sh" "${1:-prod}"
