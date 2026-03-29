/**
 * Bundle Assembly — governed retrieval output.
 *
 * Turns ranked candidates into the locked RetrievalBundle contract.
 * No prompt generation. No summarization. Just governed truth.
 */

import type {
  RetrievalBundle,
  RetrievedChunk,
  RejectedCandidate,
  RetrievalSummary,
  ProvenanceSummary,
  RetrievalWarning,
  RetrievalDiagnostics,
  TrustTier,
  FreshnessStatus,
  RoleOverlay,
} from "../types.js";
import type { RankedCandidate } from "./rerank.js";
import type { BuiltQuery } from "./build-query.js";

export type AssembleInput = {
  roleId: string;
  query: BuiltQuery;
  taskText: string;
  packetContextSummary?: string;
  ranked: RankedCandidate[];
  rejected: RejectedCandidate[];
  overlay: RoleOverlay | null;
  forbiddenHits: number;
  staleCount: number;
  candidatePoolSize: number;
  dedupedCount: number;
  latencyMs: number;
};

/**
 * Assemble the final RetrievalBundle from pipeline results.
 */
export function assembleBundle(input: AssembleInput): RetrievalBundle {
  const maxChunks = input.overlay?.retrieval_policy.max_selected_chunks ?? 10;
  const selected = input.ranked.slice(0, maxChunks);
  const budgetCut = input.ranked.slice(maxChunks);

  // Add budget-cut rejects
  const allRejected: RejectedCandidate[] = [
    ...input.rejected,
    ...budgetCut.map((c) => ({
      chunk_id: c.chunk_id,
      reason: "budget_cut" as const,
      notes: `Score ${c.final_score.toFixed(3)} below cutoff at position ${maxChunks}`,
    })),
  ];

  // Build selected chunks
  const selectedChunks: RetrievedChunk[] = selected.map((c) => {
    const tags: string[] = JSON.parse(c.tags || "[]");
    const applicableRoles: string[] = JSON.parse(c.applicable_roles || "[]");
    const excludedRoles: string[] = JSON.parse(c.excluded_roles || "[]");

    const freshnessStatus = computeFreshness(c.updated_at, input.overlay);

    return {
      chunk_id: c.chunk_id,
      document_id: c.document_id,
      source_id: c.source_id,
      source_type: guessSourceType(c.source_id),
      title: c.title,
      content: c.content,
      content_type: c.content_type,
      scores: {
        lexical: c.lexical_score,
        semantic: c.semantic_score,
        metadata: c.metadata_score,
        rerank: c.rerank_score,
        final: c.final_score,
      },
      reasons_selected: c.reasons_selected,
      overlay_hits: c.overlay_hits,
      metadata: {
        trust_tier: c.trust_tier as TrustTier,
        freshness: {
          status: freshnessStatus,
          updated_at: c.updated_at,
          max_age_days: input.overlay?.retrieval_policy.freshness_max_age_days,
        },
        tags,
        applicable_roles: applicableRoles.length > 0 ? applicableRoles : undefined,
        excluded_roles: excludedRoles.length > 0 ? excludedRoles : undefined,
        document_type: c.document_type,
        domain: c.domain,
      },
      citation: {
        reference: `${c.title} [${c.source_id}]`,
        locator: c.chunk_id,
      },
    };
  });

  // Summary
  const summary = buildSummary(selectedChunks, input);

  // Provenance
  const provenance = buildProvenance(selectedChunks);

  // Warnings
  const warnings = buildWarnings(selectedChunks, input, provenance);

  // Diagnostics
  const diagnostics: RetrievalDiagnostics = {
    latency_ms: input.latencyMs,
    candidate_pool_size: input.candidatePoolSize,
    deduped_count: input.dedupedCount,
    dropped_forbidden_count: input.forbiddenHits,
    dropped_stale_count: input.staleCount,
  };

  return {
    version: "1.0",
    role_id: input.roleId,
    query: {
      task_text: input.taskText,
      packet_context_summary: input.packetContextSummary,
      lexical_query: input.query.lexical_terms,
      semantic_query: [input.query.semantic_text],
      applied_overlay_rules: input.query.applied_overlay_rules,
      applied_filters: input.query.metadata_filters,
      generated_at: new Date().toISOString(),
    },
    summary,
    selected: selectedChunks,
    rejected: allRejected,
    provenance,
    warnings,
    diagnostics,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

function computeFreshness(updatedAt: string, overlay: RoleOverlay | null): FreshnessStatus {
  if (!updatedAt) return "undated";
  const ageDays = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  const maxAge = overlay?.retrieval_policy.freshness_max_age_days ?? 365;

  if (ageDays < maxAge * 0.5) return "fresh";
  if (ageDays < maxAge) return "aging";
  return "stale";
}

function guessSourceType(sourceId: string): string {
  if (sourceId.includes("internal")) return "internal-document";
  if (sourceId.includes("owasp") || sourceId.includes("cve")) return "external-reference";
  return "external-reference";
}

function buildSummary(selected: RetrievedChunk[], input: AssembleInput): RetrievalSummary {
  const trustBreakdown: Record<string, number> = { authoritative: 0, preferred: 0, general: 0, untrusted: 0 };
  const sourceBreakdown: Record<string, number> = {};

  for (const chunk of selected) {
    trustBreakdown[chunk.metadata.trust_tier] = (trustBreakdown[chunk.metadata.trust_tier] ?? 0) + 1;
    sourceBreakdown[chunk.source_id] = (sourceBreakdown[chunk.source_id] ?? 0) + 1;
  }

  return {
    total_candidates: input.candidatePoolSize,
    selected_count: selected.length,
    stale_count: input.staleCount,
    forbidden_hits: input.forbiddenHits,
    trust_tier_breakdown: trustBreakdown as Record<TrustTier, number>,
    source_breakdown: sourceBreakdown,
    rerank_strategy: input.overlay ? "overlay-weighted" : "default-weighted",
  };
}

function buildProvenance(selected: RetrievedChunk[]): ProvenanceSummary {
  const sourceIds = [...new Set(selected.map((c) => c.source_id))];
  const documentIds = [...new Set(selected.map((c) => c.document_id))];

  const hasAuthoritative = selected.some((c) => c.metadata.trust_tier === "authoritative");
  const hasPreferred = selected.some((c) => c.metadata.trust_tier === "preferred");
  const allGeneral = selected.every((c) => c.metadata.trust_tier === "general" || c.metadata.trust_tier === "untrusted");

  const trustPosture = hasAuthoritative ? "strong" : hasPreferred ? "mixed" : allGeneral || selected.length === 0 ? "weak" : "mixed";

  const hasFresh = selected.some((c) => c.metadata.freshness.status === "fresh");
  const hasStale = selected.some((c) => c.metadata.freshness.status === "stale");
  const freshnessPosture = hasFresh && !hasStale ? "fresh" : hasStale && !hasFresh ? "stale" : "mixed";

  return { source_ids: sourceIds, document_ids: documentIds, trust_posture: trustPosture, freshness_posture: freshnessPosture };
}

function buildWarnings(selected: RetrievedChunk[], input: AssembleInput, provenance: ProvenanceSummary): RetrievalWarning[] {
  const warnings: RetrievalWarning[] = [];

  if (provenance.trust_posture === "weak") {
    warnings.push({ code: "NO_HIGH_TRUST_MATCH", message: "No authoritative or preferred sources in selected chunks" });
  }

  if (selected.length > 0 && selected.every((c) => c.overlay_hits.length === 0)) {
    warnings.push({ code: "ONLY_SHARED_CORPUS", message: "No role-specific overlay hits — all from shared corpus" });
  }

  if (input.staleCount > selected.length * 0.5) {
    warnings.push({ code: "STALE_DOMINANT", message: `${input.staleCount} stale candidates in pool` });
  }

  if (input.forbiddenHits > 0) {
    warnings.push({ code: "FORBIDDEN_SOURCE_HIT", message: `${input.forbiddenHits} forbidden source(s) removed` });
  }

  if (provenance.source_ids.length === 1 && selected.length > 2) {
    warnings.push({ code: "LOW_DIVERSITY", message: "All selected chunks from single source" });
  }

  return warnings;
}
