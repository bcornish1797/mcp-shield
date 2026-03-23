import * as path from "path";
import * as fs from "fs";
import { ConfigParser } from "../parsers/config-parser";
import { GatewayConfigGenerator } from "../generators/gateway-config";
import { ConfigSource, ShieldConfig, SecurityPolicy } from "../types/config";

interface SecureOptions {
  file?: string;
  source?: string;
  output?: string;
  port?: string;
  auth?: string;
  rateLimit?: string;
  generateKeys?: boolean;
}

/**
 * Secure command — generates agentgateway configuration with security policies.
 */
export async function secureCommand(options: SecureOptions): Promise<void> {
  console.log("\n🛡️  MCP Shield — Generating secured configuration...\n");

  // Parse MCP servers
  let source: ConfigSource;
  let servers;

  if (options.file) {
    source = (options.source || "claude-desktop") as ConfigSource;
    servers = ConfigParser.parseFile(options.file, source);
  } else {
    const result = ConfigParser.autoDetect();
    if (!result) {
      console.log("  ❌ No MCP configurations found. Use --file to specify one.\n");
      process.exit(1);
    }
    source = result.source;
    servers = result.servers;
  }

  console.log(`  📁 Found ${servers.length} MCP server(s) from ${source}\n`);

  const port = parseInt(options.port || "3000", 10);
  const outputDir = options.output || "./mcp-shield-output";
  const configPath = path.join(outputDir, "gateway-config.yaml");

  // Build security policy
  const security = buildSecurityPolicy(options);

  // Build shield config
  const shieldConfig: ShieldConfig = {
    servers,
    source,
    security,
    gateway: { port, host: "localhost" },
  };

  // Generate keys if auth is enabled
  if (security.auth.mode !== "permissive" && options.generateKeys !== false) {
    console.log("  🔐 Generating JWT keypair for authentication...");
    const keysDir = path.join(outputDir, "keys");
    const keys = GatewayConfigGenerator.generateTestKeys(keysDir);
    security.auth.jwksSource = "file";
    security.auth.jwksPath = path.relative(outputDir, keys.publicKeyPath);
    console.log(`     Public key:  ${keys.publicKeyPath}`);
    console.log(`     Private key: ${keys.privateKeyPath}\n`);
  }

  // Generate gateway config
  const generator = new GatewayConfigGenerator(shieldConfig);
  generator.writeToFile(configPath);

  // Generate a client config that points to the gateway
  generateClientConfig(outputDir, servers, port);

  // Summary
  console.log("  ✅ Secured configuration generated!\n");
  console.log("  📂 Output files:");
  console.log(`     ${configPath}  — agentgateway configuration`);
  console.log(`     ${path.join(outputDir, "claude_desktop_config.json")}  — client config (points to gateway)`);
  if (security.auth.mode !== "permissive") {
    console.log(`     ${path.join(outputDir, "keys/")}  — JWT keypair`);
  }

  console.log("\n  🚀 To start the secured gateway:\n");
  console.log(`     agentgateway -f ${configPath}\n`);
  console.log("  Then update your IDE to use the gateway endpoint:");
  console.log(`     http://localhost:${port}/mcp\n`);

  // Security summary
  console.log("  🛡️  Security features enabled:");
  console.log(`     • Authentication:  ${security.auth.mode.toUpperCase()}`);
  console.log(`     • Rate Limiting:   ${security.rateLimit ? security.rateLimit.requestsPerMinute + " req/min" : "disabled"}`);
  console.log(`     • CORS:            configured`);
  console.log(`     • Audit Logging:   ${security.audit?.enabled ? "enabled" : "disabled"}`);
  console.log(`     • Federation:      ${servers.length} servers → 1 endpoint\n`);
}

function buildSecurityPolicy(options: SecureOptions): SecurityPolicy {
  const authMode = (options.auth || "strict") as "strict" | "optional" | "permissive";
  const rateLimit = options.rateLimit ? parseInt(options.rateLimit, 10) : undefined;

  return {
    auth: {
      mode: authMode,
      issuer: "mcp-shield",
      audiences: ["mcp-shield-client"],
    },
    rateLimit: rateLimit
      ? { requestsPerMinute: rateLimit, burstSize: Math.ceil(rateLimit / 6) }
      : undefined,
    cors: {
      allowOrigins: ["*"],
      allowHeaders: ["mcp-protocol-version", "content-type", "cache-control", "authorization"],
      exposeHeaders: ["Mcp-Session-Id"],
    },
    audit: {
      enabled: true,
      logLevel: "standard",
    },
  };
}

function generateClientConfig(outputDir: string, servers: { name: string }[], port: number): void {
  // Generate a Claude Desktop config that points to the gateway
  const clientConfig: Record<string, unknown> = {
    mcpServers: {
      "mcp-shield-gateway": {
        url: `http://localhost:${port}/mcp`,
        note: `Federated gateway for: ${servers.map((s) => s.name).join(", ")}`,
      },
    },
  };

  // Also add per-server endpoints
  for (const server of servers) {
    (clientConfig.mcpServers as Record<string, unknown>)[`shield-${server.name}`] = {
      url: `http://localhost:${port}/mcp/${server.name}`,
    };
  }

  fs.writeFileSync(
    path.join(outputDir, "claude_desktop_config.json"),
    JSON.stringify(clientConfig, null, 2),
    "utf-8"
  );
}
