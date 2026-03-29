// ─── Retrieval Bundle ─────────────────────────────────────────────
// The governed output of every retrieval operation.
// Structured, inspectable, citation-ready, law-friendly.
// Not "context text." Not raw search hits.

export type RetrievalBundle = {
  version: "1.0";
  role_id: string;
  query: QueryTrace;
  summary: RetrievalSummary;
  selected: RetrievedChunk[];
  rejected: RejectedCandidate[];
  provenance: ProvenanceSummary;
  warnings: RetrievalWarning[];
  diagnostics: RetrievalDiagnostics;
};

// ─── Query Trace ─────────────────────────────────────────────────
// Full audit trail of how the query was constructed.

export type QueryTrace = {
  task_text: string;
  packet_context_summary?: string;
  lexical_query: string[];
  semantic_query: string[];
  applied_overlay_rules: string[];
  applied_filters: MetadataFilter[];
  generated_at: string; // ISO 8601
};

export type MetadataFilter = {
  field: string;
  op: "eq" | "neq" | "in" | "not_in" | "gt" | "lt" | "contains";
  value: string | string[] | number | boolean;
};

// ─── Retrieval Summary ───────────────────────────────────────────
// Aggregate stats for the bundle — quick posture read.

export type RetrievalSummary = {
  total_candidates: number;
  selected_count: number;
  stale_count: number;
  forbidden_hits: number;
  trust_tier_breakdown: Record<TrustTier, number>;
  source_breakdown: Record<string, number>;
  rerank_strategy: string;
};

// ─── Retrieved Chunk ─────────────────────────────────────────────
// A single selected piece of evidence with full scoring and metadata.

export type RetrievedChunk = {
  chunk_id: string;
  document_id: string;
  source_id: string;
  source_type: string;
  title?: string;
  uri?: string;

  content: string;
  content_type: ContentType;

  scores: ChunkScores;
  reasons_selected: string[];
  overlay_hits: string[];

  metadata: ChunkMetadata;
  citation: ChunkCitation;
};

export type ContentType = "paragraph" | "table" | "list" | "code" | "excerpt";

export type ChunkScores = {
  lexical: number;
  semantic: number;
  metadata: number;
  rerank: number;
  final: number;
};

export type TrustTier = "authoritative" | "preferred" | "general" | "untrusted";

export type FreshnessStatus = "fresh" | "aging" | "stale" | "undated";

export type ChunkMetadata = {
  trust_tier: TrustTier;
  freshness: {
    status: FreshnessStatus;
    updated_at?: string; // ISO 8601
    max_age_days?: number;
  };
  tags: string[];
  applicable_roles?: string[];
  excluded_roles?: string[];
  document_type?: string;
  domain?: string;
  version?: string;
};

export type ChunkCitation = {
  reference: string;
  locator?: string;
};

// ─── Rejected Candidate ──────────────────────────────────────────
// Why a candidate was excluded — governance requires this trail.

export type RejectionReason =
  | "forbidden_source"
  | "stale"
  | "low_score"
  | "role_mismatch"
  | "duplicate"
  | "conflict_downrank"
  | "budget_cut";

export type RejectedCandidate = {
  chunk_id: string;
  reason: RejectionReason;
  notes?: string;
};

// ─── Provenance Summary ──────────────────────────────────────────
// Trust and freshness posture for the whole bundle.

export type EvidencePosture = "strong" | "mixed" | "weak";
export type FreshnessPosture = "fresh" | "mixed" | "stale";

export type ProvenanceSummary = {
  source_ids: string[];
  document_ids: string[];
  trust_posture: EvidencePosture;
  freshness_posture: FreshnessPosture;
};

// ─── Warnings ────────────────────────────────────────────────────
// Structured signals for downstream consumers (dispatch, fallback).

export type RetrievalWarningCode =
  | "NO_HIGH_TRUST_MATCH"
  | "ONLY_SHARED_CORPUS"
  | "STALE_DOMINANT"
  | "FORBIDDEN_SOURCE_HIT"
  | "LOW_DIVERSITY"
  | "CONFLICTING_EVIDENCE";

export type RetrievalWarning = {
  code: RetrievalWarningCode;
  message: string;
};

// ─── Diagnostics ─────────────────────────────────────────────────
// Performance and pipeline stats — not user-facing, but inspectable.

export type RetrievalDiagnostics = {
  latency_ms: number;
  candidate_pool_size: number;
  deduped_count: number;
  dropped_forbidden_count: number;
  dropped_stale_count: number;
};

// ─── Role Overlay ────────────────────────────────────────────────
// Declarative per-role retrieval configuration.
// Compact for Wave 1 — 7-bucket expansion in Wave 2.

export type RoleOverlay = {
  version: "1.0";
  role_id: string;
  label: string;

  mission: string;
  anti_goals: string[];

  vocabulary: RoleVocabulary;
  source_policy: SourcePolicy;
  retrieval_policy: RetrievalPolicy;
  synthesis_policy: SynthesisPolicy;

  bridge_roles?: string[];

  eval_profile: EvalProfile;
};

export type RoleVocabulary = {
  preferred_terms: string[];
  synonyms: Record<string, string[]>;
  boost_phrases: string[];
  suppress_phrases?: string[];
};

export type SourceRule = {
  pattern: string;
  reason: string;
  boost?: number;
};

export type SourcePolicy = {
  preferred_sources: SourceRule[];
  allowed_sources?: SourceRule[];
  forbidden_sources?: SourceRule[];
  trust_tier_boosts?: Partial<Record<TrustTier, number>>;
  document_type_boosts?: Record<string, number>;
  domain_boosts?: Record<string, number>;
};

export type RetrievalPolicy = {
  max_selected_chunks: number;
  lexical_weight: number;
  semantic_weight: number;
  metadata_weight: number;
  rerank_weight: number;
  require_source_diversity?: boolean;
  max_chunks_per_source?: number;
  freshness_max_age_days?: number;
  stale_penalty?: number;
  role_mismatch_penalty?: number;
};

export type CitationStyle = "inline" | "footnote" | "bundle_only";

export type SynthesisPolicy = {
  prioritize: string[];
  avoid: string[];
  required_evidence_kinds?: string[];
  citation_style?: CitationStyle;
};

export type EvalProfile = {
  golden_set_id: string;
  distinctiveness_checks: string[];
};

// ─── Packet Extension ────────────────────────────────────────────
// How Role OS packets carry knowledge bundles.

export type KnowledgeStatus = "strong" | "weak" | "stale" | "conflicted" | "none";

export type PacketKnowledge = {
  retrieval_bundle: RetrievalBundle;
  status: KnowledgeStatus;
};

// ─── Evidence Provenance Extension ───────────────────────────────
// How evidence items trace back to retrieval sources.

export type EvidenceProvenance = {
  source_id: string;
  document_id: string;
  chunk_id: string;
  trust_tier: TrustTier;
  freshness_status: FreshnessStatus;
  citation_reference: string;
};

// ─── Fallback Policy States ──────────────────────────────────────
// Explicit governance for degraded retrieval scenarios.

export type FallbackState =
  | "no_overlay"       // shared corpus only
  | "no_strong_match"  // bundle marked weak, continue
  | "stale_dominant"   // bundle marked stale, warning surfaced
  | "forbidden_hit"    // forbidden sources removed, diagnostic logged
  | "conflicting"      // bundle marked conflicted, synthesis must acknowledge
  | "healthy";         // normal operation

export type FallbackDecision = {
  state: FallbackState;
  action: "continue" | "warn" | "degrade" | "block";
  message: string;
};
