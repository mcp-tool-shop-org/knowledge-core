---
title: API Reference
description: Public API for Knowledge Core.
sidebar:
  order: 4
---

## Core Functions

### `retrieve(options)`

Run the full retrieval pipeline. Returns a `RetrievalBundle`.

```typescript
const bundle = await retrieve({
  store: CorpusStore,       // required
  roleId: string,           // required
  taskText: string,         // required
  overlay: RoleOverlay | null, // null = shared corpus only
  packetContextSummary?: string,
  lexicalOnly?: boolean,    // skip semantic search
  embeddingModel?: string,  // Ollama model (default: nomic-embed-text)
  ollamaUrl?: string,       // default: http://localhost:11434
});
```

### `CorpusStore`

SQLite-backed document and chunk storage.

```typescript
const store = new CorpusStore(":memory:"); // or file path
store.insertDocument(doc);
store.insertChunk(chunk);
store.searchFTS(query, limit);
store.insertEmbedding(chunkId, vector, model);
store.close();
```

### `ingestFixtureCorpus(store, path)`

Load a JSON corpus file into a store. Returns `{ documents_ingested, chunks_ingested, errors }`.

### `ingestCorpusData(store, corpusData)`

Same as above but accepts parsed JSON directly.

### `validateOverlay(data)`

Validate a role overlay JSON against the schema. Returns `{ valid, errors }`.

### `validateBundle(data)`

Validate a retrieval bundle JSON against the schema. Returns `{ valid, errors }`.

## Pipeline Functions

These are used internally by `retrieve()` but are exported for testing and custom pipelines.

| Function | Purpose |
|----------|---------|
| `buildQuery(taskText, overlay, context?)` | Overlay-aware query expansion |
| `lexicalSearch(store, ftsQuery, limit?)` | BM25 via FTS5 |
| `semanticSearch(store, queryText, limit?, model?, url?)` | Embedding similarity |
| `mergeCandidates(lexical, semantic)` | Union + deduplicate |
| `metadataFilter(candidates, overlay)` | Apply governance rules |
| `rerank(candidates, overlay)` | Weighted scoring + diversity |
| `assembleBundle(input)` | Produce final `RetrievalBundle` |

## Key Types

### `RetrievalBundle`

The governed output of every retrieval operation.

| Field | Type | Description |
|-------|------|-------------|
| `version` | `"1.0"` | Schema version |
| `role_id` | `string` | Which role this was retrieved for |
| `query` | `QueryTrace` | Full audit trail of query construction |
| `summary` | `RetrievalSummary` | Aggregate stats |
| `selected` | `RetrievedChunk[]` | Top evidence with scores |
| `rejected` | `RejectedCandidate[]` | Why candidates were excluded |
| `provenance` | `ProvenanceSummary` | Trust and freshness posture |
| `warnings` | `RetrievalWarning[]` | Degradation signals |
| `diagnostics` | `RetrievalDiagnostics` | Performance stats |

### `RoleOverlay`

Declarative per-role retrieval configuration.

| Field | Type | Description |
|-------|------|-------------|
| `role_id` | `string` | Role identifier |
| `mission` | `string` | What this role retrieves for |
| `anti_goals` | `string[]` | What it must NOT drift into |
| `vocabulary` | `RoleVocabulary` | Boost/suppress terms |
| `source_policy` | `SourcePolicy` | Preferred/forbidden sources |
| `retrieval_policy` | `RetrievalPolicy` | Weights and limits |
| `synthesis_policy` | `SynthesisPolicy` | Output guidance |
| `eval_profile` | `EvalProfile` | Golden set for testing |

### `FallbackDecision`

| State | Action | When |
|-------|--------|------|
| `healthy` | continue | Normal operation |
| `no_overlay` | continue | Shared corpus only |
| `no_strong_match` | warn | Bundle is empty or weak |
| `stale_dominant` | warn | Majority of evidence is outdated |
| `forbidden_hit` | continue | Forbidden sources removed |
| `conflicting` | warn | High-trust sources disagree |
