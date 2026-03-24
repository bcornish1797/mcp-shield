import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { McpServerConfig } from "../types/config";
import { ConfigParser } from "../parsers/config-parser";

interface PublishOptions {
  file?: string;
  source?: string;
  config?: string;
  arctlBin?: string;
}

/**
 * Publish command — registers secured MCP servers with agentregistry.
 */
export async function publishCommand(options: PublishOptions): Promise<void> {
  console.log("\n📦 MCP Shield — Publishing to Agent Registry...\n");

  const arctl = findArctlBinary(options.arctlBin);
  if (!arctl) {
    console.log("  ❌ arctl binary not found.");
    console.log("  Install from: https://github.com/agentregistry-dev/agentregistry/releases");
    console.log("  Or specify: mcp-shield publish --arctl-bin /path/to/arctl\n");
    process.exit(1);
  }

  // Parse servers
  let servers: McpServerConfig[];
  if (options.file) {
    servers = ConfigParser.parseFile(options.file, (options.source || "claude-desktop") as any);
  } else {
    const result = ConfigParser.autoDetect();
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
          execSync(
            `${arctl} mcp publish "mcp-shield/${server.name}" --type npm --package-id "${npmPkg}" --version "1.0.0" --description "Secured ${server.name} MCP server (via mcp-shield)" --transport stdio ${argFlags} --overwrite`,
            { stdio: "pipe" }
          );
          console.log(`     ✅ Published as npm package: ${npmPkg}`);
        } else {
          console.log(`     ⚠️  Skipped (non-npm stdio server — manual registration needed)`);
        }
      } else if (server.url) {
        execSync(
          `${arctl} mcp publish "mcp-shield/${server.name}" --remote-url "${server.url}" --transport sse --version "1.0.0" --description "Secured ${server.name} MCP server (via mcp-shield)" --overwrite`,
          { stdio: "pipe" }
        );
        console.log(`     ✅ Published as remote server`);
      }
    } catch (err) {
      const msg = (err as any).stderr?.toString() || (err as Error).message;
      console.log(`     ❌ Failed: ${msg.trim().split("\n")[0]}`);
    }
  }

  // List registered servers
  console.log("\n  📋 Registry contents:");
  try {
    const list = execSync(`${arctl} mcp list`, { encoding: "utf-8" });
    console.log(list.split("\n").map((l: string) => `     ${l}`).join("\n"));
  } catch {
    console.log("     (could not list)");
  }

  console.log("\n  🌐 Registry UI: http://localhost:12121");
  console.log("  📖 Generate IDE config: arctl configure claude-desktop\n");
}

function detectNpmPackage(server: McpServerConfig): string | null {
  if (server.command !== "npx" && server.command !== "node") return null;
  const args = server.args || [];
  // Find the package name (skip flags like -y)
  for (const arg of args) {
    if (!arg.startsWith("-") && (arg.includes("/") || arg.startsWith("@") || !arg.includes("."))) {
      return arg;
    }
  }
  return null;
}

function findArctlBinary(explicitPath?: string): string | null {
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
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      continue;
    }
  }

  try {
    const result = execSync("which arctl", { encoding: "utf-8" }).trim();
    if (result) return result;
  } catch {
    // not in PATH
  }

  return null;
}
