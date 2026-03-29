---
title: Role Overlays
description: How to define per-role retrieval behavior.
sidebar:
  order: 3
---

A role overlay is a JSON configuration that defines how one role retrieves and ranks evidence. It is the mechanism that prevents role blur.

## Overlay Structure

```json
{
  "version": "1.0",
  "role_id": "security-reviewer",
  "label": "Security Reviewer",
  "mission": "Identify security risks, exploit surfaces, and control weaknesses.",
  "anti_goals": [
    "Do not optimize for feature velocity over security truth.",
    "Do not drift into product positioning."
  ],
  "vocabulary": { ... },
  "source_policy": { ... },
  "retrieval_policy": { ... },
  "synthesis_policy": { ... },
  "eval_profile": { ... }
}
```

## Vocabulary

Controls what terms are boosted or suppressed during query expansion.

```json
{
  "preferred_terms": ["threat model", "CVE", "OWASP", "injection"],
  "synonyms": {
    "vulnerability": ["weakness", "security flaw", "exploit path"]
  },
  "boost_phrases": ["known vulnerability", "threat scenario"],
  "suppress_phrases": ["brand tone", "marketing copy"]
}
```

- **Top 3 boost phrases** are injected as signature terms regardless of task content
- **Suppress phrases** reduce reranking score when found in chunk content

## Source Policy

Controls which sources are preferred, allowed, or forbidden.

```json
{
  "preferred_sources": [
    { "pattern": "owasp", "reason": "Canonical security guidance", "boost": 2.0 }
  ],
  "forbidden_sources": [
    { "pattern": "marketing", "reason": "Non-security source class" }
  ],
  "trust_tier_boosts": {
    "authoritative": 2.0,
    "preferred": 1.4,
    "general": 1.0,
    "untrusted": 0.3
  },
  "document_type_boosts": {
    "threat-model": 2.0,
    "advisory": 1.8
  }
}
```

Forbidden sources are hard-rejected with a recorded reason. Preferred sources get multiplicative boosts.

## Retrieval Policy

Controls scoring weights, limits, and penalties.

```json
{
  "max_selected_chunks": 8,
  "lexical_weight": 0.35,
  "semantic_weight": 0.25,
  "metadata_weight": 0.2,
  "rerank_weight": 0.2,
  "require_source_diversity": true,
  "max_chunks_per_source": 2,
  "freshness_max_age_days": 365,
  "stale_penalty": 0.5,
  "role_mismatch_penalty": 0.8
}
```

**Weights must sum to 1.0** (validated at load time). This is enforced by the overlay validator.

## Synthesis Policy

Guidance for downstream consumers about how to use retrieved evidence.

```json
{
  "prioritize": ["risk identification", "exploit plausibility", "mitigation"],
  "avoid": ["brand framing", "feature prioritization"],
  "required_evidence_kinds": ["reference", "pattern", "precedent"],
  "citation_style": "inline"
}
```

## Eval Profile

Every overlay must declare how to test it.

```json
{
  "golden_set_id": "security-reviewer-v1",
  "distinctiveness_checks": [
    "finds exploit paths not feature gaps",
    "uses security precedent not product briefs",
    "avoids market framing entirely"
  ]
}
```

## Pilot Overlays

Five overlays ship with Knowledge Core:

| Role | Primary Domain | Key Differentiation |
|------|---------------|---------------------|
| Product Strategist | product | User value, tradeoffs, adoption leverage |
| Security Reviewer | security | Threat models, CVEs, exploit patterns |
| Competitive Analyst | market | Competitor signals, honest disadvantages |
| Docs Architect | docs | Structure patterns, navigation, IA |
| Critic Reviewer | quality | Quality standards, rejection precedent |

Each overlay is in `knowledge/roles/<role-id>.json`.

## Creating New Overlays

1. Copy an existing overlay as a starting point
2. Change `role_id`, `label`, `mission`, and `anti_goals`
3. Define distinct vocabulary (boost/suppress phrases)
4. Set source policy (what this role prefers and forbids)
5. Tune retrieval weights (must sum to 1.0)
6. Define eval profile with golden set and distinctiveness checks
7. Run `validateOverlay()` to confirm schema compliance
8. Add distinctiveness tests proving the overlay retrieves differently
