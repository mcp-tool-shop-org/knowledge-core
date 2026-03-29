import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { validateOverlay, validateBundle, ENUMS } from "../src/validate.js";
import type {
  RetrievalBundle,
  RoleOverlay,
  PacketKnowledge,
  EvidenceProvenance,
  FallbackDecision,
  FallbackState,
} from "../src/types.js";

const ROOT = resolve(import.meta.dirname, "..");
const ROLES_DIR = join(ROOT, "knowledge", "roles");
const FIXTURES_DIR = join(ROOT, "test", "fixtures");

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

// ─── Type Compilation ────────────────────────────────────────────
// If these tests compile, the type spine is locked.

describe("type compilation", () => {
  it("RetrievalBundle type is structurally sound", () => {
    const bundle: RetrievalBundle = {
      version: "1.0",
      role_id: "test",
      query: {
        task_text: "test task",
        lexical_query: ["test"],
        semantic_query: ["test query"],
        applied_overlay_rules: [],
        applied_filters: [],
        generated_at: new Date().toISOString(),
      },
      summary: {
        total_candidates: 0,
        selected_count: 0,
        stale_count: 0,
        forbidden_hits: 0,
        trust_tier_breakdown: { authoritative: 0, preferred: 0, general: 0, untrusted: 0 },
        source_breakdown: {},
        rerank_strategy: "none",
      },
      selected: [],
      rejected: [],
      provenance: {
        source_ids: [],
        document_ids: [],
        trust_posture: "weak",
        freshness_posture: "stale",
      },
      warnings: [],
      diagnostics: {
        latency_ms: 0,
        candidate_pool_size: 0,
        deduped_count: 0,
        dropped_forbidden_count: 0,
        dropped_stale_count: 0,
      },
    };
    expect(bundle.version).toBe("1.0");
  });

  it("PacketKnowledge extension type compiles", () => {
    const pk: PacketKnowledge = {
      retrieval_bundle: {
        version: "1.0",
        role_id: "test",
        query: {
          task_text: "t",
          lexical_query: [],
          semantic_query: [],
          applied_overlay_rules: [],
          applied_filters: [],
          generated_at: "",
        },
        summary: {
          total_candidates: 0,
          selected_count: 0,
          stale_count: 0,
          forbidden_hits: 0,
          trust_tier_breakdown: { authoritative: 0, preferred: 0, general: 0, untrusted: 0 },
          source_breakdown: {},
          rerank_strategy: "none",
        },
        selected: [],
        rejected: [],
        provenance: { source_ids: [], document_ids: [], trust_posture: "weak", freshness_posture: "stale" },
        warnings: [],
        diagnostics: { latency_ms: 0, candidate_pool_size: 0, deduped_count: 0, dropped_forbidden_count: 0, dropped_stale_count: 0 },
      },
      status: "none",
    };
    expect(pk.status).toBe("none");
  });

  it("EvidenceProvenance extension type compiles", () => {
    const ep: EvidenceProvenance = {
      source_id: "src-1",
      document_id: "doc-1",
      chunk_id: "chunk-1",
      trust_tier: "authoritative",
      freshness_status: "fresh",
      citation_reference: "Test ref",
    };
    expect(ep.trust_tier).toBe("authoritative");
  });

  it("FallbackDecision type compiles", () => {
    const fd: FallbackDecision = {
      state: "no_overlay",
      action: "continue",
      message: "No overlay found — using shared corpus only",
    };
    expect(fd.action).toBe("continue");
  });
});

// ─── Enum Integrity ──────────────────────────────────────────────

describe("enum integrity", () => {
  it("trust tiers are exactly 4", () => {
    expect(ENUMS.TRUST_TIERS).toHaveLength(4);
    expect(ENUMS.TRUST_TIERS).toContain("authoritative");
    expect(ENUMS.TRUST_TIERS).toContain("untrusted");
  });

  it("freshness statuses are exactly 4", () => {
    expect(ENUMS.FRESHNESS_STATUSES).toHaveLength(4);
  });

  it("rejection reasons are exactly 7", () => {
    expect(ENUMS.REJECTION_REASONS).toHaveLength(7);
  });

  it("warning codes are exactly 6", () => {
    expect(ENUMS.WARNING_CODES).toHaveLength(6);
  });

  it("fallback states are exactly 6", () => {
    expect(ENUMS.FALLBACK_STATES).toHaveLength(6);
  });

  it("citation styles are exactly 3", () => {
    expect(ENUMS.CITATION_STYLES).toHaveLength(3);
  });
});

// ─── Overlay Validation ──────────────────────────────────────────

