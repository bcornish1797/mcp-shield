/**
 * Represents a parsed MCP server configuration from various IDE config formats.
 */
export interface McpServerConfig {
    name: string;
    transport: "stdio" | "sse" | "streamable-http";
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
}
/**
 * Supported IDE configuration formats.
 */
export type ConfigSource = "claude-desktop" | "cursor" | "vscode" | "custom";
/**
 * Security policy for an MCP server or tool.
 */
export interface SecurityPolicy {
    auth: AuthPolicy;
    rateLimit?: RateLimitPolicy;
    cors?: CorsPolicy;
    audit?: AuditPolicy;
}
export interface AuthPolicy {
    mode: "strict" | "optional" | "permissive";
    issuer?: string;
    audiences?: string[];
    jwksSource?: "file" | "url";
    jwksPath?: string;
}
export interface RateLimitPolicy {
    requestsPerMinute: number;
    burstSize?: number;
}
export interface CorsPolicy {
    allowOrigins: string[];
    allowHeaders: string[];
    exposeHeaders: string[];
}
export interface AuditPolicy {
    enabled: boolean;
    logFile?: string;
    logLevel?: "minimal" | "standard" | "verbose";
}
/**
 * Complete mcp-shield configuration.
 */
export interface ShieldConfig {
    servers: McpServerConfig[];
    source: ConfigSource;
    security: SecurityPolicy;
    gateway: {
        port: number;
        host: string;
    };
}
