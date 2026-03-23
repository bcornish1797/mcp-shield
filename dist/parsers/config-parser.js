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
exports.ConfigParser = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * Detects and parses MCP server configurations from various IDE config files.
 */
class ConfigParser {
    /**
     * Auto-detect config source and parse MCP servers.
     */
    static autoDetect() {
        const sources = [
            {
                source: "claude-desktop",
                path: ConfigParser.getClaudeDesktopConfigPath(),
                parser: ConfigParser.parseClaudeDesktop,
            },
            {
                source: "cursor",
                path: ConfigParser.getCursorConfigPath(),
                parser: ConfigParser.parseCursor,
            },
            {
                source: "vscode",
                path: ConfigParser.getVSCodeConfigPath(),
                parser: ConfigParser.parseVSCode,
            },
        ];
        for (const { source, path: configPath, parser } of sources) {
            if (configPath && fs.existsSync(configPath)) {
                try {
                    const servers = parser(configPath);
                    if (servers.length > 0) {
                        return { source, servers };
                    }
                }
                catch {
                    continue;
                }
            }
        }
        return null;
    }
    /**
     * Parse a specific config file.
     */
    static parseFile(filePath, source) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Config file not found: ${filePath}`);
        }
        switch (source) {
            case "claude-desktop":
                return ConfigParser.parseClaudeDesktop(filePath);
            case "cursor":
                return ConfigParser.parseCursor(filePath);
            case "vscode":
                return ConfigParser.parseVSCode(filePath);
            case "custom":
                return ConfigParser.parseCustom(filePath);
            default:
                throw new Error(`Unknown config source: ${source}`);
        }
    }
    /**
     * Parse Claude Desktop config format.
     * Expected: { "mcpServers": { "name": { "command": "...", "args": [...] } } }
     */
    static parseClaudeDesktop(configPath) {
        const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const mcpServers = raw.mcpServers || {};
        const servers = [];
        for (const [name, config] of Object.entries(mcpServers)) {
            const cfg = config;
            if (cfg.command) {
                servers.push({
                    name,
                    transport: "stdio",
                    command: cfg.command,
                    args: cfg.args || [],
                    env: cfg.env || {},
                });
            }
            else if (cfg.url) {
                servers.push({
                    name,
                    transport: "sse",
                    url: cfg.url,
                });
            }
        }
        return servers;
    }
    /**
     * Parse Cursor MCP config format.
     */
    static parseCursor(configPath) {
        const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const mcpServers = raw.mcpServers || {};
        const servers = [];
        for (const [name, config] of Object.entries(mcpServers)) {
            const cfg = config;
            servers.push({
                name,
                transport: cfg.url ? "sse" : "stdio",
                command: cfg.command,
                args: cfg.args || [],
                env: cfg.env || {},
                url: cfg.url,
            });
        }
        return servers;
    }
    /**
     * Parse VS Code MCP settings.
     */
    static parseVSCode(configPath) {
        const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const mcpConfig = raw["mcp"] || raw["mcpServers"] || {};
        const serversObj = mcpConfig.servers || mcpConfig;
        const servers = [];
        for (const [name, config] of Object.entries(serversObj)) {
            const cfg = config;
            servers.push({
                name,
                transport: cfg.url ? "streamable-http" : "stdio",
                command: cfg.command,
                args: cfg.args || [],
                env: cfg.env || {},
                url: cfg.url,
            });
        }
        return servers;
    }
    /**
     * Parse a custom mcp-shield config format.
     */
    static parseCustom(configPath) {
        const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return raw.servers || [];
    }
    // Platform-specific config paths
    static getClaudeDesktopConfigPath() {
        const platform = os.platform();
        if (platform === "darwin") {
            return path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
        }
        else if (platform === "win32") {
            return path.join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json");
        }
        else {
            // Linux / WSL
            return path.join(os.homedir(), ".config", "claude", "claude_desktop_config.json");
        }
    }
    static getCursorConfigPath() {
        return path.join(os.homedir(), ".cursor", "mcp.json");
    }
    static getVSCodeConfigPath() {
        return path.join(os.homedir(), ".vscode", "settings.json");
    }
}
exports.ConfigParser = ConfigParser;
//# sourceMappingURL=config-parser.js.map