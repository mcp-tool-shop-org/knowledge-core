/**
 * Role Reranker — the heart of distinctiveness.
 *
 * Transparent weighted model, not a black-box.
 * final = lexical*w1 + semantic*w2 + metadata*w3 + overlay_vocab*w4 - penalties
 *
 * Plus diversity adjustment to prevent one source from filling the whole bundle.
 */

import type { RoleOverlay } from "../types.js";
import type { FilteredCandidate } from "./metadata-filter.js";

export type RankedCandidate = FilteredCandidate & {
  rerank_score: number;
  final_score: number;
  reasons_selected: string[];
  diversity_adjustment: number;
};

export type RerankResult = {
  ranked: RankedCandidate[];
  strategy: string;
};

/**
 * Rerank candidates using overlay weights and source diversity pressure.
 */
export function rerank(
  candidates: FilteredCandidate[],
  overlay: RoleOverlay | null,
): RerankResult {
  if (candidates.length === 0) {
    return { ranked: [], strategy: overlay ? "overlay-weighted" : "default-weighted" };
  }

  // Weights from overlay or defaults
  const w = overlay?.retrieval_policy ?? {
    lexical_weight: 0.3,
    semantic_weight: 0.3,
    metadata_weight: 0.2,
    rerank_weight: 0.2,
  };

  // ── Score each candidate ──────────────────────────────────────
  const scored: RankedCandidate[] = candidates.map((c) => {
    const reasons: string[] = [];

    // Overlay vocabulary hit scoring
    let vocabScore = 0;
    if (overlay) {
      const contentLower = c.content.toLowerCase();
      const tags: string[] = JSON.parse(c.tags || "[]");

      // Boost phrases
      for (const phrase of overlay.vocabulary.boost_phrases) {
        if (contentLower.includes(phrase.toLowerCase())) {
          vocabScore += 0.15;
          reasons.push(`vocab-hit:${phrase}`);
        }
      }

      // Preferred terms
      for (const term of overlay.vocabulary.preferred_terms) {
        if (contentLower.includes(term.toLowerCase()) || tags.some((t) => t.includes(term.toLowerCase()))) {
          vocabScore += 0.08;
        }
      }

      // Suppress phrases (negative)
      for (const phrase of overlay.vocabulary.suppress_phrases ?? []) {
        if (contentLower.includes(phrase.toLowerCase())) {
          vocabScore -= 0.2;
          reasons.push(`suppress-hit:${phrase}`);
        }
      }

      vocabScore = Math.max(0, Math.min(1, vocabScore));
    }

    // Weighted combination
    const rawScore =
      c.lexical_score * w.lexical_weight +
      c.semantic_score * w.semantic_weight +
      normalizeMetadata(c.metadata_score) * w.metadata_weight +
      vocabScore * w.rerank_weight;

    // Track scoring reasons
    if (c.lexical_score > 0.5) reasons.push(`strong-lexical(${c.lexical_score.toFixed(2)})`);
    if (c.semantic_score > 0.5) reasons.push(`strong-semantic(${c.semantic_score.toFixed(2)})`);
    if (c.metadata_score > 1.0) reasons.push(`metadata-boosted(${c.metadata_score.toFixed(2)})`);
    reasons.push(...c.overlay_hits);

    return {
      ...c,
      rerank_score: vocabScore,
      final_score: rawScore,
      reasons_selected: reasons,
      diversity_adjustment: 0,
    };
  });

  // ── Source diversity pressure ──────────────────────────────────
  // Penalize additional chunks from the same source
  const maxPerSource = overlay?.retrieval_policy.max_chunks_per_source ?? 3;
  const requireDiversity = overlay?.retrieval_policy.require_source_diversity ?? false;

  // Sort by raw score first
  scored.sort((a, b) => b.final_score - a.final_score);

  if (requireDiversity) {
    const sourceCounts = new Map<string, number>();
    for (const candidate of scored) {
      const count = sourceCounts.get(candidate.source_id) ?? 0;
      if (count >= maxPerSource) {
        // Penalize — push down, don't remove
        const penalty = 0.15 * (count - maxPerSource + 1);
        candidate.diversity_adjustment = -penalty;
        candidate.final_score -= penalty;
        candidate.reasons_selected.push(`diversity-penalty(source:${candidate.source_id}×${count + 1})`);
      }
      sourceCounts.set(candidate.source_id, count + 1);
    }

    // Re-sort after diversity adjustments
    scored.sort((a, b) => b.final_score - a.final_score);
  }

  return {
    ranked: scored,
    strategy: overlay ? "overlay-weighted" : "default-weighted",
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Normalize metadata score to 0-1 range.
 * Metadata scores can be > 1 due to multiplicative boosts.
 * Uses log scaling to preserve differentiation between boosted and unboosted.
 */
function normalizeMetadata(score: number): number {
  // Log scaling: base 0.5 maps to ~0.5, high boosts (4+) map to ~0.8+
  // This preserves the signal from multiplicative overlay boosts
  // better than sigmoid which crushes everything above 2.0.
  if (score <= 0) return 0;
  return Math.min(1, Math.log(1 + score) / Math.log(1 + 5));
}
