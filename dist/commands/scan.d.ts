/**
 * Scan command — discovers MCP server configurations from IDE config files.
 */
export declare function scanCommand(options: {
    file?: string;
    source?: string;
}): Promise<void>;
