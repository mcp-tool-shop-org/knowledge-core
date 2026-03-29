<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/knowledge-core/readme.png" width="400" alt="Knowledge Core" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/actions"><img src="https://github.com/mcp-tool-shop-org/knowledge-core/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://mcp-tool-shop-org.github.io/knowledge-core/"><img src="https://img.shields.io/badge/docs-landing%20page-teal" alt="Landing Page" /></a>
</p>

Motore di ricerca consapevole del ruolo: una base di conoscenza controllata per [Role OS](https://github.com/mcp-tool-shop-org/role-os).

## Cos'è

Un motore di ricerca in cui **le regole definite per ogni ruolo determinano cosa viene recuperato, classificato e citato**. Non un semplice RAG (Retrieval-Augmented Generation) generico, ma un sistema con input controllati e confini di ruolo ben definiti.

Lo stesso compito, ruoli diversi, evidenze sostanzialmente diverse. Testato su 5 ruoli pilota con 86 test.

## Architettura

- **Un corpus canonico** con metadati, embedding e versionamento.
- **Sovrapposizioni specifiche per ogni ruolo** che controllano le politiche delle fonti, il vocabolario, la riclassificazione e la sintesi.
- **Pacchetti di ricerca strutturati** con piena tracciabilità, registrazioni delle esclusioni e valutazione dell'affidabilità.
- **Meccanismi di controllo di emergenza** per situazioni degradate (dati obsoleti, conflittuali o poco affidabili).

### Pipeline

```
task + overlay + corpus → query builder → BM25 + semantic → merge → metadata filter → rerank → bundle
```

### Contratti Chiave

| Contratto | Descrizione |
|----------|-------------|
| `RetrievalBundle` | Output controllato di ogni operazione di ricerca. |
| `RoleOverlay` | Configurazione di ricerca dichiarativa specifica per ogni ruolo. |
| `PacketKnowledge` | Come i pacchetti di Role OS trasportano i dati. |
| `EvidenceProvenance` | Come le evidenze tracciano le fonti di ricerca. |
| `FallbackDecision` | Controllo esplicito per scenari di ricerca degradati. |

## Installazione

```bash
npm install @roleos/knowledge-core
```

**Requisiti:** Node.js >= 18. Opzionale: [Ollama](https://ollama.com/) con `nomic-embed-text` per la ricerca semantica.

## Guida Rapida

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

## Ruoli Pilota (Onda 1)

| Ruolo | Profilo di Ricerca |
|------|------------------|
| Product Strategist (Responsabile della Strategia di Prodotto) | Valore per l'utente, compromessi, precedenti strategici. |
| Security Reviewer (Revisore di Sicurezza) | Modelli di minaccia, CVE (Common Vulnerabilities and Exposures), schemi di exploit. |
| Competitive Analyst (Analista della Concorrenza) | Dati di mercato, svantaggi onesti, alternative. |
| Docs Architect (Architetto della Documentazione) | Schemi strutturali, navigazione, gerarchia delle informazioni. |
| Critic Reviewer (Recensore Critico) | Standard di qualità, precedenti di rifiuto, conformità contrattuale. |

## Come Funziona

1. **Query Builder** (Costruttore di Query): espande il testo del compito con il vocabolario specifico (frasi di riferimento, termini preferiti, sinonimi).
2. **Ricerca Lessicale:** BM25 tramite SQLite FTS5 per la corrispondenza esatta dei termini.
3. **Ricerca Semantica:** confronto di embedding tramite Ollama (con fallback a ricerca lessicale).
4. **Unione e Eliminazione Duplicati:** combina i risultati candidati da entrambe le fonti.
5. **Filtro dei Metadati:** applica restrizioni sulle fonti, esclusioni per ruolo, penalità per dati obsoleti, e potenziamenti basati sull'affidabilità e sul tipo di documento.
6. **Riclassificatore Specifico per Ruolo:** sistema di punteggio ponderato trasparente con enfasi sulla diversità delle fonti.
7. **Assemblaggio del Pacchetto:** crea un pacchetto di ricerca controllato (`RetrievalBundle`) con una traccia di audit completa.

## Affidabilità e Sicurezza

Questa libreria opera **esclusivamente in locale** come motore di ricerca.

- **Dati accessibili:** database SQLite locale, frammenti di documenti, embedding.
- **Dati NON accessibili:** nessuna credenziale utente, nessuna informazione personale identificabile (PII), nessuna API esterna (eccetto l'opzionale Ollama in locale).
- **Nessuna connessione in uscita** tranne la generazione opzionale di embedding tramite Ollama in locale (`localhost:11434`).
- **Nessuna telemetria** viene raccolta o trasmessa.
- **Nessuna gestione di segreti:** non legge, memorizza o trasmette credenziali.

## Stato

| Fase | Descrizione | Test |
|-------|-------------|-------|
| 1. Struttura del Contratto | Tipi, validazione, sovrapposizioni, fixture. | 58 |
| 2. Motore di Ricerca | Pipeline completa, 5 ruoli distinti testati. | 86 |
| 3. Integrazione delle Richieste | Integrazione con le richieste di Role OS. | Role OS: 38 |
| 4. Evidenze | Prova della catena di custodia. | Role OS: 22 |
| 5. Adozione in Produzione | In esecuzione in un ambiente persistente. | Role OS: 11 |

## Licenza

MIT

---

Creato da <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>.
