"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanCommand = scanCommand;
const config_parser_1 = require("../parsers/config-parser");
/**
 * Scan command — discovers MCP server configurations from IDE config files.
 */
async function scanCommand(options) {
    console.log("\n🔍 Scanning for MCP server configurations...\n");
    if (options.file) {
        const source = (options.source || "claude-desktop");
        const servers = config_parser_1.ConfigParser.parseFile(options.file, source);
        displayResults(source, options.file, servers);
        return;
    }
    // Auto-detect
    const result = config_parser_1.ConfigParser.autoDetect();
    if (!result) {
        console.log("  ❌ No MCP configurations found.\n");
        console.log("  Searched locations:");
        console.log(`    • Claude Desktop: ${config_parser_1.ConfigParser.getClaudeDesktopConfigPath()}`);
        console.log(`    • Cursor:         ${config_parser_1.ConfigParser.getCursorConfigPath()}`);
        console.log(`    • VS Code:        ${config_parser_1.ConfigParser.getVSCodeConfigPath()}`);
        console.log("\n  Use --file <path> to specify a config file manually.\n");
        return;
    }
    displayResults(result.source, "(auto-detected)", result.servers);
}
function displayResults(source, filePath, servers) {
    console.log(`  📁 Source:  ${source}`);
    console.log(`  📄 File:    ${filePath}`);
    console.log(`  🔧 Servers: ${servers.length} found\n`);
    if (servers.length === 0) {
        console.log("  No MCP servers configured.\n");
        return;
    }
    console.log("  ┌─────────────────────────────────────────────────────────┐");
    console.log("  │ MCP Servers                                            │");
    console.log("  ├────────────────────┬──────────┬────────────────────────┤");
    console.log("  │ Name               │ Type     │ Command/URL            │");
    console.log("  ├────────────────────┼──────────┼────────────────────────┤");
    for (const server of servers) {
        const name = server.name.padEnd(18).slice(0, 18);
        const type = server.transport.padEnd(8).slice(0, 8);
        const target = (server.command || server.url || "?").slice(0, 22).padEnd(22);
        console.log(`  │ ${name} │ ${type} │ ${target} │`);
    }
    console.log("  └────────────────────┴──────────┴────────────────────────┘\n");
    // Security assessment
    console.log("  ⚠️  Security Assessment:");
    console.log("    • Authentication:  NONE — any client can connect");
    console.log("    • Rate Limiting:   NONE — no protection against abuse");
    console.log("    • Audit Logging:   NONE — no visibility into tool usage");
    console.log("    • Input Validation: NONE — tool arguments pass unchecked\n");
    console.log("  💡 Run 'mcp-shield secure' to generate a secured configuration.\n");
}
//# sourceMappingURL=scan.js.map