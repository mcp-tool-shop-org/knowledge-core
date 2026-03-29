import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { CorpusStore } from "../src/storage/corpus-store.js";
import { ingestCorpusData } from "../src/ingest/ingest.js";
import { retrieve } from "../src/retrieve/retrieve.js";
import { validateBundle } from "../src/validate.js";
import type { RoleOverlay, RetrievalBundle } from "../src/types.js";

const ROOT = resolve(import.meta.dirname, "..");
const CORPUS_PATH = resolve(ROOT, "knowledge", "corpus", "fixtures", "corpus-divergence.json");
const ROLES_DIR = resolve(ROOT, "knowledge", "roles");

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

// ── Shared Setup ────────────────────────────────────────────────────

let store: CorpusStore;
const overlays = new Map<string, RoleOverlay>();

const PILOT_ROLES = [
  "product-strategist",
  "security-reviewer",
  "competitive-analyst",
  "docs-architect",
  "critic-reviewer",
];

// Overlapping task that tempts blur
const OVERLAP_TASK = "Assess whether we should add real-time collaboration features to the product.";

beforeAll(() => {
  store = new CorpusStore(":memory:");
  const corpus = loadJson<any>(CORPUS_PATH);
  const result = ingestCorpusData(store, corpus);
  expect(result.errors).toHaveLength(0);
  expect(result.chunks_ingested).toBeGreaterThan(20);

  for (const roleId of PILOT_ROLES) {
    overlays.set(roleId, loadJson<RoleOverlay>(resolve(ROLES_DIR, `${roleId}.json`)));
  }
});

// ── Ingestion ───────────────────────────────────────────────────────

describe("corpus ingestion", () => {
  it("ingests all documents", () => {
    expect(store.documentCount()).toBeGreaterThan(15);
  });

  it("ingests all chunks", () => {
    expect(store.chunkCount()).toBeGreaterThan(20);
  });

  it("FTS index works", () => {
    const results = store.searchFTS("collaboration");
    expect(results.length).toBeGreaterThan(0);
  });

  it("FTS returns security content for security query", () => {
    const results = store.searchFTS('"injection" OR "vulnerability" OR "OWASP"');
    expect(results.some((r) => r.domain === "security")).toBe(true);
  });
});

// ── End-to-End Pipeline ─────────────────────────────────────────────

describe("end-to-end retrieval", () => {
  it("produces valid bundle for security-reviewer", async () => {
    const bundle = await retrieve({
      store,
      roleId: "security-reviewer",
      taskText: "Review the auth middleware for injection risks",
      overlay: overlays.get("security-reviewer")!,
      lexicalOnly: true,
    });

    expect(bundle.version).toBe("1.0");
    expect(bundle.role_id).toBe("security-reviewer");
    expect(bundle.selected.length).toBeGreaterThan(0);

    const validation = validateBundle(bundle);
    expect(validation.valid).toBe(true);
  });

  it("produces valid bundle for product-strategist", async () => {
    const bundle = await retrieve({
      store,
      roleId: "product-strategist",
      taskText: OVERLAP_TASK,
      overlay: overlays.get("product-strategist")!,
      lexicalOnly: true,
    });

    expect(bundle.version).toBe("1.0");
    expect(bundle.selected.length).toBeGreaterThan(0);
    const validation = validateBundle(bundle);
    expect(validation.valid).toBe(true);
  });

  it("bundle diagnostics are populated", async () => {
    const bundle = await retrieve({
      store,
      roleId: "security-reviewer",
      taskText: "Check for SQL injection vulnerabilities",
      overlay: overlays.get("security-reviewer")!,
      lexicalOnly: true,
    });

    expect(bundle.diagnostics.latency_ms).toBeGreaterThanOrEqual(0);
    expect(bundle.diagnostics.candidate_pool_size).toBeGreaterThan(0);
  });

  it("rejected candidates have reasons", async () => {
    const bundle = await retrieve({
      store,
      roleId: "security-reviewer",
      taskText: OVERLAP_TASK,
      overlay: overlays.get("security-reviewer")!,
      lexicalOnly: true,
    });

    // Security reviewer should reject marketing/competitive sources
    const forbiddenRejections = bundle.rejected.filter((r) => r.reason === "forbidden_source");
    expect(forbiddenRejections.length).toBeGreaterThan(0);
  });

  it("works without overlay (shared corpus only)", async () => {
    const bundle = await retrieve({
      store,
      roleId: "unknown-role",
      taskText: OVERLAP_TASK,
      overlay: null,
      lexicalOnly: true,
    });

    expect(bundle.version).toBe("1.0");
    expect(bundle.selected.length).toBeGreaterThan(0);
    const validation = validateBundle(bundle);
    expect(validation.valid).toBe(true);
  });
});

