---
title: Getting Started
description: Install Knowledge Core and run your first retrieval.
sidebar:
  order: 1
---

## Requirements

- **Node.js 18+**
- Optional: [Ollama](https://ollama.com/) with `nomic-embed-text` for semantic search

## Install

```bash
npm install @roleos/knowledge-core
```

## Your First Retrieval

### 1. Create a corpus store

```typescript
import { CorpusStore } from "@roleos/knowledge-core";

const store = new CorpusStore(":memory:"); // or a file path for persistence
```

### 2. Ingest documents

```typescript
import { ingestFixtureCorpus } from "@roleos/knowledge-core";

const result = ingestFixtureCorpus(store, "./my-corpus.json");
console.log(`Ingested: ${result.chunks_ingested} chunks from ${result.documents_ingested} docs`);
```

The corpus JSON format:

```json
{
  "version": "1.0",
  "documents": [
    {
      "document_id": "owasp-top10",
      "source_id": "owasp-guide",
      "title": "OWASP Top 10",
      "document_type": "advisory",
      "domain": "security",
      "trust_tier": "authoritative",
      "updated_at": "2025-11-01T00:00:00Z",
      "chunks": [
        {
          "chunk_id": "owasp-a01",
          "content": "Broken access control is the most critical...",
          "content_type": "paragraph",
          "tags": ["owasp", "access-control"],
          "applicable_roles": ["security-reviewer"]
        }
      ]
    }
  ]
}
```

### 3. Load an overlay and retrieve

```typescript
import { retrieve } from "@roleos/knowledge-core";
import { readFileSync } from "node:fs";

const overlay = JSON.parse(readFileSync("./roles/security-reviewer.json", "utf-8"));

const bundle = await retrieve({
  store,
  roleId: "security-reviewer",
  taskText: "Review the auth middleware for injection risks",
  overlay,
  lexicalOnly: true, // set false if Ollama is running
});
```

### 4. Use the bundle

```typescript
// What was selected (top evidence)
for (const chunk of bundle.selected) {
  console.log(`[${chunk.metadata.trust_tier}] ${chunk.citation.reference}`);
  console.log(`  Score: ${chunk.scores.final.toFixed(3)}`);
}

// What was rejected and why
for (const reject of bundle.rejected) {
  console.log(`Rejected ${reject.chunk_id}: ${reject.reason}`);
}

// Overall posture
console.log(`Trust: ${bundle.provenance.trust_posture}`);
console.log(`Freshness: ${bundle.provenance.freshness_posture}`);

// Warnings
for (const w of bundle.warnings) {
  console.log(`Warning: ${w.code} — ${w.message}`);
}
```

## With Role OS

When used as a Role OS subsystem, retrieval is automatic:

```javascript
import { configureKnowledge } from "role-os/knowledge";
import { CorpusStore, retrieve } from "@roleos/knowledge-core";

// Configure once at startup
const store = new CorpusStore("./knowledge.db");
configureKnowledge({ store, retrieve });

// Every createPersistentRun now auto-retrieves
const run = await createPersistentRun("Review auth for security risks", cwd);
console.log(run.knowledge.status); // "strong" | "weak" | "stale" | "conflicted" | "none"
```
