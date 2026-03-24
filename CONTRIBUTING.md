# Contributing to MCP Shield

Thanks for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/bcornish1797/mcp-shield.git
cd mcp-shield
npm install
npm run build
```

## Running Locally

```bash
node dist/index.js score -f demo/sample-config.json
node dist/index.js scan -f demo/sample-config.json
node dist/index.js secure -f demo/sample-config.json
```

## Testing

```bash
npm test
```

## Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes with clear commit messages
3. Ensure `npm run build` passes
4. Submit a PR with a description of the changes

## Code Style

- TypeScript strict mode
- No semicolons in commit messages
- Descriptive variable names

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