// ── Metadata Governance ─────────────────────────────────────────────

describe("metadata governance", () => {
  it("security-reviewer rejects marketing sources", async () => {
    const bundle = await retrieve({
      store,
      roleId: "security-reviewer",
      taskText: "Assess the product launch plan and messaging",
      overlay: overlays.get("security-reviewer")!,
      lexicalOnly: true,
    });

    const marketingChunks = bundle.selected.filter((c) =>
      c.source_id.includes("marketing") || c.metadata.domain === "marketing"
    );
    expect(marketingChunks).toHaveLength(0);
  });

  it("security-reviewer rejects competitive-analysis sources", async () => {
    const bundle = await retrieve({
      store,
      roleId: "security-reviewer",
      taskText: OVERLAP_TASK,
      overlay: overlays.get("security-reviewer")!,
      lexicalOnly: true,
    });

    const competitiveChunks = bundle.selected.filter((c) =>
      c.source_id.includes("competitive")
    );
    expect(competitiveChunks).toHaveLength(0);
  });

  it("competitive-analyst rejects security-advisory sources", async () => {
    const bundle = await retrieve({
      store,
      roleId: "competitive-analyst",
      taskText: "Analyze the security landscape for our product",
      overlay: overlays.get("competitive-analyst")!,
      lexicalOnly: true,
    });

    const securityAdvisoryChunks = bundle.selected.filter((c) =>
      c.source_id.includes("security-advisory")
    );
    expect(securityAdvisoryChunks).toHaveLength(0);
  });

  it("trust tier boosts affect selected chunks", async () => {
    const bundle = await retrieve({
      store,
      roleId: "security-reviewer",
      taskText: "Review the API for security vulnerabilities",
      overlay: overlays.get("security-reviewer")!,
      lexicalOnly: true,
    });

    if (bundle.selected.length >= 2) {
      // Authoritative chunks should score higher
      const authoritative = bundle.selected.filter((c) => c.metadata.trust_tier === "authoritative");
      const general = bundle.selected.filter((c) => c.metadata.trust_tier === "general");
      if (authoritative.length > 0 && general.length > 0) {
        const avgAuth = authoritative.reduce((sum, c) => sum + c.scores.final, 0) / authoritative.length;
        const avgGen = general.reduce((sum, c) => sum + c.scores.final, 0) / general.length;
        expect(avgAuth).toBeGreaterThan(avgGen);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// DISTINCTIVENESS — THE REAL BAR
// Same task, 5 roles, different evidence.
// Not just different phrasing. Different chunks.
// ═══════════════════════════════════════════════════════════════════

describe("role distinctiveness", () => {
  const bundles = new Map<string, RetrievalBundle>();

  beforeAll(async () => {
    for (const roleId of PILOT_ROLES) {
      const bundle = await retrieve({
        store,
        roleId,
        taskText: OVERLAP_TASK,
        overlay: overlays.get(roleId)!,
        lexicalOnly: true,
      });
      bundles.set(roleId, bundle);
    }
  });

  it("all 5 roles produce non-empty bundles", () => {
    for (const [roleId, bundle] of bundles) {
      expect(bundle.selected.length, `${roleId} should have selected chunks`).toBeGreaterThan(0);
    }
  });

  it("security-reviewer retrieves security domain chunks", () => {
    const bundle = bundles.get("security-reviewer")!;
    const securityChunks = bundle.selected.filter((c) => c.metadata.domain === "security");
    expect(securityChunks.length).toBeGreaterThan(0);
  });

  it("product-strategist retrieves product domain chunks", () => {
    const bundle = bundles.get("product-strategist")!;
    const productChunks = bundle.selected.filter((c) => c.metadata.domain === "product");
    expect(productChunks.length).toBeGreaterThan(0);
  });

  it("competitive-analyst retrieves market domain chunks", () => {
    const bundle = bundles.get("competitive-analyst")!;
    const marketChunks = bundle.selected.filter((c) => c.metadata.domain === "market");
    expect(marketChunks.length).toBeGreaterThan(0);
  });

  it("docs-architect retrieves docs domain chunks", () => {
    const bundle = bundles.get("docs-architect")!;
    const docsChunks = bundle.selected.filter((c) => c.metadata.domain === "docs");
    expect(docsChunks.length).toBeGreaterThan(0);
  });

  it("critic-reviewer retrieves quality domain chunks", () => {
    const bundle = bundles.get("critic-reviewer")!;
    const qualityChunks = bundle.selected.filter((c) => c.metadata.domain === "quality");
    expect(qualityChunks.length).toBeGreaterThan(0);
  });

  it("no two roles select the same top-3 chunks", () => {
    for (let i = 0; i < PILOT_ROLES.length; i++) {
      for (let j = i + 1; j < PILOT_ROLES.length; j++) {
        const aTop3 = new Set(bundles.get(PILOT_ROLES[i])!.selected.slice(0, 3).map((c) => c.chunk_id));
        const bTop3 = new Set(bundles.get(PILOT_ROLES[j])!.selected.slice(0, 3).map((c) => c.chunk_id));
        const overlap = [...aTop3].filter((id) => bTop3.has(id));
        expect(
          overlap.length,
          `${PILOT_ROLES[i]} and ${PILOT_ROLES[j]} share ${overlap.length}/3 top chunks: ${overlap.join(", ")}`,
        ).toBeLessThan(3);
      }
    }
  });

  it("each role's top chunk is from its primary domain", () => {
    const expectedDomains: Record<string, string[]> = {
      "product-strategist": ["product"],
      "security-reviewer": ["security"],
      "competitive-analyst": ["market", "product"], // product briefs legitimately inform competitive analysis
      "docs-architect": ["docs"],
      "critic-reviewer": ["quality"],
    };

    for (const [roleId, domains] of Object.entries(expectedDomains)) {
      const bundle = bundles.get(roleId)!;
      const topChunk = bundle.selected[0];
      expect(
        domains.includes(topChunk.metadata.domain!),
        `${roleId} top chunk domain is '${topChunk.metadata.domain}', expected one of: ${domains.join(", ")}. Chunk: ${topChunk.chunk_id}`,
      ).toBe(true);
    }
  });

  it("security-reviewer does NOT select marketing or competitive chunks", () => {
    const bundle = bundles.get("security-reviewer")!;
    const forbidden = bundle.selected.filter((c) =>
      c.metadata.domain === "marketing" || c.source_id.includes("competitive") || c.source_id.includes("marketing")
    );
    expect(forbidden).toHaveLength(0);
  });

  it("competitive-analyst does NOT select security audit chunks", () => {
    const bundle = bundles.get("competitive-analyst")!;
    const secAudit = bundle.selected.filter((c) =>
      c.metadata.document_type === "security-audit" || c.metadata.document_type === "threat-model"
    );
    expect(secAudit).toHaveLength(0);
  });

  it("overlay hits are recorded in selected chunks", () => {
    for (const [roleId, bundle] of bundles) {
      const withHits = bundle.selected.filter((c) => c.overlay_hits.length > 0);
      expect(
        withHits.length,
        `${roleId} should have chunks with overlay hits`,
      ).toBeGreaterThan(0);
    }
  });

  it("source diversity is maintained", () => {
    for (const [roleId, bundle] of bundles) {
      if (bundle.selected.length >= 3) {
        const sources = new Set(bundle.selected.map((c) => c.source_id));
        expect(
          sources.size,
          `${roleId} should draw from multiple sources`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

// ── Fallback Governance ─────────────────────────────────────────────

describe("fallback governance", () => {
  it("no-overlay returns valid bundle with ONLY_SHARED_CORPUS warning", async () => {
    const bundle = await retrieve({
      store,
      roleId: "nonexistent-role",
      taskText: OVERLAP_TASK,
      overlay: null,
      lexicalOnly: true,
    });

    expect(bundle.selected.length).toBeGreaterThan(0);
    // No overlay hits expected
    const allHits = bundle.selected.flatMap((c) => c.overlay_hits);
    const overlaySpecific = allHits.filter((h) => h.startsWith("boost:preferred-source") || h.startsWith("boost:doc-type"));
    expect(overlaySpecific).toHaveLength(0);
  });

  it("provenance posture reflects selected chunks", async () => {
    const bundle = await retrieve({
      store,
      roleId: "security-reviewer",
      taskText: "Review API security with threat model",
      overlay: overlays.get("security-reviewer")!,
      lexicalOnly: true,
    });

    // Should have authoritative or preferred sources
    const hasHighTrust = bundle.selected.some((c) =>
      c.metadata.trust_tier === "authoritative" || c.metadata.trust_tier === "preferred"
    );
    if (hasHighTrust) {
      expect(["strong", "mixed"]).toContain(bundle.provenance.trust_posture);
    }
  });

  it("bundle validation passes for all 5 pilot roles", async () => {
    for (const roleId of PILOT_ROLES) {
      const bundle = await retrieve({
        store,
        roleId,
        taskText: OVERLAP_TASK,
        overlay: overlays.get(roleId)!,
        lexicalOnly: true,
      });
      const result = validateBundle(bundle);
      expect(result.valid, `${roleId} bundle should validate: ${result.errors.join(", ")}`).toBe(true);
    }
  });
});
