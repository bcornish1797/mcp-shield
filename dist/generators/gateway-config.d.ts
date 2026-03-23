import { ShieldConfig } from "../types/config";
/**
 * Generates agentgateway YAML configuration from parsed MCP server configs.
 */
export declare class GatewayConfigGenerator {
    private config;
    constructor(config: ShieldConfig);
    /**
     * Generate the complete agentgateway configuration.
     */
    generate(): string;
    /**
     * Generate and write config to file.
     */
    writeToFile(outputPath: string): void;
    /**
     * Generate JWT keypair for testing.
     */
    static generateTestKeys(outputDir: string): {
        publicKeyPath: string;
        privateKeyPath: string;
    };
    private buildConfig;
    private buildRoutes;
    private buildTarget;
    private buildPolicies;
    private buildAuthPolicy;
}
