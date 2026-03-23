interface SecureOptions {
    file?: string;
    source?: string;
    output?: string;
    port?: string;
    auth?: string;
    rateLimit?: string;
    generateKeys?: boolean;
}
/**
 * Secure command — generates agentgateway configuration with security policies.
 */
export declare function secureCommand(options: SecureOptions): Promise<void>;
export {};
