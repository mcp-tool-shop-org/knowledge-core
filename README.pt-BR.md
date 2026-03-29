<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/knowledge-core/readme.png" width="400" alt="Knowledge Core" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/actions"><img src="https://github.com/mcp-tool-shop-org/knowledge-core/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://mcp-tool-shop-org.github.io/knowledge-core/"><img src="https://img.shields.io/badge/docs-landing%20page-teal" alt="Landing Page" /></a>
</p>

Mecanismo de recuperação com consciência de função — substrato de conhecimento governado para [Role OS](https://github.com/mcp-tool-shop-org/role-os).

## O que é isso

Um mecanismo de recuperação onde **as regras da função governam o que é recuperado, classificado e citado**. Não é um RAG genérico — entrada governada com limites de função bem definidos.

A mesma tarefa, funções diferentes, evidências materialmente diferentes. Validado em 5 funções piloto com 86 testes.

## Arquitetura

- **Um corpus canônico** com metadados, incorporações e versionamento.
- **Camadas específicas para cada função** que controlam a política de origem, o vocabulário, a reclassificação e a síntese.
- **Pacotes de recuperação estruturados** com rastreabilidade completa, histórico de rejeições e postura de confiança.
- **Governança de fallback** para cenários degradados (dados desatualizados, conflituosos ou com evidências fracas).

### Pipeline

```
task + overlay + corpus → query builder → BM25 + semantic → merge → metadata filter → rerank → bundle
```

### Contratos Principais

| Contrato | Descrição |
|----------|-------------|
| `RetrievalBundle` | Saída governada de cada operação de recuperação. |
| `RoleOverlay` | Configuração de recuperação declarativa específica para cada função. |
| `PacketKnowledge` | Como os pacotes do Role OS transportam pacotes de conhecimento. |
| `EvidenceProvenance` | Como os itens de evidência rastreiam a origem da recuperação. |
| `FallbackDecision` | Governança explícita para cenários de recuperação degradados. |

## Instalação

```bash
npm install @roleos/knowledge-core
```

**Requisitos:** Node.js >= 18. Opcional: [Ollama](https://ollama.com/) com `nomic-embed-text` para pesquisa semântica.

## Início Rápido

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

## Funções Piloto (Onda 1)

| Função | Perfil de Recuperação |
|------|------------------|
| Especialista em Produtos | Valor para o usuário, compensações, precedentes estratégicos. |
| Revisor de Segurança | Modelos de ameaças, CVEs, padrões de exploração. |
| Analista Competitivo | Dados de mercado, desvantagens honestas, substitutos. |
| Arquiteto de Documentação | Padrões de estrutura, navegação, hierarquia de informações. |
| Revisor Crítico | Padrões de qualidade, precedentes de rejeição, conformidade contratual. |

## Como Funciona

1. **Construtor de Consulta** — expande o texto da tarefa com vocabulário de sobreposição (frases de destaque, termos preferenciais, sinônimos).
2. **Pesquisa Lexical** — BM25 via SQLite FTS5 para correspondência exata de termos.
3. **Pesquisa Semântica** — similaridade de incorporação via Ollama (fallback gracioso para pesquisa lexical apenas).
4. **Mesclar + Desduplicar** — união do conjunto de candidatos de ambas as fontes.
5. **Filtro de Metadados** — aplica políticas de fontes proibidas, exclusões de função, penalidades para dados desatualizados, boosts de confiança/tipo de documento.
6. **Reclassificador de Função** — pontuação ponderada transparente com pressão para diversidade de fontes.
7. **Montagem de Pacote** — cria um `RetrievalBundle` governado com um registro de auditoria completo.

## Confiança e Segurança

Esta biblioteca opera **apenas localmente** como um mecanismo de recuperação.

- **Dados acessados:** banco de dados SQLite local, fragmentos de documentos, incorporações.
- **Dados NÃO acessados:** nenhuma credencial de usuário, nenhuma informação pessoal identificável (PII), nenhuma API externa (exceto o Ollama opcional no localhost).
- **Nenhuma saída de rede** exceto a geração opcional de incorporações via Ollama local (`localhost:11434`).
- **Nenhuma telemetria** é coletada ou enviada.
- **Nenhuma manipulação de segredos** — não lê, armazena ou transmite credenciais.

## Status

| Fase | Descrição | Testes |
|-------|-------------|-------|
| 1. Núcleo do Contrato | Tipos, validação, camadas, fixtures. | 58 |
| 2. Mecanismo de Recuperação | Pipeline completo, 5 funções comprovadamente distintas. | 86 |
| 3. Consumo de Prompt | Integração de prompt do Role OS. | Role OS: 38 |
| 4. Evidências de Artefatos | Prova de cadeia de custódia. | Role OS: 22 |
| 5. Adoção em Produção | Em execução em um mecanismo persistente. | Role OS: 11 |

## Licença

MIT

---

Criado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>.
