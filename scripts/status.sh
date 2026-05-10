#!/bin/bash
# Mission Control v2.0 状态检查脚本

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

APP_NAME="mission-control"
PID_FILE="./logs/${APP_NAME}.pid"
PORT="${MC_PORT:-3000}"

echo "Mission Control v2.0 状态"
echo "=========================="

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "✓ 运行中 (PID: $PID, Port: $PORT)"
        # 显示内存占用
        ps -o rss= -p "$PID" | awk '{printf "  内存: %.1f MB\n", $1/1024}'
    else
        echo "✗ 进程不存在 (PID 文件残留)"
        rm -f "$PID_FILE"
    fi
else
    if lsof -i :$PORT >/dev/null 2>&1; then
        PID=$(lsof -t -i :$PORT)
        echo "⚠ 运行中但无 PID 文件 (PID: $PID, Port: $PORT)"
        echo "  建议: ./scripts/start.sh 重新启动以生成 PID 文件"
    else
        echo "✗ 未运行"
    fi
fi

echo ""
echo "最近日志 (最后 5 行):"
tail -5 ./logs/out.log 2>/dev/null || echo "  无日志"
