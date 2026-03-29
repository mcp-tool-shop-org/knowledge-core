// @roleos/knowledge-core — Role-aware retrieval engine
// Governed knowledge substrate for Role OS

// ── Types ───────────────────────────────────────────────────────────
export type {
  // Bundle
  RetrievalBundle,
  QueryTrace,
  MetadataFilter,
  RetrievalSummary,
  RetrievedChunk,
  ContentType,
  ChunkScores,
  TrustTier,
  FreshnessStatus,
  ChunkMetadata,
  ChunkCitation,
  RejectionReason,
  RejectedCandidate,
  ProvenanceSummary,
  EvidencePosture,
  FreshnessPosture,
  RetrievalWarningCode,
  RetrievalWarning,
  RetrievalDiagnostics,

  // Overlay
  RoleOverlay,
  RoleVocabulary,
  SourceRule,
  SourcePolicy,
  RetrievalPolicy,
  CitationStyle,
  SynthesisPolicy,
  EvalProfile,

  // Role OS Integration
  KnowledgeStatus,
  PacketKnowledge,
  EvidenceProvenance,
  FallbackState,
  FallbackDecision,
} from "./types.js";

// ── Validation ──────────────────────────────────────────────────────
export { validateOverlay, validateBundle, ENUMS } from "./validate.js";

// ── Storage ─────────────────────────────────────────────────────────
export { CorpusStore } from "./storage/corpus-store.js";
export type { DocumentRecord, ChunkRecord, ChunkWithDocument } from "./storage/corpus-store.js";

// ── Ingestion ───────────────────────────────────────────────────────
export { ingestFixtureCorpus, ingestCorpusData } from "./ingest/ingest.js";
export type { IngestResult } from "./ingest/ingest.js";

// ── Retrieval Pipeline ──────────────────────────────────────────────
export { retrieve } from "./retrieve/retrieve.js";
export type { RetrieveOptions } from "./retrieve/retrieve.js";
export { buildQuery } from "./retrieve/build-query.js";
export { lexicalSearch } from "./retrieve/lexical-search.js";
export { semanticSearch, embedCorpus, cosineSimilarity } from "./retrieve/semantic-search.js";
export { mergeCandidates } from "./retrieve/merge-candidates.js";
export { metadataFilter } from "./retrieve/metadata-filter.js";
export { rerank } from "./retrieve/rerank.js";
export { assembleBundle } from "./retrieve/bundle.js";
