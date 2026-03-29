/**
 * Lexical Search — BM25 via SQLite FTS5.
 *
 * Returns raw candidates with BM25 scores.
 * Does NOT apply overlay logic — that happens in metadata-filter and rerank.
 */

import type { CorpusStore, ChunkWithDocument } from "../storage/corpus-store.js";

export type LexicalCandidate = ChunkWithDocument & {
  bm25_score: number;
  retrieval_lane: "lexical";
};

/**
 * Run BM25-ranked full-text search.
 */
export function lexicalSearch(
  store: CorpusStore,
  ftsQuery: string,
  limit: number = 50,
): LexicalCandidate[] {
  const results = store.searchFTS(ftsQuery, limit);
  return results.map((r) => ({
    ...r,
    retrieval_lane: "lexical" as const,
  }));
}
