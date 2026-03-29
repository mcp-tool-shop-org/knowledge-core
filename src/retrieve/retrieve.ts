/**
 * Top-level retrieval — the complete pipeline.
 *
 * task + role overlay + corpus → candidates → filter → rerank → bundle
 *
 * This is the single entry point. No other module should reach into the
 * corpus directly for retrieval purposes.
 */

import type { RetrievalBundle, RoleOverlay } from "../types.js";
import type { CorpusStore } from "../storage/corpus-store.js";
import { buildQuery } from "./build-query.js";
import { lexicalSearch } from "./lexical-search.js";
import { semanticSearch } from "./semantic-search.js";
import { mergeCandidates } from "./merge-candidates.js";
import { metadataFilter } from "./metadata-filter.js";
import { rerank } from "./rerank.js";
import { assembleBundle } from "./bundle.js";

export type RetrieveOptions = {
  store: CorpusStore;
  roleId: string;
  taskText: string;
  overlay: RoleOverlay | null;
  packetContextSummary?: string;
  /** Skip semantic search (faster, lexical-only mode) */
  lexicalOnly?: boolean;
  /** Ollama model for embeddings */
  embeddingModel?: string;
  /** Ollama URL */
  ollamaUrl?: string;
};

/**
 * Run the full retrieval pipeline.
 */
export async function retrieve(options: RetrieveOptions): Promise<RetrievalBundle> {
  const startMs = performance.now();

  const { store, roleId, taskText, overlay, packetContextSummary } = options;

  // 1. Build query
  const query = buildQuery(taskText, overlay, packetContextSummary);

  // 2. Candidate generation (parallel lanes)
  const lexicalResults = lexicalSearch(store, query.lexical_fts_query);

  let semanticResults: Awaited<ReturnType<typeof semanticSearch>> = [];
  if (!options.lexicalOnly) {
    semanticResults = await semanticSearch(
      store,
      query.semantic_text,
      50,
      options.embeddingModel,
      options.ollamaUrl,
    );
  }

  // 3. Merge + dedupe
  const { merged, deduped_count } = mergeCandidates(lexicalResults, semanticResults);

  // 4. Metadata filter (overlay governance)
  const filterResult = metadataFilter(merged, overlay);

  // 5. Rerank
  const { ranked, strategy } = rerank(filterResult.passed, overlay);

  // 6. Assemble bundle
  const latencyMs = Math.round(performance.now() - startMs);

  return assembleBundle({
    roleId,
    query,
    taskText,
    packetContextSummary,
    ranked,
    rejected: filterResult.rejected,
    overlay,
    forbiddenHits: filterResult.forbidden_hits,
    staleCount: filterResult.stale_count,
    candidatePoolSize: merged.length,
    dedupedCount: deduped_count,
    latencyMs,
  });
}
