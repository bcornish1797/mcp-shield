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
exports.publishCommand = publishCommand;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const config_parser_1 = require("../parsers/config-parser");
/**
 * Publish command — registers secured MCP servers with agentregistry.
 */
async function publishCommand(options) {
    console.log("\n📦 MCP Shield — Publishing to Agent Registry...\n");
    const arctl = findArctlBinary(options.arctlBin);
    if (!arctl) {
        console.log("  ❌ arctl binary not found.");
        console.log("  Install from: https://github.com/agentregistry-dev/agentregistry/releases");
        console.log("  Or specify: mcp-shield publish --arctl-bin /path/to/arctl\n");
        process.exit(1);
    }
    // Parse servers
    let servers;
    if (options.file) {
        servers = config_parser_1.ConfigParser.parseFile(options.file, (options.source || "claude-desktop"));
    }
    else {
        const result = config_parser_1.ConfigParser.autoDetect();
        if (!result) {
            console.log("  ❌ No MCP configurations found.\n");
            process.exit(1);
        }
        servers = result.servers;
    }
    const configDir = options.config || "./mcp-shield-output";
    const gatewayConfig = path.join(configDir, "gateway-config.yaml");
    if (!fs.existsSync(gatewayConfig)) {
        console.log("  ❌ No gateway config found. Run 'mcp-shield secure' first.\n");
        process.exit(1);
    }
    // Register each MCP server in the registry
    for (const server of servers) {
        console.log(`  📝 Registering: ${server.name}`);
        try {
            if (server.transport === "stdio" && server.command) {
                // For stdio servers using npx with npm packages, register as npm type
                const npmPkg = detectNpmPackage(server);
                if (npmPkg) {
                    const argFlags = server.args
                        ?.filter((a) => a !== "-y" && a !== npmPkg)
                        .map((a) => `--arg "${a}"`)
                        .join(" ") || "";
                    (0, child_process_1.execSync)(`${arctl} mcp publish "mcp-shield/${server.name}" --type npm --package-id "${npmPkg}" --version "1.0.0" --description "Secured ${server.name} MCP server (via mcp-shield)" --transport stdio ${argFlags} --overwrite`, { stdio: "pipe" });
                    console.log(`     ✅ Published as npm package: ${npmPkg}`);
                }
                else {
                    console.log(`     ⚠️  Skipped (non-npm stdio server — manual registration needed)`);
                }
            }
            else if (server.url) {
                (0, child_process_1.execSync)(`${arctl} mcp publish "mcp-shield/${server.name}" --remote-url "${server.url}" --transport sse --version "1.0.0" --description "Secured ${server.name} MCP server (via mcp-shield)" --overwrite`, { stdio: "pipe" });
                console.log(`     ✅ Published as remote server`);
            }
        }
        catch (err) {
            const msg = err.stderr?.toString() || err.message;
            console.log(`     ❌ Failed: ${msg.trim().split("\n")[0]}`);
        }
    }
    // List registered servers
    console.log("\n  📋 Registry contents:");
    try {
        const list = (0, child_process_1.execSync)(`${arctl} mcp list`, { encoding: "utf-8" });
        console.log(list.split("\n").map((l) => `     ${l}`).join("\n"));
    }
    catch {
        console.log("     (could not list)");
    }
    console.log("\n  🌐 Registry UI: http://localhost:12121");
    console.log("  📖 Generate IDE config: arctl configure claude-desktop\n");
}
function detectNpmPackage(server) {
    if (server.command !== "npx" && server.command !== "node")
        return null;
    const args = server.args || [];
    // Find the package name (skip flags like -y)
    for (const arg of args) {
        if (!arg.startsWith("-") && (arg.includes("/") || arg.startsWith("@") || !arg.includes("."))) {
            return arg;
        }
    }
    return null;
}
function findArctlBinary(explicitPath) {
    if (explicitPath && fs.existsSync(explicitPath)) {
        return explicitPath;
    }
    const candidates = [
        "arctl",
        "./arctl",
        "../bin/arctl-linux-amd64",
        path.join(__dirname, "..", "..", "bin", "arctl-linux-amd64"),
    ];
    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate))
                return candidate;
        }
        catch {
            continue;
        }
    }
    try {
        const result = (0, child_process_1.execSync)("which arctl", { encoding: "utf-8" }).trim();
        if (result)
            return result;
    }
    catch {
        // not in PATH
    }
    return null;
}
//# sourceMappingURL=publish.js.map