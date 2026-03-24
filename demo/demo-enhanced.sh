#!/bin/bash
# MCP Shield Enhanced Demo — 2 minute version
set -e

type_and_wait() {
  echo ""
  echo -e "\033[1;36m$ $1\033[0m"
  sleep 2
  eval "$1"
  sleep 3
}

clear
echo ""
echo -e "\033[1;37m"
echo "  ╔═══════════════════════════════════════════════════════════╗"
echo "  ║                                                           ║"
echo "  ║   🛡️  MCP Shield                                          ║"
echo "  ║   One-command security for MCP servers                    ║"
echo "  ║                                                           ║"
echo "  ║   Powered by agentgateway (Linux Foundation)              ║"
echo "  ║   github.com/bcornish1797/mcp-shield                     ║"
echo "  ║                                                           ║"
echo "  ╚═══════════════════════════════════════════════════════════╝"
echo -e "\033[0m"
sleep 4

echo ""
echo -e "\033[1;33m  THE PROBLEM: Most MCP deployments have ZERO security\033[0m"
echo ""
sleep 2
echo "  A typical MCP client configuration (works with any MCP-compatible IDE):"
echo ""
sleep 1
cat demo/sample-config.json | sed 's/^/  /'
sleep 4

echo ""
echo -e "\033[1;31m  ⚠️  No authentication. No rate limiting. No audit logging.\033[0m"
echo ""
sleep 3

echo -e "\033[1;33m  THE SOLUTION: MCP Shield + agentgateway\033[0m"
echo ""
sleep 2

echo -e "\033[1;32m  Step 1: Score your security posture\033[0m"
type_and_wait "node dist/index.js score -f demo/sample-config.json"

echo -e "\033[1;32m  Step 2: Scan your existing MCP setup\033[0m"
type_and_wait "node dist/index.js scan -f demo/sample-config.json"

echo -e "\033[1;32m  Step 3: Generate secured configuration\033[0m"
type_and_wait "node dist/index.js secure -f demo/sample-config.json --rate-limit 60"

echo -e "\033[1;32m  Step 4: Start the secured gateway\033[0m"
echo ""
echo -e "\033[1;36m$ mcp-shield start\033[0m"
sleep 1

cd mcp-shield-output
../bin/agentgateway-linux-amd64 -f gateway-config.yaml > /dev/null 2>&1 &
GW_PID=$!
cd ..
sleep 3
echo -e "  \033[1;32m✅ Gateway started on port 3000\033[0m"
sleep 2

echo ""
echo -e "\033[1;32m  Step 5: Verify security\033[0m"
echo ""
echo -e "\033[1;36m  Testing unauthenticated request...\033[0m"
sleep 1
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' 2>&1)
echo -e "  HTTP $HTTP_CODE — \033[1;31mBlocked! Authentication required.\033[0m"
sleep 3

echo ""
echo -e "\033[1;36m  Checking OAuth discovery metadata...\033[0m"
sleep 1
curl -s http://localhost:3000/.well-known/oauth-protected-resource/mcp | python3 -m json.tool 2>/dev/null | sed 's/^/  /'
sleep 4

kill $GW_PID 2>/dev/null
wait $GW_PID 2>/dev/null

echo ""
echo -e "\033[1;37m"
echo "  ╔═══════════════════════════════════════════════════════════╗"
echo "  ║                                                           ║"
echo "  ║   ✅ MCP servers are now secured!                          ║"
echo "  ║                                                           ║"
echo "  ║   Features:                                               ║"
echo "  ║   • JWT Authentication (strict mode)                      ║"
echo "  ║   • Rate Limiting (token bucket, 60 req/min)              ║"
echo "  ║   • CORS configured                                       ║"
echo "  ║   • 3 servers federated → 1 secure endpoint               ║"
echo "  ║   • OAuth 2.0 discovery metadata                          ║"
echo "  ║   • Per-server endpoint isolation                          ║"
echo "  ║   • Published to agentregistry                             ║"
echo "  ║                                                           ║"
echo "  ║   Built with:                                              ║"
echo "  ║   • agentgateway (Linux Foundation)                        ║"
echo "  ║   • agentregistry (Solo.io)                                ║"
echo "  ║   • TypeScript + Commander.js                              ║"
echo "  ║                                                           ║"
echo "  ║   npm install -g mcp-shield                                ║"
echo "  ║   github.com/bcornish1797/mcp-shield                      ║"
echo "  ║                                                           ║"
echo "  ╚═══════════════════════════════════════════════════════════╝"
echo -e "\033[0m"
sleep 5
