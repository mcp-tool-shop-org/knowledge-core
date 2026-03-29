/**
 * Corpus Store — SQLite + FTS5 backed document/chunk storage.
 *
 * Owns: storage, indexing, basic retrieval primitives.
 * Does NOT own: scoring, reranking, overlay logic.
 */

import Database from "better-sqlite3";
import type { TrustTier, FreshnessStatus, ContentType } from "../types.js";

// ── Schema Types ────────────────────────────────────────────────────

export type DocumentRecord = {
  document_id: string;
  source_id: string;
  title: string;
  document_type: string;
  domain: string;
  trust_tier: TrustTier;
  updated_at: string; // ISO 8601
};

export type ChunkRecord = {
  chunk_id: string;
  document_id: string;
  content: string;
  content_type: ContentType;
  tags: string; // JSON array
  applicable_roles: string; // JSON array
  excluded_roles: string; // JSON array
};

export type ChunkWithDocument = ChunkRecord & DocumentRecord;

// ── Store ───────────────────────────────────────────────────────────

export class CorpusStore {
  private db: Database.Database;

  constructor(dbPath: string = ":memory:") {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        document_id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        title TEXT NOT NULL,
        document_type TEXT NOT NULL,
        domain TEXT NOT NULL,
        trust_tier TEXT NOT NULL CHECK(trust_tier IN ('authoritative','preferred','general','untrusted')),
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chunks (
        chunk_id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(document_id),
        content TEXT NOT NULL,
        content_type TEXT NOT NULL CHECK(content_type IN ('paragraph','table','list','code','excerpt')),
        tags TEXT NOT NULL DEFAULT '[]',
        applicable_roles TEXT NOT NULL DEFAULT '[]',
        excluded_roles TEXT NOT NULL DEFAULT '[]'
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        chunk_id UNINDEXED,
        content,
        tags,
        tokenize='porter unicode61'
      );

      CREATE TABLE IF NOT EXISTS embeddings (
        chunk_id TEXT PRIMARY KEY REFERENCES chunks(chunk_id),
        vector BLOB NOT NULL,
        model TEXT NOT NULL,
        dimensions INTEGER NOT NULL
      );
    `);
  }

  // ── Document Operations ─────────────────────────────────────────

  insertDocument(doc: DocumentRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO documents (document_id, source_id, title, document_type, domain, trust_tier, updated_at)
      VALUES (@document_id, @source_id, @title, @document_type, @domain, @trust_tier, @updated_at)
    `).run(doc);
  }

  getDocument(documentId: string): DocumentRecord | undefined {
    return this.db.prepare("SELECT * FROM documents WHERE document_id = ?").get(documentId) as DocumentRecord | undefined;
  }

  // ── Chunk Operations ────────────────────────────────────────────

  insertChunk(chunk: ChunkRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO chunks (chunk_id, document_id, content, content_type, tags, applicable_roles, excluded_roles)
      VALUES (@chunk_id, @document_id, @content, @content_type, @tags, @applicable_roles, @excluded_roles)
    `).run(chunk);

    // FTS index
    this.db.prepare(`
      INSERT OR REPLACE INTO chunks_fts (chunk_id, content, tags)
      VALUES (@chunk_id, @content, @tags)
    `).run({ chunk_id: chunk.chunk_id, content: chunk.content, tags: chunk.tags });
  }

  getChunk(chunkId: string): ChunkRecord | undefined {
    return this.db.prepare("SELECT * FROM chunks WHERE chunk_id = ?").get(chunkId) as ChunkRecord | undefined;
  }

  getChunkWithDocument(chunkId: string): ChunkWithDocument | undefined {
    return this.db.prepare(`
      SELECT c.*, d.source_id, d.title, d.document_type, d.domain, d.trust_tier, d.updated_at
      FROM chunks c JOIN documents d ON c.document_id = d.document_id
      WHERE c.chunk_id = ?
    `).get(chunkId) as ChunkWithDocument | undefined;
  }

  // ── FTS Search ──────────────────────────────────────────────────

  /**
   * BM25-ranked full-text search over chunk content and tags.
   * Returns chunks joined with document metadata.
   */
  searchFTS(query: string, limit: number = 50): Array<ChunkWithDocument & { bm25_score: number }> {
    if (!query.trim()) return [];

    return this.db.prepare(`
      SELECT c.*, d.source_id, d.title, d.document_type, d.domain, d.trust_tier, d.updated_at,
             -rank AS bm25_score
      FROM chunks_fts fts
      JOIN chunks c ON fts.chunk_id = c.chunk_id
      JOIN documents d ON c.document_id = d.document_id
      WHERE chunks_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(query, limit) as Array<ChunkWithDocument & { bm25_score: number }>;
  }

  // ── Embedding Operations ────────────────────────────────────────

  insertEmbedding(chunkId: string, vector: Float32Array, model: string): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO embeddings (chunk_id, vector, model, dimensions)
      VALUES (?, ?, ?, ?)
    `).run(chunkId, Buffer.from(vector.buffer), model, vector.length);
  }

  getEmbedding(chunkId: string): { vector: Float32Array; model: string } | undefined {
    const row = this.db.prepare("SELECT vector, model, dimensions FROM embeddings WHERE chunk_id = ?")
      .get(chunkId) as { vector: Buffer; model: string; dimensions: number } | undefined;
    if (!row) return undefined;
    return {
      vector: new Float32Array(row.vector.buffer, row.vector.byteOffset, row.dimensions),
      model: row.model,
    };
  }

  getAllEmbeddings(): Array<{ chunk_id: string; vector: Float32Array; model: string }> {
    const rows = this.db.prepare("SELECT chunk_id, vector, model, dimensions FROM embeddings")
      .all() as Array<{ chunk_id: string; vector: Buffer; model: string; dimensions: number }>;
    return rows.map((r) => ({
      chunk_id: r.chunk_id,
      vector: new Float32Array(r.vector.buffer, r.vector.byteOffset, r.dimensions),
      model: r.model,
    }));
  }

  // ── Bulk Operations ─────────────────────────────────────────────

  getAllChunksWithDocuments(): ChunkWithDocument[] {
    return this.db.prepare(`
      SELECT c.*, d.source_id, d.title, d.document_type, d.domain, d.trust_tier, d.updated_at
      FROM chunks c JOIN documents d ON c.document_id = d.document_id
    `).all() as ChunkWithDocument[];
  }

  chunkCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM chunks").get() as { count: number }).count;
  }

  documentCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM documents").get() as { count: number }).count;
  }

  // ── Lifecycle ───────────────────────────────────────────────────

  close(): void {
    this.db.close();
  }
}
