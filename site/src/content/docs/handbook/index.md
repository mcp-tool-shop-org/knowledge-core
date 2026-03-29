---
title: Knowledge Core
description: Role-aware retrieval engine for Role OS.
sidebar:
  order: 0
---

Knowledge Core is a retrieval engine where **role law governs what gets retrieved, ranked, and cited**. It is the knowledge subsystem of [Role OS](https://github.com/mcp-tool-shop-org/role-os).

## The Problem

Generic RAG treats all queries the same. Every role gets the same chunks, the same ranking, the same context window stuffing. This produces role blur — a security reviewer and a product strategist sound identical because they received identical evidence.

## The Solution

Knowledge Core introduces **role overlays** — declarative per-role configurations that control:

- What sources to prefer or forbid
- How to weight lexical vs. semantic vs. metadata scores
- What vocabulary to boost or suppress
- How to handle weak, stale, or conflicting evidence

The result: same corpus, same task, materially different evidence per role.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Corpus** | A single document store with metadata, embeddings, and versioning |
| **Overlay** | A JSON config that defines how one role retrieves and ranks evidence |
| **Bundle** | The governed output of a retrieval operation — selected, rejected, provenance, warnings |
| **Fallback** | Explicit governance for degraded scenarios (weak, stale, conflicted, none) |

## Proven Claims

- 5 pilot roles retrieve measurably different evidence from the same corpus on the same task
- Every posture (strong/weak/stale/conflicted/none) produces distinct prompt and artifact behavior
- Forbidden sources are enforced, drift is detected, posture is visible to operators
- The full chain holds: overlay → bundle → prompt law → artifact behavior