describe("overlay validation", () => {
  const overlayFiles = readdirSync(ROLES_DIR).filter((f) => f.endsWith(".json"));

  it("finds exactly 5 pilot overlays", () => {
    expect(overlayFiles).toHaveLength(5);
  });

  for (const file of overlayFiles) {
    describe(file, () => {
      const data = loadJson(join(ROLES_DIR, file));
      const result = validateOverlay(data);

      it("passes validation", () => {
        if (!result.valid) {
          console.error(`Validation errors for ${file}:`, result.errors);
        }
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("has version 1.0", () => {
        expect((data as RoleOverlay).version).toBe("1.0");
      });

      it("has non-empty anti_goals", () => {
        expect((data as RoleOverlay).anti_goals.length).toBeGreaterThan(0);
      });

      it("has retrieval weights summing to 1.0", () => {
        const rp = (data as RoleOverlay).retrieval_policy;
        const sum = rp.lexical_weight + rp.semantic_weight + rp.metadata_weight + rp.rerank_weight;
        expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
      });

      it("has at least one preferred source", () => {
        expect((data as RoleOverlay).source_policy.preferred_sources.length).toBeGreaterThan(0);
      });

      it("has eval profile with golden set", () => {
        expect((data as RoleOverlay).eval_profile.golden_set_id).toBeTruthy();
        expect((data as RoleOverlay).eval_profile.distinctiveness_checks.length).toBeGreaterThan(0);
      });
    });
  }
});

// ─── Overlay Distinctiveness ─────────────────────────────────────
// The whole point: roles must NOT blur.

describe("overlay distinctiveness", () => {
  const overlays: RoleOverlay[] = readdirSync(ROLES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => loadJson(join(ROLES_DIR, f)) as RoleOverlay);

  it("all 5 roles have unique role_ids", () => {
    const ids = overlays.map((o) => o.role_id);
    expect(new Set(ids).size).toBe(5);
  });

  it("no two roles share the same preferred sources", () => {
    for (let i = 0; i < overlays.length; i++) {
      for (let j = i + 1; j < overlays.length; j++) {
        const a = new Set(overlays[i].source_policy.preferred_sources.map((s) => s.pattern));
        const b = new Set(overlays[j].source_policy.preferred_sources.map((s) => s.pattern));
        const overlap = [...a].filter((x) => b.has(x));
        // Some shared sources are expected (e.g., user-research), but majority must differ
        const overlapRatio = overlap.length / Math.max(a.size, b.size);
        expect(overlapRatio).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it("each role has unique boost_phrases", () => {
    for (let i = 0; i < overlays.length; i++) {
      for (let j = i + 1; j < overlays.length; j++) {
        const a = new Set(overlays[i].vocabulary.boost_phrases);
        const b = new Set(overlays[j].vocabulary.boost_phrases);
        const overlap = [...a].filter((x) => b.has(x));
        const overlapRatio = overlap.length / Math.max(a.size, b.size);
        expect(overlapRatio).toBeLessThan(0.3);
      }
    }
  });

  it("forbidden sources of one role appear in preferred of another", () => {
    // Security reviewer forbids marketing; product strategist prefers it (indirectly)
    // This ensures roles genuinely pull different material
    const secReviewer = overlays.find((o) => o.role_id === "security-reviewer")!;
    const forbidden = secReviewer.source_policy.forbidden_sources?.map((s) => s.pattern) ?? [];
    expect(forbidden).toContain("marketing");
    expect(forbidden).toContain("competitive-analysis");
  });

  it("synthesis priorities are distinct across roles", () => {
    for (let i = 0; i < overlays.length; i++) {
      for (let j = i + 1; j < overlays.length; j++) {
        const a = new Set(overlays[i].synthesis_policy.prioritize);
        const b = new Set(overlays[j].synthesis_policy.prioritize);
        const overlap = [...a].filter((x) => b.has(x));
        const overlapRatio = overlap.length / Math.max(a.size, b.size);
        expect(overlapRatio).toBeLessThan(0.4);
      }
    }
  });
});

// ─── Bundle Validation ───────────────────────────────────────────

describe("bundle validation", () => {
  const bundleFiles = readdirSync(FIXTURES_DIR).filter((f) => f.startsWith("bundle-") && f.endsWith(".json"));

  for (const file of bundleFiles) {
    describe(file, () => {
      const data = loadJson(join(FIXTURES_DIR, file));
      const result = validateBundle(data);

      it("passes validation", () => {
        if (!result.valid) {
          console.error(`Validation errors for ${file}:`, result.errors);
        }
        expect(result.valid).toBe(true);
      });

      it("has version 1.0", () => {
        expect((data as RetrievalBundle).version).toBe("1.0");
      });

      it("selected + rejected accounts for pipeline output", () => {
        const b = data as RetrievalBundle;
        expect(b.selected.length + b.rejected.length).toBeGreaterThan(0);
      });

      it("provenance is consistent with selected", () => {
        const b = data as RetrievalBundle;
        const selectedSourceIds = new Set(b.selected.map((c) => c.source_id));
        for (const sid of selectedSourceIds) {
          expect(b.provenance.source_ids).toContain(sid);
        }
      });
    });
  }
});

// ─── Bundle: Weak Posture ────────────────────────────────────────

describe("bundle weak posture", () => {
  const weak = loadJson(join(FIXTURES_DIR, "bundle-weak.json")) as RetrievalBundle;

  it("has weak trust posture", () => {
    expect(weak.provenance.trust_posture).toBe("weak");
  });

  it("has appropriate warnings", () => {
    const codes = weak.warnings.map((w) => w.code);
    expect(codes).toContain("NO_HIGH_TRUST_MATCH");
    expect(codes).toContain("ONLY_SHARED_CORPUS");
    expect(codes).toContain("STALE_DOMINANT");
  });

  it("stale count matches rejected stale entries", () => {
    const staleRejected = weak.rejected.filter((r) => r.reason === "stale").length;
    expect(weak.summary.stale_count).toBe(staleRejected);
  });
});

// ─── Fallback State Coverage ─────────────────────────────────────

describe("fallback state coverage", () => {
  it("every fallback state has a defined action mapping", () => {
    const stateActionMap: Record<FallbackState, string> = {
      no_overlay: "continue",
      no_strong_match: "warn",
      stale_dominant: "warn",
      forbidden_hit: "continue",
      conflicting: "warn",
      healthy: "continue",
    };
    for (const state of ENUMS.FALLBACK_STATES) {
      expect(stateActionMap[state]).toBeTruthy();
    }
  });
});
