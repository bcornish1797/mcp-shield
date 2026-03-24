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
exports.startCommand = startCommand;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
/**
 * Start command — launches agentgateway with the generated config.
 */
async function startCommand(options) {
    const configDir = options.config || "./mcp-shield-output";
    const configPath = path.join(configDir, "gateway-config.yaml");
    if (!fs.existsSync(configPath)) {
        console.log("\n  ❌ No gateway config found. Run 'mcp-shield secure' first.\n");
        process.exit(1);
    }
    // Find agentgateway binary
    const gwBin = findGatewayBinary(options.gatewayBin);
    if (!gwBin) {
        console.log("\n  ❌ agentgateway binary not found.\n");
        console.log("  Install it from: https://github.com/agentgateway/agentgateway/releases");
        console.log("  Or specify the path: mcp-shield start --gateway-bin /path/to/agentgateway\n");
        process.exit(1);
    }
    console.log("\n🚀 Starting MCP Shield gateway...\n");
    console.log(`  Config:  ${configPath}`);
    console.log(`  Binary:  ${gwBin}`);
    console.log(`  Press Ctrl+C to stop.\n`);
    const child = (0, child_process_1.spawn)(gwBin, ["-f", configPath], {
        cwd: configDir,
        stdio: "inherit",
        env: { ...process.env },
    });
    child.on("error", (err) => {
        console.error(`  ❌ Failed to start agentgateway: ${err.message}`);
        process.exit(1);
    });
    child.on("exit", (code) => {
        if (code !== 0) {
            console.log(`\n  agentgateway exited with code ${code}`);
        }
    });
    // Handle Ctrl+C gracefully
    process.on("SIGINT", () => {
        console.log("\n\n  🛑 Shutting down MCP Shield gateway...");
        child.kill("SIGTERM");
        process.exit(0);
    });
}
function findGatewayBinary(explicitPath) {
    if (explicitPath && fs.existsSync(explicitPath)) {
        return explicitPath;
    }
    // Check common locations
    const candidates = [
        "agentgateway",
        "./agentgateway",
        "../bin/agentgateway-linux-amd64",
        path.join(__dirname, "..", "..", "bin", "agentgateway-linux-amd64"),
    ];
    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }
        catch {
            continue;
        }
    }
    // Check PATH
    const { execSync } = require("child_process");
    try {
        const result = execSync("which agentgateway", { encoding: "utf-8" }).trim();
        if (result)
            return result;
    }
    catch {
        // not in PATH
    }
    return null;
}
//# sourceMappingURL=start.js.map