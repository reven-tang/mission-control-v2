#!/bin/bash
# Mission Control v2.0 启动脚本
# Usage: ./scripts/start.sh [dev|prod]

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

ENV="${1:-prod}"
APP_NAME="mission-control"
PORT="${MC_PORT:-3000}"
PID_FILE="./logs/${APP_NAME}.pid"
LOG_DIR="./logs"

mkdir -p "$LOG_DIR" data

echo -e "${GREEN}Mission Control v2.0${NC}"
echo "======================"
echo ""

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装依赖...${NC}"
    npm install
fi

# 检查数据库
if [ ! -f "data/mc.db" ]; then
    echo -e "${YELLOW}初始化数据库...${NC}"
    npm run db:init
fi

# 停止已运行的服务
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo -e "${YELLOW}停止已有进程 (PID: $OLD_PID)...${NC}"
        kill "$OLD_PID"
        sleep 2
    fi
    rm -f "$PID_FILE"
fi

# 确保端口未被占用
if lsof -i :$PORT >/dev/null 2>&1; then
    echo -e "${YELLOW}端口 $PORT 被占用，释放...${NC}"
    kill $(lsof -t -i :$PORT) 2>/dev/null || true
    sleep 1
fi

if [ "$ENV" = "dev" ]; then
    echo -e "${GREEN}启动开发模式 (port $PORT)...${NC}"
    nohup npm run dev > "$LOG_DIR/out.log" 2> "$LOG_DIR/error.log" &
    echo $! > "$PID_FILE"
else
    echo -e "${GREEN}构建生产版本...${NC}"
    npm run build
    
    echo -e "${GREEN}启动生产服务 (port $PORT)...${NC}"
    nohup npm start > "$LOG_DIR/out.log" 2> "$LOG_DIR/error.log" &
    echo $! > "$PID_FILE"
fi

sleep 2

# 验证启动
PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
    echo -e "${GREEN}✓ 启动成功 (PID: $PID)${NC}"
    echo ""
    echo "  访问: http://localhost:$PORT"
    echo "  日志: tail -f $LOG_DIR/out.log"
    echo "  停止: ./scripts/stop.sh"
    echo "  状态: ./scripts/status.sh"
else
    echo -e "${RED}✗ 启动失败，查看日志: tail -50 $LOG_DIR/error.log${NC}"
    rm -f "$PID_FILE"
    exit 1
fi
