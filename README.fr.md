<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/knowledge-core/readme.png" width="400" alt="Knowledge Core" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/actions"><img src="https://github.com/mcp-tool-shop-org/knowledge-core/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://mcp-tool-shop-org.github.io/knowledge-core/"><img src="https://img.shields.io/badge/docs-landing%20page-teal" alt="Landing Page" /></a>
</p>

Role-aware retrieval engine — substrat de connaissances gouverné pour [Role OS](https://github.com/mcp-tool-shop-org/role-os).

## Qu'est-ce que c'est ?

Un moteur de recherche où **les règles spécifiques à chaque rôle déterminent ce qui est récupéré, classé et cité**. Ce n'est pas un RAG générique — entrée contrôlée avec des limites de rôle strictes.

Même tâche, rôles différents, preuves fondamentalement différentes. Validé sur 5 rôles pilotes avec 86 tests.

## Architecture

- **Un corpus unique** avec métadonnées, embeddings et versionnement.
- **Superpositions spécifiques à chaque rôle** qui contrôlent la politique de la source, le vocabulaire, le rééchelonnement et la synthèse.
- **Ensembles de recherche structurés** avec une traçabilité complète, les raisons des rejets et une évaluation de la fiabilité.
- **Gouvernance de secours** pour les scénarios dégradés (données obsolètes, incohérentes ou peu fiables).

### Pipeline

```
task + overlay + corpus → query builder → BM25 + semantic → merge → metadata filter → rerank → bundle
```

### Contrats clés

| Contrat | Description |
|----------|-------------|
| `RetrievalBundle` | Sortie contrôlée de chaque opération de recherche. |
| `RoleOverlay` | Configuration de recherche déclarative spécifique à chaque rôle. |
| `PacketKnowledge` | Comment les paquets Role OS transportent les ensembles de connaissances. |
| `EvidenceProvenance` | Comment les éléments de preuve permettent de remonter aux sources de recherche. |
| `FallbackDecision` | Gouvernance explicite pour les scénarios de recherche dégradés. |

## Installation

```bash
npm install @roleos/knowledge-core
```

**Prérequis :** Node.js >= 18. Facultatif : [Ollama](https://ollama.com/) avec `nomic-embed-text` pour la recherche sémantique.

## Démarrage rapide

```typescript
import { CorpusStore, ingestFixtureCorpus, retrieve } from "@roleos/knowledge-core";

// 1. Create store and ingest corpus
const store = new CorpusStore(":memory:");
ingestFixtureCorpus(store, "./corpus.json");

// 2. Load a role overlay
const overlay = JSON.parse(readFileSync("./roles/security-reviewer.json", "utf-8"));

// 3. Retrieve with role governance
const bundle = await retrieve({
  store,
  roleId: "security-reviewer",
  taskText: "Review auth middleware for injection risks",
  overlay,
  lexicalOnly: true,
});

// bundle.selected — evidence chunks, scored and ranked
// bundle.rejected — why candidates were excluded
// bundle.provenance — trust and freshness posture
// bundle.warnings — degradation signals
```

## Rôles pilotes (vague 1)

| Rôle | Profil de recherche |
|------|------------------|
| Stratège produit | Valeur pour l'utilisateur, compromis, précédents stratégiques. |
| Expert en sécurité | Modèles de menace, CVE, schémas d'exploitation. |
| Analyste concurrentiel | Données du marché, inconvénients honnêtes, substituts. |
| Architecte de documentation | Modèles de structure, navigation, hiérarchie de l'information. |
| Correcteur | Normes de qualité, précédents de rejet, conformité contractuelle. |

## Comment ça marche

1. **Constructeur de requête** — enrichit le texte de la tâche avec le vocabulaire spécifique (phrases clés, termes préférés, synonymes).
2. **Recherche lexicale** — BM25 via SQLite FTS5 pour la correspondance exacte des termes.
3. **Recherche sémantique** — similarité des embeddings via Ollama (repli gracieux vers une recherche lexicale uniquement).
4. **Fusion + Déduplication** — union du pool de candidats provenant des deux sources.
5. **Filtre de métadonnées** — applique les sources interdites, les exclusions de rôle, les pénalités pour les données obsolètes, et favorise les documents de confiance ou de type spécifique.
6. **Rééchelonneur spécifique au rôle** — notation pondérée transparente avec une pression pour la diversité des sources.
7. **Assemblage de l'ensemble** — crée un `RetrievalBundle` contrôlé avec une trace d'audit complète.

## Confiance et sécurité

Cette bibliothèque fonctionne **uniquement localement** en tant que moteur de recherche.

- **Données traitées :** base de données SQLite locale, fragments de documents, embeddings.
- **Données NON traitées :** pas de crédentiels utilisateur, pas de données personnelles, pas d'API externes (sauf Ollama local facultatif).
- **Pas de trafic réseau** sauf la génération optionnelle d'embeddings via Ollama local (`localhost:11434`).
- **Aucune télémétrie** n'est collectée ou envoyée.
- **Aucune gestion de secrets** — ne lit, ne stocke ni ne transmet de crédentiels.

## Statut

| Phase | Description | Tests |
|-------|-------------|-------|
| 1. Structure du contrat | Types, validation, superpositions, fixtures. | 58 |
| 2. Moteur de recherche | Pipeline complet, 5 rôles distincts validés. | 86 |
| 3. Consommation de requêtes | Intégration de la requête Role OS. | Role OS : 38 |
| 4. Preuves des artefacts | Preuve de la chaîne de traçabilité. | Role OS : 22 |
| 5. Adoption en production | Fonctionne dans un moteur de recherche persistant. | Role OS : 11 |

## Licence

MIT

---

Conçu par <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>.
