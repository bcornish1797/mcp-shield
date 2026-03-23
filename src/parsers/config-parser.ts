import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { McpServerConfig, ConfigSource } from "../types/config";

/**
 * Detects and parses MCP server configurations from various IDE config files.
 */
export class ConfigParser {
  /**
   * Auto-detect config source and parse MCP servers.
   */
  static autoDetect(): { source: ConfigSource; servers: McpServerConfig[] } | null {
    const sources: { source: ConfigSource; path: string; parser: (p: string) => McpServerConfig[] }[] = [
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
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Parse a specific config file.
   */
  static parseFile(filePath: string, source: ConfigSource): McpServerConfig[] {
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
  static parseClaudeDesktop(configPath: string): McpServerConfig[] {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const mcpServers = raw.mcpServers || {};
    const servers: McpServerConfig[] = [];

    for (const [name, config] of Object.entries(mcpServers)) {
      const cfg = config as Record<string, unknown>;
      if (cfg.command) {
        servers.push({
          name,
          transport: "stdio",
          command: cfg.command as string,
          args: (cfg.args as string[]) || [],
          env: (cfg.env as Record<string, string>) || {},
        });
      } else if (cfg.url) {
        servers.push({
          name,
          transport: "sse",
          url: cfg.url as string,
        });
      }
    }

    return servers;
  }

  /**
   * Parse Cursor MCP config format.
   */
  static parseCursor(configPath: string): McpServerConfig[] {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const mcpServers = raw.mcpServers || {};
    const servers: McpServerConfig[] = [];

    for (const [name, config] of Object.entries(mcpServers)) {
      const cfg = config as Record<string, unknown>;
      servers.push({
        name,
        transport: cfg.url ? "sse" : "stdio",
        command: cfg.command as string | undefined,
        args: (cfg.args as string[]) || [],
        env: (cfg.env as Record<string, string>) || {},
        url: cfg.url as string | undefined,
      });
    }

    return servers;
  }

  /**
   * Parse VS Code MCP settings.
   */
  static parseVSCode(configPath: string): McpServerConfig[] {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const mcpConfig = raw["mcp"] || raw["mcpServers"] || {};
    const serversObj = mcpConfig.servers || mcpConfig;
    const servers: McpServerConfig[] = [];

    for (const [name, config] of Object.entries(serversObj)) {
      const cfg = config as Record<string, unknown>;
      servers.push({
        name,
        transport: cfg.url ? "streamable-http" : "stdio",
        command: cfg.command as string | undefined,
        args: (cfg.args as string[]) || [],
        env: (cfg.env as Record<string, string>) || {},
        url: cfg.url as string | undefined,
      });
    }

    return servers;
  }

  /**
   * Parse a custom mcp-shield config format.
   */
  static parseCustom(configPath: string): McpServerConfig[] {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return raw.servers || [];
  }

  // Platform-specific config paths

  static getClaudeDesktopConfigPath(): string {
    const platform = os.platform();
    if (platform === "darwin") {
      return path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
    } else if (platform === "win32") {
      return path.join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json");
    } else {
      // Linux / WSL
      return path.join(os.homedir(), ".config", "claude", "claude_desktop_config.json");
    }
  }

  static getCursorConfigPath(): string {
    return path.join(os.homedir(), ".cursor", "mcp.json");
  }

  static getVSCodeConfigPath(): string {
    return path.join(os.homedir(), ".vscode", "settings.json");
  }
}
