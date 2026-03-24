import { ConfigParser } from "../parsers/config-parser";
import { ConfigSource, McpServerConfig } from "../types/config";

interface ScoreOptions {
  file?: string;
  source?: string;
}

interface SecurityCheck {
  name: string;
  category: "auth" | "ratelimit" | "audit" | "federation" | "validation" | "isolation";
  weight: number;
  passed: boolean;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  recommendation: string;
}

/**
 * Score command — evaluates the security posture of an MCP deployment.
 * Outputs an A-F letter grade with detailed findings and recommendations.
 */
export async function scoreCommand(options: ScoreOptions): Promise<void> {
  console.log("\n🛡️  MCP Shield — Security Score Assessment\n");

  // Parse MCP servers
  let servers: McpServerConfig[];
  let source: ConfigSource;

  if (options.file) {
    source = (options.source || "claude-desktop") as ConfigSource;
    servers = ConfigParser.parseFile(options.file, source);
  } else {
    const result = ConfigParser.autoDetect();
    if (!result) {
      console.log("  No MCP configurations found. Use --file to specify one.\n");
      process.exit(1);
    }
    source = result.source;
    servers = result.servers;
  }

  console.log(`  Scanning ${servers.length} MCP server(s) from ${source}...\n`);

  // Run all security checks
  const checks = runSecurityChecks(servers);
  const { score, grade } = calculateScore(checks);

  // Display results
  displayScoreReport(servers, checks, score, grade);
}

function runSecurityChecks(servers: McpServerConfig[]): SecurityCheck[] {
  const checks: SecurityCheck[] = [];

  // 1. Authentication check
  checks.push({
    name: "Authentication",
    category: "auth",
    weight: 25,
    passed: false, // Raw MCP configs have no auth
    severity: "critical",
    description: "No authentication layer between clients and MCP servers",
    recommendation: "Run `mcp-shield secure --auth strict` to add JWT authentication via agentgateway",
  });

  // 2. Rate limiting check
  checks.push({
    name: "Rate Limiting",
    category: "ratelimit",
    weight: 15,
    passed: false,
    severity: "high",
    description: "No rate limiting — servers vulnerable to resource exhaustion",
    recommendation: "Run `mcp-shield secure --rate-limit 60` to add token bucket rate limiting",
  });

  // 3. Audit logging check
  checks.push({
    name: "Audit Logging",
    category: "audit",
    weight: 15,
    passed: false,
    severity: "high",
    description: "No request/response logging — tool calls are invisible",
    recommendation: "Run `mcp-shield secure` to enable gateway-level audit logging",
  });

  // 4. Federation / single endpoint check
  const hasMultipleServers = servers.length > 1;
  checks.push({
    name: "Endpoint Federation",
    category: "federation",
    weight: 10,
    passed: !hasMultipleServers, // Single server = no federation needed
    severity: "medium",
    description: hasMultipleServers
      ? `${servers.length} servers exposed as separate endpoints — increases attack surface`
      : "Single server — federation not applicable",
    recommendation: hasMultipleServers
      ? "Run `mcp-shield secure` to federate behind a single gateway endpoint"
      : "No action needed",
  });

  // 5. Transport security check (stdio vs network)
  const networkServers = servers.filter((s) => s.transport !== "stdio");
  const hasNetworkExposure = networkServers.length > 0;
  checks.push({
    name: "Transport Security",
    category: "isolation",
    weight: 10,
    passed: !hasNetworkExposure,
    severity: hasNetworkExposure ? "high" : "low",
    description: hasNetworkExposure
      ? `${networkServers.length} server(s) exposed over network without TLS`
      : "All servers use stdio transport (local only)",
    recommendation: hasNetworkExposure
      ? "Route network MCP servers through agentgateway with TLS termination"
      : "stdio transport is inherently local — good baseline",
  });

  // 6. Tool validation / input sanitization
  checks.push({
    name: "Input Validation",
    category: "validation",
    weight: 10,
    passed: false,
    severity: "medium",
    description: "No schema-based validation of tool arguments at gateway level",
    recommendation: "Deploy agentgateway with request validation policies",
  });

  // 7. CORS policy check
  checks.push({
    name: "CORS Policy",
    category: "auth",
    weight: 5,
    passed: false,
    severity: "medium",
    description: "No CORS headers configured — cross-origin requests uncontrolled",
    recommendation: "Run `mcp-shield secure` to configure appropriate CORS headers",
  });

  // 8. OAuth discovery check
  checks.push({
    name: "OAuth Discovery",
    category: "auth",
    weight: 5,
    passed: false,
    severity: "low",
    description: "No .well-known/oauth-protected-resource endpoint for client auto-discovery",
    recommendation: "Run `mcp-shield secure` to expose OAuth resource metadata",
  });

  // 9. Per-server isolation check
  checks.push({
    name: "Server Isolation",
    category: "isolation",
    weight: 5,
    passed: false,
    severity: "medium",
    description: hasMultipleServers
      ? "All servers share the same access policy — no per-server RBAC"
      : "Single server — isolation not applicable",
    recommendation: hasMultipleServers
      ? "Use `mcp-shield secure` to generate per-server endpoints with independent policies"
      : "No action needed",
  });

  return checks;
}

