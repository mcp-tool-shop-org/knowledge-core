/**
 * Candidate Merge — union lexical + semantic pools, deduplicate.
 */

import type { ChunkWithDocument } from "../storage/corpus-store.js";
import type { LexicalCandidate } from "./lexical-search.js";
import type { SemanticCandidate } from "./semantic-search.js";

export type MergedCandidate = ChunkWithDocument & {
  lexical_score: number;
  semantic_score: number;
  sources: ("lexical" | "semantic")[];
};

/**
 * Merge lexical and semantic candidate pools.
 * Deduplicates by chunk_id, preserving scores from both lanes.
 */
export function mergeCandidates(
  lexical: LexicalCandidate[],
  semantic: SemanticCandidate[],
): { merged: MergedCandidate[]; deduped_count: number } {
  const map = new Map<string, MergedCandidate>();
  let dupes = 0;

  // Normalize BM25 scores to 0-1 range
  const maxBm25 = Math.max(...lexical.map((c) => c.bm25_score), 0.001);

  for (const c of lexical) {
    map.set(c.chunk_id, {
      ...c,
      lexical_score: c.bm25_score / maxBm25,
      semantic_score: 0,
      sources: ["lexical"],
    });
  }

  for (const c of semantic) {
    const existing = map.get(c.chunk_id);
    if (existing) {
      existing.semantic_score = c.semantic_score;
      existing.sources.push("semantic");
      dupes++;
    } else {
      map.set(c.chunk_id, {
        ...c,
        lexical_score: 0,
        semantic_score: c.semantic_score,
        sources: ["semantic"],
      });
    }
  }

  return {
    merged: Array.from(map.values()),
    deduped_count: dupes,
  };
}
