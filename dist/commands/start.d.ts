interface StartOptions {
    config?: string;
    gatewayBin?: string;
}
/**
 * Start command — launches agentgateway with the generated config.
 */
export declare function startCommand(options: StartOptions): Promise<void>;
export {};
