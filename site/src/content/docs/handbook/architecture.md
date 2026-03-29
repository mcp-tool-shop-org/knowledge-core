---
title: Architecture
description: How Knowledge Core retrieves and governs evidence.
sidebar:
  order: 2
---

## Pipeline

Every retrieval follows this fixed sequence:

```
Task Text + Role Overlay
        ↓
   Query Builder         ← overlay vocabulary expansion
        ↓
  ┌─────────────┐
  │ Lexical (BM25) │  ← SQLite FTS5
  │ Semantic       │  ← Ollama embeddings (optional)
  └─────────────┘
        ↓
   Merge + Dedupe        ← union candidate pool
        ↓
   Metadata Filter       ← forbidden sources, role exclusion, trust boosts
        ↓
   Role Reranker         ← overlay-weighted scoring + source diversity
        ↓
   Bundle Assembly       ← governed output with full audit trail
```

## Storage Layer

**SQLite + FTS5** via `better-sqlite3`.

Three tables:
- `documents` — source metadata (trust tier, domain, freshness)
- `chunks` — content with tags, applicable/excluded roles
- `chunks_fts` — BM25 full-text index (porter stemming, unicode)
- `embeddings` — optional vector storage for semantic search

## Query Builder

The query builder expands task text using the overlay's vocabulary:

1. Extract key terms from task (stop-word removal)
2. Inject **role-signature phrases** (top 3 boost phrases regardless of task overlap)
3. Add task-relevant boost phrases
4. Expand synonyms from overlay vocabulary
5. Build FTS5 query (OR-joined for BM25 ranking)
6. Build semantic query with role mission context

The signature phrase injection is what makes roles retrieve domain-relevant material even on generic tasks.

## Metadata Filter

This is where overlay governance becomes retrieval behavior:

| Check | Effect |
|-------|--------|
| Forbidden source | Hard reject with `forbidden_source` reason |
| Excluded role | Hard reject with `role_mismatch` reason |
| Applicable role match | 1.3x boost |
| Role mismatch | Penalty (configurable via `role_mismatch_penalty`) |
| Stale content | Penalty (configurable via `stale_penalty`) |
| Trust tier | Multiplicative boost from overlay config |
| Document type | Multiplicative boost from overlay config |
| Preferred source | Multiplicative boost with stated reason |

Every rejected candidate gets a recorded reason — no silent filtering.

## Reranker

Transparent weighted model:

```
final = lexical * w1 + semantic * w2 + normalize(metadata) * w3 + vocab_hits * w4
```

Weights come from the overlay's `retrieval_policy`. Default split: 0.3 / 0.3 / 0.2 / 0.2.

**Source diversity pressure:** when `require_source_diversity` is true, additional chunks from the same source are penalized after `max_chunks_per_source` is reached. This prevents a single source from filling the whole bundle.

## Bundle Contract

The `RetrievalBundle` is the governed output. It answers:

- **What was searched** — full query trace with overlay rules applied
- **What was selected** — scored chunks with reasons and overlay hits
- **What was rejected** — every excluded candidate with a coded reason
- **Is the evidence trustworthy** — provenance posture (strong/mixed/weak)
- **Is the evidence fresh** — freshness posture (fresh/mixed/stale)
- **What went wrong** — warning codes for degraded scenarios

This is what downstream consumers (Role OS dispatch, prompt builder) use. They never reach back into the corpus.
