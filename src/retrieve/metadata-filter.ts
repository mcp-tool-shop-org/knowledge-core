/**
 * Metadata Filter — applies overlay governance to candidates.
 *
 * Handles: forbidden sources, excluded roles, stale penalties,
 * trust-tier boosts, document-type boosts, domain boosts.
 *
 * Populates the rejected array with real reasons.
 */

import type { RoleOverlay, RejectedCandidate } from "../types.js";
import type { MergedCandidate } from "./merge-candidates.js";

export type FilteredCandidate = MergedCandidate & {
  metadata_score: number;
  overlay_hits: string[];
};

export type FilterResult = {
  passed: FilteredCandidate[];
  rejected: RejectedCandidate[];
  forbidden_hits: number;
  stale_count: number;
};

/**
 * Apply overlay governance to candidate pool.
 */
export function metadataFilter(
  candidates: MergedCandidate[],
  overlay: RoleOverlay | null,
  now: Date = new Date(),
): FilterResult {
  const passed: FilteredCandidate[] = [];
  const rejected: RejectedCandidate[] = [];
  let forbiddenHits = 0;
  let staleCount = 0;

  for (const candidate of candidates) {
    const overlayHits: string[] = [];
    let metadataScore = 0.5; // base
    let isRejected = false;
    let rejectReason: RejectedCandidate["reason"] | null = null;
    let rejectNotes = "";

    // ── Forbidden Source Check ──────────────────────────────────
    if (overlay?.source_policy.forbidden_sources) {
      for (const rule of overlay.source_policy.forbidden_sources) {
        if (matchesPattern(candidate.source_id, rule.pattern) ||
            matchesPattern(candidate.document_type, rule.pattern) ||
            matchesPattern(candidate.domain, rule.pattern)) {
          isRejected = true;
          rejectReason = "forbidden_source";
          rejectNotes = `${rule.pattern}: ${rule.reason}`;
          forbiddenHits++;
          break;
        }
      }
    }

    if (isRejected) {
      rejected.push({ chunk_id: candidate.chunk_id, reason: rejectReason!, notes: rejectNotes });
      continue;
    }

    // ── Role Exclusion Check ────────────────────────────────────
    if (overlay) {
      const excludedRoles: string[] = JSON.parse(candidate.excluded_roles || "[]");
      if (excludedRoles.includes(overlay.role_id)) {
        rejected.push({
          chunk_id: candidate.chunk_id,
          reason: "role_mismatch",
          notes: `Chunk explicitly excludes role: ${overlay.role_id}`,
        });
        continue;
      }
    }

    // ── Applicable Roles Check ──────────────────────────────────
    if (overlay) {
      const applicableRoles: string[] = JSON.parse(candidate.applicable_roles || "[]");
      if (applicableRoles.length > 0 && !applicableRoles.includes(overlay.role_id)) {
        // Not hard-rejected, but penalized
        metadataScore *= (1 - (overlay.retrieval_policy.role_mismatch_penalty ?? 0.5));
        overlayHits.push(`penalty:role-mismatch(-${overlay.retrieval_policy.role_mismatch_penalty ?? 0.5})`);
      } else if (applicableRoles.includes(overlay.role_id)) {
        metadataScore *= 1.3;
        overlayHits.push("boost:applicable-role");
      }
    }

    // ── Staleness Check ─────────────────────────────────────────
    if (overlay?.retrieval_policy.freshness_max_age_days && candidate.updated_at) {
      const updatedAt = new Date(candidate.updated_at);
      const ageDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > overlay.retrieval_policy.freshness_max_age_days) {
        metadataScore *= (1 - (overlay.retrieval_policy.stale_penalty ?? 0.5));
        overlayHits.push(`penalty:stale(${Math.round(ageDays)}d > ${overlay.retrieval_policy.freshness_max_age_days}d)`);
        staleCount++;
      }
    }

    // ── Trust Tier Boost ────────────────────────────────────────
    if (overlay?.source_policy.trust_tier_boosts) {
      const boost = overlay.source_policy.trust_tier_boosts[candidate.trust_tier as keyof typeof overlay.source_policy.trust_tier_boosts];
      if (boost !== undefined) {
        metadataScore *= boost;
        overlayHits.push(`boost:trust-tier(${candidate.trust_tier}×${boost})`);
      }
    }

    // ── Document Type Boost ─────────────────────────────────────
    if (overlay?.source_policy.document_type_boosts) {
      const boost = overlay.source_policy.document_type_boosts[candidate.document_type];
      if (boost !== undefined) {
        metadataScore *= boost;
        overlayHits.push(`boost:doc-type(${candidate.document_type}×${boost})`);
      }
    }

    // ── Domain Boost ────────────────────────────────────────────
    if (overlay?.source_policy.domain_boosts) {
      const boost = overlay.source_policy.domain_boosts[candidate.domain];
      if (boost !== undefined) {
        metadataScore *= boost;
        overlayHits.push(`boost:domain(${candidate.domain}×${boost})`);
      }
    }

    // ── Preferred Source Boost ───────────────────────────────────
    if (overlay?.source_policy.preferred_sources) {
      for (const rule of overlay.source_policy.preferred_sources) {
        if (matchesPattern(candidate.source_id, rule.pattern) ||
            matchesPattern(candidate.document_type, rule.pattern) ||
            matchesPattern(candidate.domain, rule.pattern)) {
          metadataScore *= (rule.boost ?? 1.5);
          overlayHits.push(`boost:preferred-source(${rule.pattern}×${rule.boost ?? 1.5})`);
          break;
        }
      }
    }

    // Clamp metadata score to reasonable range
    metadataScore = Math.max(0.01, Math.min(metadataScore, 10.0));

    passed.push({
      ...candidate,
      metadata_score: metadataScore,
      overlay_hits: overlayHits,
    });
  }

  return { passed, rejected, forbidden_hits: forbiddenHits, stale_count: staleCount };
}

// ── Helpers ─────────────────────────────────────────────────────────

function matchesPattern(value: string, pattern: string): boolean {
  return value.toLowerCase().includes(pattern.toLowerCase());
}
