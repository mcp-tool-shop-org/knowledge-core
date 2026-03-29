# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

Email: **64996768+mcp-tool-shop@users.noreply.github.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Version affected
- Potential impact

### Response timeline

| Action | Target |
|--------|--------|
| Acknowledge report | 48 hours |
| Assess severity | 7 days |
| Release fix | 30 days |

## Scope

This library operates **locally only** as a retrieval engine consumed by Role OS.

- **Data touched:** local SQLite database (in-memory or file), document chunks, embeddings
- **Data NOT touched:** no user credentials, no PII, no external APIs (except optional Ollama localhost)
- **No network egress** except optional embedding generation via local Ollama (localhost:11434)
- **No secrets handling** — does not read, store, or transmit credentials
- **No telemetry** is collected or sent
- **Permissions required:** filesystem read (corpus files), optional network to localhost Ollama
