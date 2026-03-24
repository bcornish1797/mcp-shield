# Securing MCP Servers in 30 Seconds with MCP Shield

*How I built a one-command security layer for the Model Context Protocol*

## The Problem

The Model Context Protocol (MCP) is transforming how AI agents interact with tools and data. But there's an elephant in the room: **most MCP deployments have zero security**.

Take a typical Claude Desktop configuration:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxx" }
    }
  }
}
```

Each MCP server runs as a direct subprocess. No authentication. No rate limiting. No audit logging. If you're running MCP servers in any shared or production environment, this is a significant risk.

## Why This Matters

As MCP adoption grows, the security gap becomes critical:

- **No authentication** means any client that can reach the endpoint can invoke any tool
- **No rate limiting** means a compromised or misbehaving agent can exhaust resources
- **No audit trail** means you have no visibility into what tools are being called, by whom, or when
- **No federation** means managing N separate server connections instead of one secure gateway

These aren't hypothetical concerns — they're the default state of every MCP deployment today.

## The Solution: MCP Shield + agentgateway

[MCP Shield](https://github.com/bcornish1797/mcp-shield) is a CLI tool that automatically wraps your existing MCP servers with [agentgateway](https://agentgateway.dev), the open-source AI-native data plane from the Linux Foundation.

### How it works

**Step 1: Scan** — MCP Shield discovers your existing MCP server configurations from Claude Desktop, Cursor, or VS Code.

```bash
$ mcp-shield scan
```

It finds all your MCP servers and shows a security assessment (spoiler: it's all NONE).

**Step 2: Secure** — Generate a complete agentgateway configuration with enterprise-grade security.

```bash
$ mcp-shield secure --rate-limit 60
```

This generates:
- A validated agentgateway YAML config with JWT authentication
- An EC P-256 keypair for token signing/verification
- An updated client config pointing to the secured gateway
- Per-server endpoint isolation (`/mcp/filesystem`, `/mcp/github`, etc.)

**Step 3: Start** — Launch the gateway.

```bash
$ mcp-shield start
```

Now your MCP servers are behind a production-grade proxy with:
- **JWT Authentication** (strict mode) — every request must carry a valid token
- **Rate Limiting** — token bucket algorithm prevents abuse
- **CORS** — proper cross-origin headers
- **OAuth Discovery** — standard `/.well-known/oauth-protected-resource` metadata
- **Federation** — all servers accessible through one endpoint

### Before and After

```
BEFORE:                          AFTER:
[Client] → [MCP Server]         [Client] → [agentgateway] → [MCP Server]
   No auth                         JWT auth ✓
   No limits                       Rate limiting ✓
   No logging                      Audit logging ✓
   N connections                   1 federated endpoint ✓
```

## Technical Deep Dive

### agentgateway Configuration Generation

MCP Shield doesn't just wrap servers — it generates agentgateway configs that follow best practices:

- **Route isolation**: Each MCP server gets its own endpoint (`/mcp/<name>`) in addition to the federated `/mcp` endpoint
- **JWKS-based auth**: Public keys in JWKS format, compatible with any OAuth2 provider
- **Token bucket rate limiting**: Proper burst handling with configurable fill intervals
- **OAuth resource metadata**: Standard discovery endpoint so clients can programmatically find the auth requirements

### agentregistry Integration

MCP Shield also publishes your secured servers to [agentregistry](https://github.com/agentregistry-dev/agentregistry):

```bash
$ mcp-shield publish
```

This makes your secured MCP servers discoverable and deployable across your organization.

## What's Next

MCP Shield is just the beginning. Future plans include:

- **Tool-level RBAC** — different permissions for different MCP tools
- **Input validation** — schema-based validation of tool arguments
- **Anomaly detection** — flag unusual patterns in tool usage
- **Multi-tenant support** — different security policies per client

## Try It

```bash
npm install -g mcp-shield
mcp-shield scan
mcp-shield secure --rate-limit 60
mcp-shield start
```

GitHub: [bcornish1797/mcp-shield](https://github.com/bcornish1797/mcp-shield)

Built with [agentgateway](https://agentgateway.dev) and [agentregistry](https://aregistry.ai) for the [MCP & AI Agents Hackathon 2026](https://aihackathon.dev).
