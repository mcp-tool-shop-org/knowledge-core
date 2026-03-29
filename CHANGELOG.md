# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-03-29

### Added

- Contract spine: `RetrievalBundle`, `RoleOverlay`, `PacketKnowledge`, `EvidenceProvenance`, `FallbackDecision` types
- Runtime validation for overlays and bundles (`validateOverlay`, `validateBundle`)
- 5 pilot role overlays: Product Strategist, Security Reviewer, Competitive Analyst, Docs Architect, Critic Reviewer
- SQLite + FTS5 corpus store with BM25 lexical search
- Ollama-backed semantic search with graceful fallback to lexical-only
- Overlay-aware query expansion with role-signature phrase injection
- Metadata filter: forbidden sources, role exclusion, stale penalties, trust/doc-type boosts
- Transparent weighted reranker with source diversity pressure
- Bundle assembly producing governed `RetrievalBundle` output
- 26-chunk fixture corpus across 18 documents, 7 domains for divergence testing
- 86 tests covering contracts, pipeline, distinctiveness, governance, and fallback

## [0.1.0] - 2026-03-28

### Added

- Initial contract spine (Phase 1)
- Type definitions and validation
- 5 pilot overlay JSON files
- Bundle fixture tests
