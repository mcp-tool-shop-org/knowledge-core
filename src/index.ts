// @roleos/knowledge-core — Role-aware retrieval engine
// Governed knowledge substrate for Role OS

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
