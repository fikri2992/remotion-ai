/* Docs Provider for grounding prompts via Mastra docs (MCP-backed in future) */
import fs from 'node:fs';
import path from 'node:path';

export type DocsSnippet = {
  path: string;
  excerpt: string;
};

export type DocsContext = {
  topics: string[];
  snippets: DocsSnippet[];
  fetchedAt: string; // ISO string
};

export interface DocsProvider {
  fetchDocsContext(topics: string[], limit?: number): Promise<DocsContext>;
}

export class NoopDocsProvider implements DocsProvider {
  async fetchDocsContext(topics: string[]): Promise<DocsContext> {
    return { topics, snippets: [], fetchedAt: new Date().toISOString() };
  }
}

// Placeholder for Mastra MCP-backed docs provider. In a future step, wire this
// to an MCP client that can call the Mastra Docs server (e.g., mcp0_mastraDocs).
export class MastraMcpDocsProvider implements DocsProvider {
  constructor(
    private options?: {
      maxSnippets?: number;
      fetcher?: (topics: string[], limit: number) => Promise<DocsContext>;
      cachePath?: string; // optional local cache JSON file with DocsContext-like payload
      topicsMap?: Record<string, string>; // topic -> docs path
    }
  ) {}

  async fetchDocsContext(topics: string[], limit = 4): Promise<DocsContext> {
    // TODO: Implement real MCP call to fetch docs excerpts. For now, return empty
    // context so downstream code remains functional without MCP wiring.
    const max = this.options?.maxSnippets ?? limit;
    if (this.options?.fetcher) {
      try {
        const ctx = await this.options.fetcher(topics, max);
        return ctx;
      } catch {
        // fall back to empty on fetch error
      }
    }

    // Try reading from a local cache file if provided
    const cacheFile = this.options?.cachePath ?? path.resolve('src/mastra/docs-cache/core-topics.json');
    try {
      if (fs.existsSync(cacheFile)) {
        const raw = fs.readFileSync(cacheFile, 'utf8');
        const parsed = JSON.parse(raw) as DocsContext | { topics: string[]; snippets: DocsSnippet[]; fetchedAt: string };
        // Filter snippets by requested topics if a topics map is provided
        const tMap = this.options?.topicsMap ?? {
          agents: 'agents/index.mdx',
          workflows: 'workflows/index.mdx',
          tools: 'tools-mcp/index.mdx',
          voice: 'voice/index.mdx',
        };
        const allowedPaths = new Set<string>(topics.map(t => tMap[t] || t));
        const filtered = parsed.snippets.filter((s: DocsSnippet) => allowedPaths.size === 0 || allowedPaths.has(s.path));
        return {
          topics,
          snippets: filtered.slice(0, Math.max(0, max)),
          fetchedAt: new Date().toISOString(),
        };
      }
    } catch {
      // Failed to read cache file, continue with empty context
    }
    return {
      topics,
      snippets: [],
      fetchedAt: new Date().toISOString(),
    };
  }
}
