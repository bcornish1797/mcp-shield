import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

interface StartOptions {
  config?: string;
  gatewayBin?: string;
}

/**
 * Start command — launches agentgateway with the generated config.
 */
export async function startCommand(options: StartOptions): Promise<void> {
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

  const child = spawn(gwBin, ["-f", configPath], {
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

function findGatewayBinary(explicitPath?: string): string | null {
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
    } catch {
      continue;
    }
  }

  // Check PATH
  const { execSync } = require("child_process");
  try {
    const result = execSync("which agentgateway", { encoding: "utf-8" }).trim();
    if (result) return result;
  } catch {
    // not in PATH
  }

  return null;
}