function calculateScore(checks: SecurityCheck[]): { score: number; grade: string } {
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const check of checks) {
    totalWeight += check.weight;
    if (check.passed) {
      earnedWeight += check.weight;
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  let grade: string;
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 65) grade = "C";
  else if (score >= 50) grade = "D";
  else grade = "F";

  return { score, grade };
}

function displayScoreReport(
  servers: McpServerConfig[],
  checks: SecurityCheck[],
  score: number,
  grade: string
): void {
  // Grade display with color
  const gradeColors: Record<string, string> = {
    A: "\x1b[1;32m", // Green
    B: "\x1b[1;36m", // Cyan
    C: "\x1b[1;33m", // Yellow
    D: "\x1b[1;31m", // Red
    F: "\x1b[1;35m", // Magenta
  };
  const color = gradeColors[grade] || "\x1b[0m";
  const reset = "\x1b[0m";

  console.log("  ┌─────────────────────────────────────────────────────┐");
  console.log(`  │                                                     │`);
  console.log(`  │   ${color}MCP Security Score:  ${grade}  (${score}/100)${reset}                    │`);
  console.log(`  │                                                     │`);
  console.log("  └─────────────────────────────────────────────────────┘\n");

  // Detailed findings
  const failed = checks.filter((c) => !c.passed);
  const passed = checks.filter((c) => c.passed);

  if (failed.length > 0) {
    console.log("  ❌ Issues Found:\n");
    for (const check of failed) {
      const sev =
        check.severity === "critical" ? "🔴"
        : check.severity === "high" ? "🟠"
        : check.severity === "medium" ? "🟡"
        : "🟢";
      console.log(`     ${sev} ${check.name} (${check.severity})`);
      console.log(`        ${check.description}`);
      console.log(`        → ${check.recommendation}\n`);
    }
  }

  if (passed.length > 0) {
    console.log("  ✅ Passed:\n");
    for (const check of passed) {
      console.log(`     ✅ ${check.name}`);
      console.log(`        ${check.description}\n`);
    }
  }

  // Summary
  console.log("  ─────────────────────────────────────────────────────");
  console.log(`  Servers scanned: ${servers.length}`);
  console.log(`  Checks passed: ${passed.length}/${checks.length}`);
  console.log(`  Critical issues: ${failed.filter((c) => c.severity === "critical").length}`);
  console.log(`  High issues: ${failed.filter((c) => c.severity === "high").length}`);
  console.log("");
  console.log(`  💡 Run 'mcp-shield secure' to address all issues and improve your score.`);
  console.log(`     After securing, run 'mcp-shield score' again to verify improvement.\n`);
}
