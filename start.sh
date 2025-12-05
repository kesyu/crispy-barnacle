#!/bin/bash

# Crispy Barnacle - Start Script
# Starts both backend and frontend servers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Crispy Barnacle Application...${NC}\n"

# Check if ports are already in use
if lsof -i:8080 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 8080 is already in use. Stopping existing backend...${NC}"
    pkill -f "bootRun\|java.*CrispyBarnacle" 2>/dev/null || true
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -i:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use. Stopping existing frontend...${NC}"
    pkill -f "vite\|npm.*dev" 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Start Backend
echo -e "${GREEN}📦 Starting Backend (Spring Boot)...${NC}"
cd "$BACKEND_DIR"
./gradlew bootRun --args='--spring.profiles.active=dev' > /tmp/crispy-backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo "Backend logs: /tmp/crispy-backend.log"

# Start Frontend
echo -e "${GREEN}🎨 Starting Frontend (Vite)...${NC}"
cd "$FRONTEND_DIR"
npm run dev > /tmp/crispy-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
echo "Frontend logs: /tmp/crispy-frontend.log"

# Wait for servers to start
echo -e "\n${BLUE}⏳ Waiting for servers to start...${NC}"
sleep 10

# Check if servers are running
BACKEND_RUNNING=false
FRONTEND_RUNNING=false

for i in {1..30}; do
    if lsof -i:8080 > /dev/null 2>&1; then
        BACKEND_RUNNING=true
    fi
    if lsof -i:3000 > /dev/null 2>&1; then
        FRONTEND_RUNNING=true
    fi
    
    if [ "$BACKEND_RUNNING" = true ] && [ "$FRONTEND_RUNNING" = true ]; then
        break
    fi
    
    sleep 1
done

# Display status
echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}        Application Status${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

if [ "$BACKEND_RUNNING" = true ]; then
    echo -e "${GREEN}✅ Backend:  Running on http://localhost:8080${NC}"
else
    echo -e "${YELLOW}❌ Backend:  Not running (check logs: /tmp/crispy-backend.log)${NC}"
fi

if [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${GREEN}✅ Frontend: Running on http://localhost:3000${NC}"
else
    echo -e "${YELLOW}❌ Frontend: Not running (check logs: /tmp/crispy-frontend.log)${NC}"
fi

echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo -e "  View backend logs:  tail -f /tmp/crispy-backend.log"
echo -e "  View frontend logs: tail -f /tmp/crispy-frontend.log"
echo -e "  Stop servers:       ./stop.sh"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

if [ "$BACKEND_RUNNING" = true ] && [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${GREEN}🎉 Application is ready!${NC}"
    echo -e "${GREEN}   Open http://localhost:3000 in your browser${NC}\n"
    
    # Keep script running and show logs
    echo -e "${BLUE}Press Ctrl+C to stop both servers${NC}\n"
    
    # Function to cleanup on exit
    cleanup() {
        echo -e "\n${YELLOW}Stopping servers...${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        kill $FRONTEND_PID 2>/dev/null || true
        pkill -f "bootRun\|java.*CrispyBarnacle" 2>/dev/null || true
        pkill -f "vite\|npm.*dev" 2>/dev/null || true
        lsof -ti:8080 | xargs kill -9 2>/dev/null || true
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}Servers stopped.${NC}"
        exit 0
    }
    
    trap cleanup SIGINT SIGTERM
    
    # Tail logs
    tail -f /tmp/crispy-backend.log /tmp/crispy-frontend.log 2>/dev/null || {
        echo -e "${BLUE}Servers are running. Logs are in /tmp/crispy-*.log${NC}"
        echo -e "${BLUE}Press Ctrl+C to stop...${NC}"
        wait
    }
else
    echo -e "${YELLOW}⚠️  Some servers failed to start. Check the logs above.${NC}"
    exit 1
fi

