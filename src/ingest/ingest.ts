/**
 * Corpus Ingestion Pipeline.
 *
 * Loads fixture corpus JSON into the CorpusStore.
 * Normalizes metadata, validates records, populates FTS index.
 */

import { readFileSync } from "node:fs";
import { CorpusStore } from "../storage/corpus-store.js";
import type { TrustTier, ContentType } from "../types.js";

// ── Fixture Corpus Format ───────────────────────────────────────────

type FixtureChunk = {
  chunk_id: string;
  content: string;
  content_type: ContentType;
  tags: string[];
  applicable_roles?: string[];
  excluded_roles?: string[];
};

type FixtureDocument = {
  document_id: string;
  source_id: string;
  title: string;
  document_type: string;
  domain: string;
  trust_tier: TrustTier;
  updated_at: string;
  chunks: FixtureChunk[];
};

type FixtureCorpus = {
  version: string;
  description: string;
  documents: FixtureDocument[];
};

// ── Ingestion ───────────────────────────────────────────────────────

export type IngestResult = {
  documents_ingested: number;
  chunks_ingested: number;
  errors: string[];
};

/**
 * Ingest a fixture corpus JSON file into the store.
 */
export function ingestFixtureCorpus(store: CorpusStore, corpusPath: string): IngestResult {
  const raw = readFileSync(corpusPath, "utf-8");
  const corpus: FixtureCorpus = JSON.parse(raw);
  return ingestCorpusData(store, corpus);
}

/**
 * Ingest corpus data directly (for testing without files).
 */
export function ingestCorpusData(store: CorpusStore, corpus: FixtureCorpus): IngestResult {
  const errors: string[] = [];
  let docsIngested = 0;
  let chunksIngested = 0;

  for (const doc of corpus.documents) {
    try {
      store.insertDocument({
        document_id: doc.document_id,
        source_id: doc.source_id,
        title: doc.title,
        document_type: doc.document_type,
        domain: doc.domain,
        trust_tier: doc.trust_tier,
        updated_at: doc.updated_at,
      });
      docsIngested++;

      for (const chunk of doc.chunks) {
        try {
          store.insertChunk({
            chunk_id: chunk.chunk_id,
            document_id: doc.document_id,
            content: chunk.content,
            content_type: chunk.content_type,
            tags: JSON.stringify(chunk.tags || []),
            applicable_roles: JSON.stringify(chunk.applicable_roles || []),
            excluded_roles: JSON.stringify(chunk.excluded_roles || []),
          });
          chunksIngested++;
        } catch (e) {
          errors.push(`Chunk ${chunk.chunk_id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      errors.push(`Document ${doc.document_id}: ${(e as Error).message}`);
    }
  }

  return {
    documents_ingested: docsIngested,
    chunks_ingested: chunksIngested,
    errors,
  };
}
