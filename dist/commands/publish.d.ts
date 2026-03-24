interface PublishOptions {
    file?: string;
    source?: string;
    config?: string;
    arctlBin?: string;
}
/**
 * Publish command — registers secured MCP servers with agentregistry.
 */
export declare function publishCommand(options: PublishOptions): Promise<void>;
export {};
