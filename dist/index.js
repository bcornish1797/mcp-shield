#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const scan_1 = require("./commands/scan");
const secure_1 = require("./commands/secure");
const start_1 = require("./commands/start");
const verify_1 = require("./commands/verify");
const program = new commander_1.Command();
program
    .name("mcp-shield")
    .description("One-command security for MCP servers — powered by agentgateway")
    .version("0.1.0");
program
    .command("scan")
    .description("Discover MCP server configurations from IDE config files")
    .option("-f, --file <path>", "Path to MCP config file")
    .option("-s, --source <type>", "Config source type: claude-desktop, cursor, vscode, custom")
    .action(scan_1.scanCommand);
program
    .command("secure")
    .description("Generate a secured agentgateway configuration for your MCP servers")
    .option("-f, --file <path>", "Path to MCP config file")
    .option("-s, --source <type>", "Config source type: claude-desktop, cursor, vscode, custom")
    .option("-o, --output <dir>", "Output directory (default: ./mcp-shield-output)")
    .option("-p, --port <port>", "Gateway port (default: 3000)")
    .option("--auth <mode>", "Auth mode: strict, optional, permissive (default: strict)")
    .option("--rate-limit <rpm>", "Rate limit in requests per minute")
    .option("--no-generate-keys", "Skip JWT keypair generation")
    .action(secure_1.secureCommand);
program
    .command("start")
    .description("Start the agentgateway with the generated secured configuration")
    .option("-c, --config <dir>", "Config directory (default: ./mcp-shield-output)")
    .option("--gateway-bin <path>", "Path to agentgateway binary")
    .action(start_1.startCommand);
program
    .command("verify")
    .description("Verify that the gateway is properly secured")
    .option("-u, --url <url>", "Gateway URL (default: http://localhost:3000)")
    .option("-c, --config <dir>", "Config directory for keys (default: ./mcp-shield-output)")
    .action(verify_1.verifyCommand);
program.parse();
//# sourceMappingURL=index.js.map