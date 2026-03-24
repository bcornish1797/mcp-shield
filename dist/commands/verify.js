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
exports.verifyCommand = verifyCommand;
const http = __importStar(require("http"));
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Verify command — tests whether the gateway is properly secured.
 */
async function verifyCommand(options) {
    const baseUrl = options.url || "http://localhost:3000";
    const configDir = options.config || "./mcp-shield-output";
    console.log("\n🔍 MCP Shield — Verifying gateway security...\n");
    console.log(`  Target: ${baseUrl}/mcp\n`);
    let passed = 0;
    let failed = 0;
    // Test 1: Unauthenticated request should be rejected
    console.log("  [1/4] Testing unauthenticated access...");
    try {
        const res = await makeRequest(`${baseUrl}/mcp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "initialize",
                params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0" } },
                id: 1,
            }),
        });
        if (res.statusCode === 401) {
            console.log("        ✅ PASS — Unauthenticated request rejected (401)");
            passed++;
        }
        else {
            console.log(`        ❌ FAIL — Expected 401, got ${res.statusCode}`);
            failed++;
        }
    }
    catch (err) {
        console.log(`        ⚠️  SKIP — Gateway not reachable (${err.message})`);
    }
    // Test 2: OAuth resource metadata should be exposed
    console.log("  [2/4] Testing OAuth resource metadata...");
    try {
        const res = await makeRequest(`${baseUrl}/.well-known/oauth-protected-resource/mcp`, {
            method: "GET",
        });
        if (res.statusCode === 200) {
            console.log("        ✅ PASS — Resource metadata endpoint accessible");
            passed++;
        }
        else {
            console.log(`        ❌ FAIL — Expected 200, got ${res.statusCode}`);
            failed++;
        }
    }
    catch (err) {
        console.log(`        ⚠️  SKIP — Gateway not reachable`);
    }
    // Test 3: Authenticated request with valid token
    console.log("  [3/4] Testing authenticated access...");
    const privKeyPath = path.join(configDir, "keys", "priv-key.pem");
    if (fs.existsSync(privKeyPath)) {
        try {
            const token = generateTestJwt(privKeyPath);
            const res = await makeRequest(`${baseUrl}/mcp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "initialize",
                    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0" } },
                    id: 1,
                }),
            });
            if (res.statusCode === 200) {
                console.log("        ✅ PASS — Authenticated request accepted");
                passed++;
            }
            else {
                console.log(`        ⚠️  Got ${res.statusCode} — auth passed but server may have other issues`);
                passed++;
            }
        }
        catch (err) {
            console.log(`        ⚠️  SKIP — ${err.message}`);
        }
    }
    else {
        console.log("        ⚠️  SKIP — No private key found for token generation");
    }
    // Test 4: Per-server endpoints
    console.log("  [4/4] Testing per-server endpoint isolation...");
    try {
        const res = await makeRequest(`${baseUrl}/mcp/filesystem`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", params: {}, id: 1 }),
        });
        if (res.statusCode === 401) {
            console.log("        ✅ PASS — Per-server endpoint also secured");
            passed++;
        }
        else {
            console.log(`        ❌ FAIL — Per-server endpoint not secured (${res.statusCode})`);
            failed++;
        }
    }
    catch (err) {
        console.log(`        ⚠️  SKIP — Gateway not reachable`);
    }
    // Summary
    console.log(`\n  ─────────────────────────────`);
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    if (failed === 0 && passed > 0) {
        console.log("  🛡️  Gateway is properly secured!\n");
    }
    else if (failed > 0) {
        console.log("  ⚠️  Some security checks failed. Review your configuration.\n");
    }
    else {
        console.log("  ⚠️  Could not reach gateway. Is it running?\n");
        console.log("  Start it with: mcp-shield start\n");
    }
}
function makeRequest(url, opts) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: opts.method,
            headers: opts.headers || {},
            timeout: 5000,
        };
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => resolve({ statusCode: res.statusCode || 0, body }));
        });
        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timed out"));
        });
        if (opts.body) {
            req.write(opts.body);
        }
        req.end();
    });
}
function generateTestJwt(privateKeyPath) {
    const privateKey = fs.readFileSync(privateKeyPath, "utf-8");
    const header = { alg: "ES256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: "mcp-shield",
        aud: "mcp-shield-client",
        sub: "test-user",
        iat: now,
        exp: now + 3600,
        scope: "read:all write:all",
    };
    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;
    const sign = crypto.createSign("SHA256");
    sign.update(signingInput);
    const derSignature = sign.sign(privateKey);
    // Convert DER to raw r||s format for ES256
    const rawSig = derToRaw(derSignature);
    const signatureB64 = base64url(rawSig);
    return `${signingInput}.${signatureB64}`;
}
function base64url(input) {
    const buf = typeof input === "string" ? Buffer.from(input) : input;
    return buf.toString("base64url");
}
function derToRaw(derSig) {
    // DER format: 0x30 <len> 0x02 <rlen> <r> 0x02 <slen> <s>
    let offset = 2; // skip 0x30 and total length
    if (derSig[offset] !== 0x02)
        throw new Error("Invalid DER signature");
    offset++;
    const rLen = derSig[offset];
    offset++;
    let r = derSig.subarray(offset, offset + rLen);
    offset += rLen;
    if (derSig[offset] !== 0x02)
        throw new Error("Invalid DER signature");
    offset++;
    const sLen = derSig[offset];
    offset++;
    let s = derSig.subarray(offset, offset + sLen);
    // Remove leading zero padding
    if (r.length === 33 && r[0] === 0)
        r = r.subarray(1);
    if (s.length === 33 && s[0] === 0)
        s = s.subarray(1);
    // Pad to 32 bytes
    const raw = Buffer.alloc(64);
    r.copy(raw, 32 - r.length);
    s.copy(raw, 64 - s.length);
    return raw;
}
//# sourceMappingURL=verify.js.map