#!/bin/bash
# Mission Control v2.0 停止脚本

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

APP_NAME="mission-control"
PID_FILE="./logs/${APP_NAME}.pid"
PORT="${MC_PORT:-3000}"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "停止 Mission Control (PID: $PID)..."
        kill "$PID"
        sleep 2
        # 强制清理
        if kill -0 "$PID" 2>/dev/null; then
            echo "进程未响应，强制终止..."
            kill -9 "$PID"
        fi
        rm -f "$PID_FILE"
        echo "✓ 已停止"
    else
        echo "进程已不存在，清理 PID 文件"
        rm -f "$PID_FILE"
    fi
else
    # 尝试通过端口查找
    if lsof -i :$PORT >/dev/null 2>&1; then
        echo "通过端口 $PORT 查找进程..."
        kill $(lsof -t -i :$PORT)
        echo "✓ 已停止"
    else
        echo "✗ 服务未运行"
    fi
fi
