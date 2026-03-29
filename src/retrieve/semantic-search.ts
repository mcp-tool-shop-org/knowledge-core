/**
 * Semantic Search — embedding similarity over chunks.
 *
 * Uses Ollama for local embeddings (nomic-embed-text).
 * Falls back gracefully to empty results if Ollama is unavailable.
 *
 * Phase 2 implementation: in-process cosine similarity.
 * No external vector DB — just SQLite-stored embeddings + brute-force search.
 */

import type { CorpusStore, ChunkWithDocument } from "../storage/corpus-store.js";

export type SemanticCandidate = ChunkWithDocument & {
  semantic_score: number;
  retrieval_lane: "semantic";
};

const DEFAULT_MODEL = "nomic-embed-text";
const DEFAULT_OLLAMA_URL = "http://localhost:11434";

/**
 * Generate embedding via Ollama API.
 */
export async function generateEmbedding(
  text: string,
  model: string = DEFAULT_MODEL,
  ollamaUrl: string = DEFAULT_OLLAMA_URL,
): Promise<Float32Array | null> {
  try {
    const response = await fetch(`${ollamaUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: text }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { embeddings: number[][] };
    if (!data.embeddings?.[0]) return null;
    return new Float32Array(data.embeddings[0]);
  } catch {
    return null;
  }
}

/**
 * Embed all chunks in the store that don't have embeddings yet.
 * Returns count of newly embedded chunks.
 */
export async function embedCorpus(
  store: CorpusStore,
  model: string = DEFAULT_MODEL,
  ollamaUrl: string = DEFAULT_OLLAMA_URL,
): Promise<{ embedded: number; failed: number }> {
  const allChunks = store.getAllChunksWithDocuments();
  let embedded = 0;
  let failed = 0;

  for (const chunk of allChunks) {
    const existing = store.getEmbedding(chunk.chunk_id);
    if (existing) continue;

    const vector = await generateEmbedding(chunk.content, model, ollamaUrl);
    if (vector) {
      store.insertEmbedding(chunk.chunk_id, vector, model);
      embedded++;
    } else {
      failed++;
    }
  }

  return { embedded, failed };
}

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Run semantic search: embed query, compare against all stored embeddings.
 * Returns top-k candidates by cosine similarity.
 */
export async function semanticSearch(
  store: CorpusStore,
  queryText: string,
  limit: number = 50,
  model: string = DEFAULT_MODEL,
  ollamaUrl: string = DEFAULT_OLLAMA_URL,
): Promise<SemanticCandidate[]> {
  const queryVec = await generateEmbedding(queryText, model, ollamaUrl);
  if (!queryVec) return []; // Graceful fallback — lexical-only mode

  const allEmbeddings = store.getAllEmbeddings();
  if (allEmbeddings.length === 0) return [];

  // Score all chunks
  const scored = allEmbeddings.map((e) => ({
    chunk_id: e.chunk_id,
    score: cosineSimilarity(queryVec, e.vector),
  }));

  // Sort by score, take top-k
  scored.sort((a, b) => b.score - a.score);
  const topK = scored.slice(0, limit);

  // Hydrate with full chunk + document data
  const results: SemanticCandidate[] = [];
  for (const item of topK) {
    const chunk = store.getChunkWithDocument(item.chunk_id);
    if (chunk) {
      results.push({
        ...chunk,
        semantic_score: item.score,
        retrieval_lane: "semantic",
      });
    }
  }

  return results;
}
