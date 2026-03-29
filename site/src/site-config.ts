import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: 'Knowledge Core',
  description: 'Role-aware retrieval engine — governed knowledge substrate for Role OS',
  logoBadge: 'KC',
  brandName: 'knowledge-core',
  repoUrl: 'https://github.com/mcp-tool-shop-org/knowledge-core',
  npmUrl: 'https://www.npmjs.com/package/@roleos/knowledge-core',
  footerText: 'MIT Licensed — built by <a href="https://github.com/mcp-tool-shop-org" style="color:var(--color-muted);text-decoration:underline">mcp-tool-shop-org</a>',

  hero: {
    badge: 'Role OS subsystem',
    headline: 'Knowledge',
    headlineAccent: 'Core.',
    description: 'Role-aware retrieval where overlay law governs what gets retrieved, ranked, and cited. Not generic RAG — governed input with hard role boundaries.',
    primaryCta: { href: '#usage', label: 'Get started' },
    secondaryCta: { href: 'handbook/', label: 'Read the Handbook' },
    previews: [
      { label: 'Install', code: 'npm install @roleos/knowledge-core' },
      { label: 'Retrieve', code: "const bundle = await retrieve({ store, roleId, taskText, overlay })" },
      { label: 'Result', code: '// bundle.selected, bundle.rejected, bundle.provenance, bundle.warnings' },
    ],
  },

  sections: [
    {
      kind: 'features',
      id: 'features',
      title: 'Governed Retrieval',
      subtitle: 'Same corpus, different roles, materially different evidence.',
      features: [
        { title: 'Role Overlays', desc: 'Declarative per-role configs control vocabulary, source policy, reranking weights, and synthesis rules.' },
        { title: 'Evidence Bundles', desc: 'Structured output with selected chunks, rejected candidates, provenance posture, and retrieval warnings.' },
        { title: 'Fallback Governance', desc: 'Explicit handling for weak, stale, conflicted, and missing evidence — no silent garbage.' },
        { title: 'Source Diversity', desc: 'Metadata filter enforces forbidden sources, trust tiers, freshness penalties, and per-source caps.' },
        { title: 'BM25 + Semantic', desc: 'Dual-lane retrieval with SQLite FTS5 lexical search and optional Ollama embeddings.' },
        { title: '86 Tests', desc: 'Contract validation, pipeline correctness, role distinctiveness, and governance checks all proven.' },
      ],
    },
    {
      kind: 'code-cards',
      id: 'usage',
      title: 'Usage',
      cards: [
        { title: 'Install', code: 'npm install @roleos/knowledge-core' },
        { title: 'Ingest & Retrieve', code: `import { CorpusStore, ingestFixtureCorpus, retrieve } from '@roleos/knowledge-core';

const store = new CorpusStore(':memory:');
ingestFixtureCorpus(store, './corpus.json');

const bundle = await retrieve({
  store,
  roleId: 'security-reviewer',
  taskText: 'Review auth middleware',
  overlay: securityOverlay,
  lexicalOnly: true,
});

// bundle.selected — scored evidence
// bundle.rejected — why candidates failed
// bundle.provenance — trust posture` },
      ],
    },
  ],
};
