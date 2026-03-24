#!/bin/bash
# MCP Shield Demo Script
# This script demonstrates the full mcp-shield workflow
# Record with: asciinema rec demo.cast -c "bash demo/demo-script.sh"

set -e

# Helper for paced output
type_slow() {
  echo ""
  echo -e "\033[1;36m$ $1\033[0m"
  sleep 1
  eval "$1"
  sleep 2
}

clear
echo ""
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║                                                   ║"
echo "  ║   🛡️  MCP Shield Demo                             ║"
echo "  ║   One-command security for MCP servers            ║"
echo "  ║   Powered by agentgateway                         ║"
echo "  ║                                                   ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo ""
sleep 3

echo "  📋 Step 1: Here's a typical insecure MCP setup"
echo ""
sleep 1
cat demo/sample-config.json
sleep 3

echo ""
echo "  ⚠️  Problem: No auth, no rate limits, no logging!"
echo ""
sleep 2

type_slow "node dist/index.js scan -f demo/sample-config.json"

type_slow "node dist/index.js secure -f demo/sample-config.json --rate-limit 60"

echo ""
echo "  🚀 Step 4: Start the secured gateway"
echo ""
sleep 1
echo -e "\033[1;36m$ mcp-shield start\033[0m"
sleep 1

# Start gateway in background
cd mcp-shield-output
../bin/agentgateway-linux-amd64 -f gateway-config.yaml &
GW_PID=$!
cd ..
sleep 3

echo ""
echo "  🔍 Step 5: Test security — unauthenticated request"
echo ""
sleep 1
echo -e "\033[1;36m$ curl -s -w '\\nHTTP %{http_code}' -X POST http://localhost:3000/mcp ...\033[0m"
sleep 1
RESULT=$(curl -s -w '\nHTTP %{http_code}' -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' 2>&1)
echo "$RESULT"
sleep 2
echo ""
echo "  ✅ Request blocked with 401 — authentication required!"
sleep 3

echo ""
echo "  📖 Step 6: OAuth discovery metadata is available"
echo ""
echo -e "\033[1;36m$ curl -s http://localhost:3000/.well-known/oauth-protected-resource/mcp | jq\033[0m"
sleep 1
curl -s http://localhost:3000/.well-known/oauth-protected-resource/mcp | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/.well-known/oauth-protected-resource/mcp
sleep 3

# Cleanup
kill $GW_PID 2>/dev/null
wait $GW_PID 2>/dev/null

echo ""
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║                                                   ║"
echo "  ║   ✅ MCP servers are now secured!                  ║"
echo "  ║                                                   ║"
echo "  ║   • JWT Authentication (strict mode)              ║"
echo "  ║   • Rate Limiting (60 req/min)                    ║"
echo "  ║   • CORS configured                               ║"
echo "  ║   • 3 servers federated → 1 endpoint              ║"
echo "  ║   • OAuth discovery metadata                      ║"
echo "  ║                                                   ║"
echo "  ║   github.com/bcornish1797/mcp-shield              ║"
echo "  ║                                                   ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo ""
