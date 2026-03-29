<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/knowledge-core/readme.png" width="400" alt="Knowledge Core" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/actions"><img src="https://github.com/mcp-tool-shop-org/knowledge-core/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/knowledge-core/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://mcp-tool-shop-org.github.io/knowledge-core/"><img src="https://img.shields.io/badge/docs-landing%20page-teal" alt="Landing Page" /></a>
</p>

ロールを意識した検索エンジン - [Role OS](https://github.com/mcp-tool-shop-org/role-os)のための、ガバナンスされた知識基盤。

## 概要

**ロールのルールが、検索、ランキング、引用の対象を決定する**検索エンジンです。一般的なRAG（Retrieval-Augmented Generation）ではなく、厳格なロール境界を持つ、ガバナンスされた入力を行います。

同じタスクでも、異なるロールによって、大きく異なる証拠が必要になります。5つのパイロットロールで86件のテストを実施し、その有効性が確認されています。

## アーキテクチャ

- **単一の標準的なデータセット**：メタデータ、埋め込みベクトル、バージョン管理を含む
- **ロールごとのオーバーレイ**：ソースポリシー、語彙、再ランキング、合成を制御
- **構造化された検索結果**：完全なトレーサビリティ、拒否履歴、信頼性スコアを含む
- **フォールバックガバナンス**：データが古くなったり、矛盾したり、信頼性が低い場合に備える

### パイプライン

```
task + overlay + corpus → query builder → BM25 + semantic → merge → metadata filter → rerank → bundle
```

### 主要な機能

| 機能 | 説明 |
|----------|-------------|
| `RetrievalBundle` | すべての検索操作の結果に対するガバナンス |
| `RoleOverlay` | ロールごとに設定された検索構成 |
| `PacketKnowledge` | Role OSが、知識をどのように検索結果として提供するか |
| `EvidenceProvenance` | 証拠が、どのように検索元に追跡されるか |
| `FallbackDecision` | 検索がうまくいかない場合に備えた、明示的なガバナンス |

## インストール

```bash
npm install @roleos/knowledge-core
```

**前提条件:** Node.js >= 18。オプション：セマンティック検索用の[Ollama](https://ollama.com/)と`nomic-embed-text`。

## クイックスタート

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

## パイロットロール（第1波）

| ロール | 検索プロファイル |
|------|------------------|
| プロダクトストラテジスト | ユーザー価値、トレードオフ、戦略的な先例 |
| セキュリティレビュアー | 脅威モデル、CVE、脆弱性パターン |
| 競合分析担当 | 市場データ、正直な欠点、代替品 |
| ドキュメントアーキテクト | 構造パターン、ナビゲーション、情報階層 |
| 批評レビュアー | 品質基準、拒否の理由、契約遵守 |

## 仕組み

1. **クエリビルダー**：タスクテキストに、オーバーレイ語彙（強調フレーズ、推奨用語、同義語）を追加
2. **語彙検索**：SQLite FTS5を使用して、正確な用語のマッチング
3. **セマンティック検索**：Ollamaを使用して、埋め込みベクトルの類似度を検索（語彙検索のみへのフォールバックも可能）
4. **マージ + 重複排除**：両方の検索結果を統合し、重複を排除
5. **メタデータフィルタ**：禁止されたソース、ロールの除外、古いデータのペナルティ、信頼性/ドキュメントタイプのブーストを適用
6. **ロールごとの再ランキング**：ソースの多様性を考慮した、透明性の高い重み付けによるランキング
7. **検索結果のまとめ**：完全な監査ログを含む、ガバナンスされた`RetrievalBundle`を作成

## 信頼性とセキュリティ

このライブラリは、**ローカルでのみ**検索エンジンとして動作します。

- **アクセスするデータ:** ローカルのSQLiteデータベース、ドキュメントの断片、埋め込みベクトル
- **アクセスしないデータ:** ユーザー認証情報、個人情報、外部API（オプションのOllamaのローカルホストを除く）
- **外部ネットワークへのアクセス:** オプションでローカルのOllamaを使用して埋め込みベクトルを生成する場合（`localhost:11434`）のみ
- **テレメトリーは収集または送信されません**
- **機密情報の取り扱い:** 認証情報を読み込んだり、保存したり、送信したりしません

## ステータス

| 段階 | 説明 | テスト |
|-------|-------------|-------|
| 1. コア機能 | 型、検証、オーバーレイ、テストデータ | 58 |
| 2. 検索エンジン | 完全なパイプライン、5つのロールで区別が確認済み | 86 |
| 3. プロンプトの処理 | Role OSのプロンプト統合 | Role OS: 38 |
| 4. 証拠の検証 | トレーサビリティの証明 | Role OS: 22 |
| 5. 本格的な導入 | 継続的な実行エンジンでの利用 | Role OS: 11 |

## ライセンス

MIT

---

このツールは、<a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>によって開発されました。
