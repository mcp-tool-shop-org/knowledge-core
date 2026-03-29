// Runtime validation for overlay and bundle JSON.
// Keeps type safety at the boundary — ingested JSON must pass these checks.

import type {
  RoleOverlay,
  RetrievalBundle,
  TrustTier,
  FreshnessStatus,
  ContentType,
  RejectionReason,
  RetrievalWarningCode,
  FallbackState,
  CitationStyle,
} from "./types.js";

const TRUST_TIERS: TrustTier[] = ["authoritative", "preferred", "general", "untrusted"];
const FRESHNESS_STATUSES: FreshnessStatus[] = ["fresh", "aging", "stale", "undated"];
const CONTENT_TYPES: ContentType[] = ["paragraph", "table", "list", "code", "excerpt"];
const REJECTION_REASONS: RejectionReason[] = [
  "forbidden_source", "stale", "low_score", "role_mismatch",
  "duplicate", "conflict_downrank", "budget_cut",
];
const WARNING_CODES: RetrievalWarningCode[] = [
  "NO_HIGH_TRUST_MATCH", "ONLY_SHARED_CORPUS", "STALE_DOMINANT",
  "FORBIDDEN_SOURCE_HIT", "LOW_DIVERSITY", "CONFLICTING_EVIDENCE",
];
const FALLBACK_STATES: FallbackState[] = [
  "no_overlay", "no_strong_match", "stale_dominant",
  "forbidden_hit", "conflicting", "healthy",
];
const CITATION_STYLES: CitationStyle[] = ["inline", "footnote", "bundle_only"];

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

function err(errors: string[], msg: string): void {
  errors.push(msg);
}

function checkString(errors: string[], obj: unknown, field: string, label: string): void {
  const val = (obj as Record<string, unknown>)[field];
  if (typeof val !== "string" || val.length === 0) {
    err(errors, `${label}.${field} must be a non-empty string`);
  }
}

function checkStringArray(errors: string[], obj: unknown, field: string, label: string): void {
  const val = (obj as Record<string, unknown>)[field];
  if (!Array.isArray(val) || !val.every((v) => typeof v === "string")) {
    err(errors, `${label}.${field} must be an array of strings`);
  }
}

function checkNumber(errors: string[], obj: unknown, field: string, label: string): void {
  const val = (obj as Record<string, unknown>)[field];
  if (typeof val !== "number" || Number.isNaN(val)) {
    err(errors, `${label}.${field} must be a number`);
  }
}

function checkEnum<T extends string>(
  errors: string[],
  obj: unknown,
  field: string,
  allowed: T[],
  label: string,
): void {
  const val = (obj as Record<string, unknown>)[field];
  if (!allowed.includes(val as T)) {
    err(errors, `${label}.${field} must be one of: ${allowed.join(", ")}`);
  }
}

// ─── Overlay Validation ──────────────────────────────────────────

export function validateOverlay(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Overlay must be an object"] };
  }

  const o = data as Record<string, unknown>;

  if (o.version !== "1.0") err(errors, "version must be '1.0'");
  checkString(errors, o, "role_id", "overlay");
  checkString(errors, o, "label", "overlay");
  checkString(errors, o, "mission", "overlay");
  checkStringArray(errors, o, "anti_goals", "overlay");

  // vocabulary
  if (!o.vocabulary || typeof o.vocabulary !== "object") {
    err(errors, "overlay.vocabulary must be an object");
  } else {
    const v = o.vocabulary as Record<string, unknown>;
    checkStringArray(errors, v, "preferred_terms", "vocabulary");
    checkStringArray(errors, v, "boost_phrases", "vocabulary");
    if (v.synonyms && typeof v.synonyms !== "object") {
      err(errors, "vocabulary.synonyms must be an object");
    }
  }

  // source_policy
  if (!o.source_policy || typeof o.source_policy !== "object") {
    err(errors, "overlay.source_policy must be an object");
  } else {
    const sp = o.source_policy as Record<string, unknown>;
    if (!Array.isArray(sp.preferred_sources)) {
      err(errors, "source_policy.preferred_sources must be an array");
    }
  }

  // retrieval_policy
  if (!o.retrieval_policy || typeof o.retrieval_policy !== "object") {
    err(errors, "overlay.retrieval_policy must be an object");
  } else {
    const rp = o.retrieval_policy as Record<string, unknown>;
    checkNumber(errors, rp, "max_selected_chunks", "retrieval_policy");
    checkNumber(errors, rp, "lexical_weight", "retrieval_policy");
    checkNumber(errors, rp, "semantic_weight", "retrieval_policy");
    checkNumber(errors, rp, "metadata_weight", "retrieval_policy");
    checkNumber(errors, rp, "rerank_weight", "retrieval_policy");

    // Weights must sum to ~1.0 (±0.01 tolerance)
    const weights = [
      rp.lexical_weight as number,
      rp.semantic_weight as number,
      rp.metadata_weight as number,
      rp.rerank_weight as number,
    ];
    if (weights.every((w) => typeof w === "number")) {
      const sum = weights.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1.0) > 0.01) {
        err(errors, `retrieval_policy weights must sum to 1.0, got ${sum.toFixed(3)}`);
      }
    }
  }

  // synthesis_policy
  if (!o.synthesis_policy || typeof o.synthesis_policy !== "object") {
    err(errors, "overlay.synthesis_policy must be an object");
  } else {
    const sp = o.synthesis_policy as Record<string, unknown>;
    checkStringArray(errors, sp, "prioritize", "synthesis_policy");
    checkStringArray(errors, sp, "avoid", "synthesis_policy");
    if (sp.citation_style !== undefined) {
      checkEnum(errors, sp, "citation_style", CITATION_STYLES, "synthesis_policy");
    }
  }

  // eval_profile
  if (!o.eval_profile || typeof o.eval_profile !== "object") {
    err(errors, "overlay.eval_profile must be an object");
  } else {
    checkString(errors, o.eval_profile, "golden_set_id", "eval_profile");
    checkStringArray(errors, o.eval_profile, "distinctiveness_checks", "eval_profile");
  }

  return { valid: errors.length === 0, errors };
}

