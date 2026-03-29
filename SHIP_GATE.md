# Ship Gate

> No repo is "done" until every applicable line is checked.

**Tags:** `[all]` `[npm]`

---

## A. Security Baseline

- [x] `[all]` SECURITY.md exists (report email, supported versions, response timeline) (2026-03-29)
- [x] `[all]` README includes threat model paragraph (data touched, data NOT touched, permissions required) (2026-03-29)
- [x] `[all]` No secrets, tokens, or credentials in source or diagnostics output (2026-03-29)
- [x] `[all]` No telemetry by default — state it explicitly even if obvious (2026-03-29)

### Default safety posture

- [ ] `[cli|mcp|desktop]` SKIP: library, not a CLI/MCP/desktop tool
- [ ] `[cli|mcp|desktop]` SKIP: library, not a CLI/MCP/desktop tool
- [ ] `[mcp]` SKIP: not an MCP server
- [ ] `[mcp]` SKIP: not an MCP server

## B. Error Handling

- [x] `[all]` Errors follow the Structured Error Shape: `code`, `message`, `hint`, `cause?`, `retryable?` (2026-03-29)
- [ ] `[cli]` SKIP: not a CLI tool
- [ ] `[cli]` SKIP: not a CLI tool
- [ ] `[mcp]` SKIP: not an MCP server
- [ ] `[mcp]` SKIP: not an MCP server
- [ ] `[desktop]` SKIP: not a desktop app
- [ ] `[vscode]` SKIP: not a VS Code extension

## C. Operator Docs

- [x] `[all]` README is current: what it does, install, usage, supported platforms + runtime versions (2026-03-29)
- [x] `[all]` CHANGELOG.md (Keep a Changelog format) (2026-03-29)
- [x] `[all]` LICENSE file present and repo states support status (2026-03-29)
- [ ] `[cli]` SKIP: not a CLI tool
- [ ] `[cli|mcp|desktop]` SKIP: library, no logging levels
- [ ] `[mcp]` SKIP: not an MCP server
- [ ] `[complex]` SKIP: not an operational system

## D. Shipping Hygiene

- [x] `[all]` `verify` script exists (test + build + smoke in one command) (2026-03-29)
- [x] `[all]` Version in manifest matches git tag (2026-03-29)
- [x] `[all]` Dependency scanning runs in CI (ecosystem-appropriate) (2026-03-29)
- [ ] `[all]` SKIP: Automated dependency update — not yet configured, will add post-v1
- [x] `[npm]` `npm pack --dry-run` includes: dist/, README.md, CHANGELOG.md, LICENSE (2026-03-29)
- [x] `[npm]` `engines.node` set (2026-03-29)
- [x] `[npm]` Lockfile committed (2026-03-29)
- [ ] `[vsix]` SKIP: not a VS Code extension
- [ ] `[desktop]` SKIP: not a desktop app

## E. Identity (soft gate — does not block ship)

- [x] `[all]` Logo in README header (2026-03-29)
- [ ] `[all]` Translations (polyglot-mcp, 8 languages)
- [ ] `[org]` Landing page (@mcptoolshop/site-theme)
- [ ] `[all]` GitHub repo metadata: description, homepage, topics

---

## Gate Rules

**Hard gate (A-D):** Must pass before any version is tagged or published.
If a section doesn't apply, mark `SKIP:` with justification — don't leave it unchecked.

**Soft gate (E):** Should be done. Product ships without it, but isn't "whole."
