import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { ConfigParser } from "../parsers/config-parser";

// Test 1: Parse sample config
const samplePath = path.join(process.cwd(), "demo", "sample-config.json");
const servers = ConfigParser.parseFile(samplePath, "claude-desktop");
assert.strictEqual(servers.length, 3, "Should find 3 servers");
assert.strictEqual(servers[0].name, "filesystem");
assert.strictEqual(servers[0].transport, "stdio");
assert.strictEqual(servers[1].name, "memory");
assert.strictEqual(servers[2].name, "github");
console.log("✅ Test 1: Config parser finds 3 servers");

// Test 2: Server has correct fields
assert.strictEqual(servers[0].command, "npx");
assert.ok(Array.isArray(servers[0].args));
console.log("✅ Test 2: Server fields are correct");

// Test 3: GitHub server has env vars
assert.ok(servers[2].env);
assert.ok(servers[2].env!.GITHUB_PERSONAL_ACCESS_TOKEN);
console.log("✅ Test 3: Environment variables parsed");

// Test 4: Empty config returns empty array
const emptyConfig = '{"mcpServers":{}}';
const tmpPath = "/tmp/test-empty-config.json";
fs.writeFileSync(tmpPath, emptyConfig);
const emptyServers = ConfigParser.parseFile(tmpPath, "claude-desktop");
assert.strictEqual(emptyServers.length, 0, "Empty config should return 0 servers");
fs.unlinkSync(tmpPath);
console.log("✅ Test 4: Empty config returns empty array");

console.log("\n🎉 All tests passed!");