// ─── Bundle Validation ───────────────────────────────────────────

export function validateBundle(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Bundle must be an object"] };
  }

  const b = data as Record<string, unknown>;

  if (b.version !== "1.0") err(errors, "version must be '1.0'");
  checkString(errors, b, "role_id", "bundle");

  // query trace
  if (!b.query || typeof b.query !== "object") {
    err(errors, "bundle.query must be an object");
  } else {
    checkString(errors, b.query, "task_text", "query");
    checkStringArray(errors, b.query, "lexical_query", "query");
    checkStringArray(errors, b.query, "semantic_query", "query");
    checkString(errors, b.query, "generated_at", "query");
  }

  // selected chunks
  if (!Array.isArray(b.selected)) {
    err(errors, "bundle.selected must be an array");
  } else {
    for (let i = 0; i < (b.selected as unknown[]).length; i++) {
      const chunk = (b.selected as Record<string, unknown>[])[i];
      if (!chunk || typeof chunk !== "object") {
        err(errors, `selected[${i}] must be an object`);
        continue;
      }
      checkString(errors, chunk, "chunk_id", `selected[${i}]`);
      checkString(errors, chunk, "content", `selected[${i}]`);
      checkEnum(errors, chunk, "content_type", CONTENT_TYPES, `selected[${i}]`);

      if (chunk.metadata && typeof chunk.metadata === "object") {
        const m = chunk.metadata as Record<string, unknown>;
        checkEnum(errors, m, "trust_tier", TRUST_TIERS, `selected[${i}].metadata`);
        if (m.freshness && typeof m.freshness === "object") {
          checkEnum(errors, m.freshness, "status", FRESHNESS_STATUSES, `selected[${i}].metadata.freshness`);
        }
      }
    }
  }

  // rejected
  if (!Array.isArray(b.rejected)) {
    err(errors, "bundle.rejected must be an array");
  } else {
    for (let i = 0; i < (b.rejected as unknown[]).length; i++) {
      const r = (b.rejected as Record<string, unknown>[])[i];
      if (!r || typeof r !== "object") continue;
      checkString(errors, r, "chunk_id", `rejected[${i}]`);
      checkEnum(errors, r, "reason", REJECTION_REASONS, `rejected[${i}]`);
    }
  }

  // warnings
  if (Array.isArray(b.warnings)) {
    for (let i = 0; i < (b.warnings as unknown[]).length; i++) {
      const w = (b.warnings as Record<string, unknown>[])[i];
      if (!w || typeof w !== "object") continue;
      checkEnum(errors, w, "code", WARNING_CODES, `warnings[${i}]`);
    }
  }

  // provenance
  if (!b.provenance || typeof b.provenance !== "object") {
    err(errors, "bundle.provenance must be an object");
  }

  return { valid: errors.length === 0, errors };
}

// Re-export enum arrays for test/eval use
export const ENUMS = {
  TRUST_TIERS,
  FRESHNESS_STATUSES,
  CONTENT_TYPES,
  REJECTION_REASONS,
  WARNING_CODES,
  FALLBACK_STATES,
  CITATION_STYLES,
} as const;
