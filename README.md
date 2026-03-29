# @roleos/knowledge-core

Role-aware retrieval engine — governed knowledge substrate for [Role OS](https://github.com/mcp-tool-shop-org/role-os).

## What This Is

A retrieval engine where **role law governs what gets retrieved, ranked, and cited**. Not generic RAG — governed input with hard role boundaries.

### Architecture

- **One canonical corpus** with metadata, embeddings, and versioning
- **Per-role overlays** that control source policy, vocabulary, reranking, and synthesis
- **Structured retrieval bundles** with full provenance, rejection trails, and trust posture
- **Fallback governance** for degraded scenarios (stale, conflicted, weak evidence)

### Contract Spine (Phase 1)

| Contract | Description |
|----------|-------------|
| `RetrievalBundle` | Governed output of every retrieval operation |
| `RoleOverlay` | Declarative per-role retrieval configuration |
| `PacketKnowledge` | How Role OS packets carry knowledge bundles |
| `EvidenceProvenance` | How evidence items trace back to retrieval sources |
| `FallbackDecision` | Explicit governance for degraded retrieval scenarios |

### Pilot Roles (Wave 1)

| Role | Retrieval Profile |
|------|------------------|
| Product Strategist | User value, tradeoffs, strategic precedent |
| Security Reviewer | Threat models, CVEs, exploit patterns |
| Competitive Analyst | Market data, honest disadvantages, substitutes |
| Docs Architect | Structure patterns, navigation, information hierarchy |
| Critic Reviewer | Quality standards, rejection precedent, contract compliance |

## Status

**Phase 1: Contract Spine** — locked and validated (58 tests).

## License

MIT
