#!/bin/bash

# Crispy Barnacle - Stop Script
# Stops both backend and frontend servers

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping Crispy Barnacle servers...${NC}"

# Stop backend
echo "Stopping backend..."
pkill -f "bootRun\|java.*CrispyBarnacle" 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Stop frontend
echo "Stopping frontend..."
pkill -f "vite\|npm.*dev" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

sleep 1

# Verify
if ! lsof -i:8080 > /dev/null 2>&1 && ! lsof -i:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All servers stopped${NC}"
else
    echo -e "${YELLOW}⚠️  Some processes may still be running${NC}"
fi

