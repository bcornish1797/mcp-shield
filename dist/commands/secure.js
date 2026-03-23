"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureCommand = secureCommand;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const config_parser_1 = require("../parsers/config-parser");
const gateway_config_1 = require("../generators/gateway-config");
/**
 * Secure command — generates agentgateway configuration with security policies.
 */
async function secureCommand(options) {
    console.log("\n🛡️  MCP Shield — Generating secured configuration...\n");
    // Parse MCP servers
    let source;
    let servers;
    if (options.file) {
        source = (options.source || "claude-desktop");
        servers = config_parser_1.ConfigParser.parseFile(options.file, source);
    }
    else {
        const result = config_parser_1.ConfigParser.autoDetect();
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
    const shieldConfig = {
        servers,
        source,
        security,
        gateway: { port, host: "localhost" },
    };
    // Generate keys if auth is enabled
    if (security.auth.mode !== "permissive" && options.generateKeys !== false) {
        console.log("  🔐 Generating JWT keypair for authentication...");
        const keysDir = path.join(outputDir, "keys");
        const keys = gateway_config_1.GatewayConfigGenerator.generateTestKeys(keysDir);
        security.auth.jwksSource = "file";
        security.auth.jwksPath = path.relative(outputDir, keys.publicKeyPath);
        console.log(`     Public key:  ${keys.publicKeyPath}`);
        console.log(`     Private key: ${keys.privateKeyPath}\n`);
    }
    // Generate gateway config
    const generator = new gateway_config_1.GatewayConfigGenerator(shieldConfig);
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
function buildSecurityPolicy(options) {
    const authMode = (options.auth || "strict");
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
function generateClientConfig(outputDir, servers, port) {
    // Generate a Claude Desktop config that points to the gateway
    const clientConfig = {
        mcpServers: {
            "mcp-shield-gateway": {
                url: `http://localhost:${port}/mcp`,
                note: `Federated gateway for: ${servers.map((s) => s.name).join(", ")}`,
            },
        },
    };
    // Also add per-server endpoints
    for (const server of servers) {
        clientConfig.mcpServers[`shield-${server.name}`] = {
            url: `http://localhost:${port}/mcp/${server.name}`,
        };
    }
    fs.writeFileSync(path.join(outputDir, "claude_desktop_config.json"), JSON.stringify(clientConfig, null, 2), "utf-8");
}
//# sourceMappingURL=secure.js.map