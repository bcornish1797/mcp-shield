import { McpServerConfig, ConfigSource } from "../types/config";
/**
 * Detects and parses MCP server configurations from various IDE config files.
 */
export declare class ConfigParser {
    /**
     * Auto-detect config source and parse MCP servers.
     */
    static autoDetect(): {
        source: ConfigSource;
        servers: McpServerConfig[];
    } | null;
    /**
     * Parse a specific config file.
     */
    static parseFile(filePath: string, source: ConfigSource): McpServerConfig[];
    /**
     * Parse Claude Desktop config format.
     * Expected: { "mcpServers": { "name": { "command": "...", "args": [...] } } }
     */
    static parseClaudeDesktop(configPath: string): McpServerConfig[];
    /**
     * Parse Cursor MCP config format.
     */
    static parseCursor(configPath: string): McpServerConfig[];
    /**
     * Parse VS Code MCP settings.
     */
    static parseVSCode(configPath: string): McpServerConfig[];
    /**
     * Parse a custom mcp-shield config format.
     */
    static parseCustom(configPath: string): McpServerConfig[];
    static getClaudeDesktopConfigPath(): string;
    static getCursorConfigPath(): string;
    static getVSCodeConfigPath(): string;
}
