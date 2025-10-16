#!/bin/bash

# iCord Server Launcher
# 既存のサーバープロセスをチェックして、重複起動を防ぐ

echo "🔍 Checking for existing server processes..."

# 既存のnode index.jsプロセスを検索
EXISTING_PIDS=$(pgrep -f "node.*server/index.js")

if [ ! -z "$EXISTING_PIDS" ]; then
    echo "⚠️  Found existing server process(es): $EXISTING_PIDS"
    echo "🛑 Stopping existing processes..."
    pkill -f "node.*server/index.js"
    sleep 2
    echo "✅ Stopped existing processes"
fi

echo "🚀 Starting iCord server..."
cd "$(dirname "$0")"
node index.js