<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/knowledge-core/readme.png" width="400" alt="Knowledge Core" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/actions"><img src="https://github.com/mcp-tool-shop-org/knowledge-core/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://mcp-tool-shop-org.github.io/knowledge-core/"><img src="https://img.shields.io/badge/docs-landing%20page-teal" alt="Landing Page" /></a>
</p>

Role-aware retrieval engine — governed knowledge substrate for [Role OS](https://github.com/mcp-tool-shop-org/role-os).

## What This Is

A retrieval engine where **role law governs what gets retrieved, ranked, and cited**. Not generic RAG — governed input with hard role boundaries.

Same task, different roles, materially different evidence. Proven across 5 pilot roles with 86 tests.

## Architecture

- **One canonical corpus** with metadata, embeddings, and versioning
- **Per-role overlays** that control source policy, vocabulary, reranking, and synthesis
- **Structured retrieval bundles** with full provenance, rejection trails, and trust posture
- **Fallback governance** for degraded scenarios (stale, conflicted, weak evidence)

### Pipeline

```
task + overlay + corpus → query builder → BM25 + semantic → merge → metadata filter → rerank → bundle
```

### Key Contracts

| Contract | Description |
|----------|-------------|
| `RetrievalBundle` | Governed output of every retrieval operation |
| `RoleOverlay` | Declarative per-role retrieval configuration |
| `PacketKnowledge` | How Role OS packets carry knowledge bundles |
| `EvidenceProvenance` | How evidence items trace back to retrieval sources |
| `FallbackDecision` | Explicit governance for degraded retrieval scenarios |

## Install

```bash
npm install @roleos/knowledge-core
```

**Requirements:** Node.js >= 18. Optional: [Ollama](https://ollama.com/) with `nomic-embed-text` for semantic search.

## Quick Start

```typescript
import { CorpusStore, ingestFixtureCorpus, retrieve } from "@roleos/knowledge-core";

// 1. Create store and ingest corpus
const store = new CorpusStore(":memory:");
ingestFixtureCorpus(store, "./corpus.json");

// 2. Load a role overlay
const overlay = JSON.parse(readFileSync("./roles/security-reviewer.json", "utf-8"));

// 3. Retrieve with role governance
const bundle = await retrieve({
  store,
  roleId: "security-reviewer",
  taskText: "Review auth middleware for injection risks",
  overlay,
  lexicalOnly: true,
});

// bundle.selected — evidence chunks, scored and ranked
// bundle.rejected — why candidates were excluded
// bundle.provenance — trust and freshness posture
// bundle.warnings — degradation signals
```

## Pilot Roles (Wave 1)

| Role | Retrieval Profile |
|------|------------------|
| Product Strategist | User value, tradeoffs, strategic precedent |
| Security Reviewer | Threat models, CVEs, exploit patterns |
| Competitive Analyst | Market data, honest disadvantages, substitutes |
| Docs Architect | Structure patterns, navigation, information hierarchy |
| Critic Reviewer | Quality standards, rejection precedent, contract compliance |

## How It Works

1. **Query Builder** — expands task text with overlay vocabulary (boost phrases, preferred terms, synonyms)
2. **Lexical Search** — BM25 via SQLite FTS5 for exact term matching
3. **Semantic Search** — embedding similarity via Ollama (graceful fallback to lexical-only)
4. **Merge + Dedupe** — union candidate pool from both lanes
5. **Metadata Filter** — enforces forbidden sources, role exclusions, stale penalties, trust/doc-type boosts
6. **Role Reranker** — transparent weighted scoring with source diversity pressure
7. **Bundle Assembly** — produces governed `RetrievalBundle` with full audit trail

## Trust & Security

This library operates **locally only** as a retrieval engine.

- **Data touched:** local SQLite database, document chunks, embeddings
- **Data NOT touched:** no user credentials, no PII, no external APIs (except optional Ollama localhost)
- **No network egress** except optional embedding generation via local Ollama (`localhost:11434`)
- **No telemetry** is collected or sent
- **No secrets handling** — does not read, store, or transmit credentials

## Status

| Phase | Description | Tests |
|-------|-------------|-------|
| 1. Contract Spine | Types, validation, overlays, fixtures | 58 |
| 2. Retrieval Engine | Full pipeline, 5 roles proven distinct | 86 |
| 3. Prompt Consumption | Role OS prompt integration | Role OS: 38 |
| 4. Artifact Evidence | Chain-of-custody proof | Role OS: 22 |
| 5. Production Adoption | Live in persistent run engine | Role OS: 11 |

## License

MIT

---

Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
