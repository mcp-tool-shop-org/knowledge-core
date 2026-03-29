<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/knowledge-core/readme.png" width="400" alt="Knowledge Core" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/actions"><img src="https://github.com/mcp-tool-shop-org/knowledge-core/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://mcp-tool-shop-org.github.io/knowledge-core/"><img src="https://img.shields.io/badge/docs-landing%20page-teal" alt="Landing Page" /></a>
</p>

角色感知检索引擎——为 [Role OS](https://github.com/mcp-tool-shop-org/role-os) 提供受控知识基础。

## 简介

这是一个检索引擎，其中 **角色规则控制检索、排序和引用的内容**。它不是通用的 RAG 系统，而是具有严格角色界限的受控输入。

相同的任务，不同的角色，但提供的证据却截然不同。已在 5 个试点角色中通过 86 项测试得到验证。

## 架构

- **一个规范的知识库**，包含元数据、嵌入向量和版本信息。
- **每个角色的覆盖层**，用于控制源策略、词汇、重排序和合成。
- **结构化的检索包**，包含完整的溯源信息、拒绝记录和信任度评估。
- **降级场景下的备用机制**，用于处理陈旧、冲突或不可靠的证据。

### 流水线

```
task + overlay + corpus → query builder → BM25 + semantic → merge → metadata filter → rerank → bundle
```

### 关键接口

| 接口 | 描述 |
|----------|-------------|
| `RetrievalBundle` | 每个检索操作的受控输出。 |
| `RoleOverlay` | 每个角色的检索配置声明。 |
| `PacketKnowledge` | Role OS 如何传递知识包。 |
| `EvidenceProvenance` | 证据如何追溯到检索来源。 |
| `FallbackDecision` | 降级检索场景的明确控制机制。 |

## 安装

```bash
npm install @roleos/knowledge-core
```

**要求：** Node.js >= 18。 可选：[Ollama](https://ollama.com/)，用于语义搜索，需要安装 `nomic-embed-text`。

## 快速开始

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

## 试点角色（第一阶段）

| 角色 | 检索配置文件 |
|------|------------------|
| 产品策略师 | 用户价值、权衡、战略先例。 |
| 安全审查员 | 威胁模型、CVE、漏洞利用模式。 |
| 竞争分析师 | 市场数据、诚实的缺点、替代品。 |
| 文档架构师 | 结构模式、导航、信息层级结构。 |
| 评论员 | 质量标准、拒绝先例、合同合规性。 |

## 工作原理

1. **查询构建器**：通过覆盖层词汇扩展任务文本（增强短语、首选术语、同义词）。
2. **词法搜索**：使用 SQLite FTS5 进行精确术语匹配。
3. **语义搜索**：使用 Ollama 进行嵌入向量相似度计算（如果 Ollama 不可用，则回退到仅进行词法搜索）。
4. **合并 + 消除重复**：从两个通道合并候选结果。
5. **元数据过滤器**：强制执行禁止的来源、角色排除、陈旧性惩罚、信任度/文档类型加权。
6. **角色重排序器**：使用透明的加权评分，并考虑来源的多样性。
7. **包组装**：生成受控的 `RetrievalBundle`，包含完整的审计跟踪。

## 信任与安全

这个库仅作为检索引擎在**本地运行**。

- **访问的数据：**本地 SQLite 数据库、文档片段、嵌入向量。
- **未访问的数据：**不涉及用户凭据、个人身份信息 (PII)、外部 API（除了可选的本地 Ollama）。
- **无网络出站流量**，除非是可选的通过本地 Ollama 生成嵌入向量（`localhost:11434`）。
- **不收集或发送任何遥测数据**。
- **不处理任何密钥**：不读取、存储或传输凭据。

## 状态

| 阶段 | 描述 | 测试 |
|-------|-------------|-------|
| 1. 核心接口 | 类型、验证、覆盖层、测试用例。 | 58 |
| 2. 检索引擎 | 完整的流水线，已验证 5 个角色的差异性。 | 86 |
| 3. 提示处理 | Role OS 提示集成。 | Role OS: 38 |
| 4. 证据验证 | 完整溯源证明。 | Role OS: 22 |
| 5. 生产部署 | 在持久运行的引擎中运行。 | Role OS: 11 |

## 许可证

MIT

---

由 <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a> 制作。
