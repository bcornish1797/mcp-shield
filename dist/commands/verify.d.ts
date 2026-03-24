interface VerifyOptions {
    url?: string;
    config?: string;
}
/**
 * Verify command — tests whether the gateway is properly secured.
 */
export declare function verifyCommand(options: VerifyOptions): Promise<void>;
export {};
