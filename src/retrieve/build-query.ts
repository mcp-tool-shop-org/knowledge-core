/**
 * Query Builder — overlay-aware query expansion.
 *
 * Turns task text + role overlay into structured query components
 * for lexical and semantic retrieval lanes.
 */

import type { RoleOverlay, MetadataFilter } from "../types.js";

export type BuiltQuery = {
  lexical_terms: string[];
  lexical_fts_query: string;
  semantic_text: string;
  metadata_filters: MetadataFilter[];
  applied_overlay_rules: string[];
};

/**
 * Build query from task text and optional overlay.
 */
export function buildQuery(
  taskText: string,
  overlay: RoleOverlay | null,
  packetContextSummary?: string,
): BuiltQuery {
  const applied: string[] = [];

  // Base lexical terms from task
  const baseTerms = extractKeyTerms(taskText);

  // Overlay vocabulary expansion
  let expandedTerms = [...baseTerms];
  if (overlay) {
    // Add boost phrases — include both task-relevant AND top role-signature phrases
    const taskRelevantBoosts = overlay.vocabulary.boost_phrases
      .filter((phrase) => taskRelevance(phrase, taskText) > 0.3);
    // Also inject top 3 role-signature phrases regardless of task overlap
    // This is what makes roles retrieve domain-relevant material even on generic tasks
    const signatureBoosts = overlay.vocabulary.boost_phrases.slice(0, 3);
    const allBoosts = [...new Set([...taskRelevantBoosts, ...signatureBoosts])].slice(0, 8);
    expandedTerms.push(...allBoosts);
    if (allBoosts.length > 0) {
      applied.push(`vocab:boost(${allBoosts.length} terms, ${signatureBoosts.length} signature)`);
    }

    // Add preferred terms that overlap with task
    const preferredHits = overlay.vocabulary.preferred_terms
      .filter((term) => taskText.toLowerCase().includes(term.toLowerCase()));
    expandedTerms.push(...preferredHits);
    if (preferredHits.length > 0) {
      applied.push(`vocab:preferred(${preferredHits.length} hits)`);
    }

    // Expand synonyms
    for (const [canonical, synonyms] of Object.entries(overlay.vocabulary.synonyms)) {
      if (expandedTerms.some((t) => t.toLowerCase().includes(canonical.toLowerCase()))) {
        expandedTerms.push(...synonyms.slice(0, 2));
        applied.push(`vocab:synonym(${canonical})`);
      }
    }
  }

  // Deduplicate
  expandedTerms = [...new Set(expandedTerms.map((t) => t.toLowerCase()))];

  // Build FTS5 query (OR-joined for BM25 ranking)
  const ftsQuery = expandedTerms
    .map((t) => t.replace(/[^\w\s-]/g, "").trim())
    .filter((t) => t.length > 1)
    .map((t) => `"${t}"`)
    .join(" OR ");

  // Semantic query: task text + overlay mission context
  let semanticText = taskText;
  if (overlay) {
    semanticText += ` [Role context: ${overlay.mission}]`;
    applied.push("semantic:role-context");
  }
  if (packetContextSummary) {
    semanticText += ` [Packet: ${packetContextSummary}]`;
    applied.push("semantic:packet-context");
  }

  // Metadata filters from overlay
  const metadataFilters: MetadataFilter[] = [];
  if (overlay) {
    // Forbidden sources become exclusion filters
    if (overlay.source_policy.forbidden_sources?.length) {
      applied.push(`filter:forbidden(${overlay.source_policy.forbidden_sources.length} sources)`);
    }
  }

  return {
    lexical_terms: expandedTerms,
    lexical_fts_query: ftsQuery || taskText, // fallback to raw task if expansion is empty
    semantic_text: semanticText,
    metadata_filters: metadataFilters,
    applied_overlay_rules: applied,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Extract key terms from text (simple tokenization + stop word removal).
 */
function extractKeyTerms(text: string): string[] {
  const STOP_WORDS = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such", "no",
    "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "because", "but", "and", "or", "if", "while", "this", "that", "these",
    "those", "i", "me", "my", "we", "our", "you", "your", "he", "him",
    "she", "her", "it", "its", "they", "them", "their", "what", "which",
    "who", "whom", "whose",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Simple relevance score: what fraction of phrase words appear in task text.
 */
function taskRelevance(phrase: string, taskText: string): number {
  const phraseWords = phrase.toLowerCase().split(/\s+/);
  const taskLower = taskText.toLowerCase();
  const hits = phraseWords.filter((w) => taskLower.includes(w)).length;
  return hits / phraseWords.length;
}
