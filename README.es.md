<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/knowledge-core/readme.png" width="400" alt="Knowledge Core" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/actions"><img src="https://github.com/mcp-tool-shop-org/knowledge-core/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://mcp-tool-shop-org.github.io/knowledge-core/"><img src="https://img.shields.io/badge/docs-landing%20page-teal" alt="Landing Page" /></a>
</p>

Motor de recuperación con conocimiento de roles: una base de conocimiento gestionada para [Role OS](https://github.com/mcp-tool-shop-org/role-os).

## ¿Qué es esto?

Un motor de recuperación donde **las reglas específicas del rol determinan qué se recupera, se clasifica y se cita**. No es un RAG genérico; es una entrada gestionada con límites de rol estrictos.

La misma tarea, diferentes roles, evidencia materialmente diferente. Comprobado en 5 roles piloto con 86 pruebas.

## Arquitectura

- **Un corpus canónico** con metadatos, incrustaciones y versiones.
- **Capas específicas de cada rol** que controlan la política de origen, el vocabulario, la reordenación y la síntesis.
- **Paquetes de recuperación estructurados** con trazabilidad completa, registros de rechazo y postura de confianza.
- **Mecanismo de control de respaldo** para escenarios degradados (datos obsoletos, contradictorios o evidencia débil).

### Flujo de trabajo

```
task + overlay + corpus → query builder → BM25 + semantic → merge → metadata filter → rerank → bundle
```

### Contratos clave

| Contrato | Descripción |
|----------|-------------|
| `RetrievalBundle` | Salida gestionada de cada operación de recuperación. |
| `RoleOverlay` | Configuración de recuperación declarativa específica de cada rol. |
| `PacketKnowledge` | Cómo los paquetes de Role OS transportan conjuntos de datos. |
| `EvidenceProvenance` | Cómo los elementos de evidencia rastrean su origen hasta las fuentes de recuperación. |
| `FallbackDecision` | Control explícito para escenarios de recuperación degradados. |

## Instalación

```bash
npm install @roleos/knowledge-core
```

**Requisitos:** Node.js >= 18. Opcional: [Ollama](https://ollama.com/) con `nomic-embed-text` para la búsqueda semántica.

## Inicio rápido

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

## Roles piloto (Onda 1)

| Rol | Perfil de recuperación |
|------|------------------|
| Estratega de producto | Valor para el usuario, compensaciones, precedentes estratégicos. |
| Revisor de seguridad | Modelos de amenazas, CVE, patrones de explotación. |
| Analista de la competencia | Datos del mercado, desventajas honestas, alternativas. |
| Arquitecto de documentación | Patrones de estructura, navegación, jerarquía de información. |
| Revisor crítico | Estándares de calidad, precedentes de rechazo, cumplimiento de contratos. |

## Cómo funciona

1. **Constructor de consultas:** amplía el texto de la tarea con el vocabulario de la capa (frases de mejora, términos preferidos, sinónimos).
2. **Búsqueda léxica:** BM25 a través de SQLite FTS5 para la coincidencia exacta de términos.
3. **Búsqueda semántica:** similitud de incrustaciones a través de Ollama (con una alternativa de búsqueda léxica).
4. **Combinación y eliminación de duplicados:** unión del conjunto de candidatos de ambas fuentes.
5. **Filtro de metadatos:** aplica políticas de origen prohibidas, exclusiones de rol, penalizaciones por datos obsoletos y mejoras de tipo de documento/confianza.
6. **Reordenador específico del rol:** puntuación ponderada transparente con presión para la diversidad de fuentes.
7. **Ensamblaje de paquetes:** crea un `RetrievalBundle` gestionado con un registro de auditoría completo.

## Confianza y seguridad

Esta biblioteca opera **únicamente de forma local** como un motor de recuperación.

- **Datos accedidos:** base de datos SQLite local, fragmentos de documentos, incrustaciones.
- **Datos NO accedidos:** no hay credenciales de usuario, no hay información de identificación personal (PII), no hay API externas (excepto el servidor Ollama opcional en localhost).
- **No hay salida de datos a la red**, excepto la generación opcional de incrustaciones a través de Ollama local (`localhost:11434`).
- **No se recopilan ni se envían datos de telemetría**.
- **No se gestionan secretos:** no lee, almacena ni transmite credenciales.

## Estado

| Fase | Descripción | Pruebas |
|-------|-------------|-------|
| 1. Núcleo del contrato | Tipos, validación, capas, accesorios. | 58 |
| 2. Motor de recuperación | Flujo de trabajo completo, 5 roles con perfiles distintos comprobados. | 86 |
| 3. Consumo de indicaciones | Integración de Role OS con indicaciones. | Role OS: 38 |
| 4. Evidencia de artefactos | Prueba de cadena de custodia. | Role OS: 22 |
| 5. Adopción en producción | En funcionamiento continuo. | Role OS: 11 |

## Licencia

MIT

---

Creado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>.
