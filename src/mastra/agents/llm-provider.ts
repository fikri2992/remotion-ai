export interface LLMProvider {
  classifyPattern(problemText: string, codeSnippet?: string): Promise<{
    pattern: string;
    confidence: number;
    rationale: string;
  }>;
  
  generateNarration(
    problemText: string,
    codeSnippet?: string,
    pattern?: string
  ): Promise<{
    sections: Array<{
      id: string;
      title: string;
      lines: string[];
    }>;
  }>;
}

export class OpenAIProvider implements LLMProvider {
  private client: unknown = null;
  private model: string;

  constructor(options: {
    apiKey?: string;
    model?: string;
  } = {}) {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.model = options.model || process.env.LLM_MODEL || 'gpt-4o-mini';
  }

  async classifyPattern(problemText: string, codeSnippet?: string): Promise<{
    pattern: string;
    confidence: number;
    rationale: string;
  }> {
    if (!this.client) {
      const { OpenAI } = await import('openai');
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    const prompt = `Analyze this coding problem and classify the algorithmic pattern.

Problem: ${problemText}
${codeSnippet ? `Code: ${codeSnippet}` : ''}

Classify into one of: Sliding Window, Two Pointers, Dynamic Programming, Graph BFS/DFS, Backtracking, Greedy, Other

Respond with JSON: {"pattern": "...", "confidence": 0.0-1.0, "rationale": "..."}`;

    const response = await (this.client as { chat: { completions: { create: (params: unknown) => Promise<{ choices: Array<{ message: { content: string | null } }> }> } } }).chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI response content is null');
    }
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanedContent);
  }

  async generateNarration(
    problemText: string,
    codeSnippet?: string,
    pattern?: string
  ): Promise<{
    sections: Array<{
      id: string;
      title: string;
      lines: string[];
    }>;
  }> {
    if (!this.client) {
      const { OpenAI } = await import('openai');
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    const prompt = `Create concise narration for this coding problem explanation.

Problem: ${problemText}
${codeSnippet ? `Code: ${codeSnippet}` : ''}
${pattern ? `Pattern: ${pattern}` : ''}

Create 4 sections: intro, intuition, walkthrough, complexity
Each section should have 2-4 short, clear lines.

Respond with JSON: {"sections": [{"id": "intro", "title": "Problem", "lines": ["..."]}]}`;

    const response = await (this.client as { chat: { completions: { create: (params: unknown) => Promise<{ choices: Array<{ message: { content: string | null } }> }> } } }).chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI response content is null');
    }
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanedContent);
  }
}

export class NoopLLMProvider implements LLMProvider {
  async classifyPattern(): Promise<{ pattern: string; confidence: number; rationale: string }> {
    return { pattern: 'Sliding Window', confidence: 0.5, rationale: 'Default pattern' };
  }

  async generateNarration(): Promise<{ sections: Array<{ id: string; title: string; lines: string[] }> }> {
    return {
      sections: [
        { id: 'intro', title: 'Problem', lines: ['We need to solve this coding problem.'] },
        { id: 'intuition', title: 'Intuition', lines: ['Use an appropriate algorithm.'] },
        { id: 'walkthrough', title: 'Walkthrough', lines: ['Step through the solution.'] },
        { id: 'complexity', title: 'Complexity', lines: ['Analyze time and space complexity.'] },
      ],
    };
  }
}
