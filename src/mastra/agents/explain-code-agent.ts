import { z } from 'zod';
import { traceLongestSubstring, durationsForFps } from '../../../remotion/logic/slidingWindow/trace';
import { SelfCriticAgent } from './self-critic-agent';
import { MastraMcpDocsProvider, type DocsProvider } from './docs-provider';
import { LLMProvider, OpenAIProvider, NoopLLMProvider } from './llm-provider';
import {
  explainInputZ,
  explainOutputZ,
  narrationScriptZ,
  visualSpecZ,
} from '../workflows/remotion/schemas';

export type ExplainInput = z.infer<typeof explainInputZ>;
export type ExplainOutput = z.infer<typeof explainOutputZ>;

export class ExplainCodeAgent {
  private llmProvider: LLMProvider;
  private selfCritic: SelfCriticAgent;
  private docsProvider: DocsProvider;

  constructor(
    private options: {
      llmProvider?: LLMProvider;
      docsProvider?: DocsProvider;
      maxRetries?: number;
      fps?: number;
    } = {}
  ) {
    this.llmProvider = options.llmProvider || (
      process.env.OPENAI_API_KEY 
        ? new OpenAIProvider() 
        : new NoopLLMProvider()
    );
    this.docsProvider = options.docsProvider || new MastraMcpDocsProvider();
    this.selfCritic = new SelfCriticAgent({ docsProvider: this.docsProvider });
  }

  async explain(input: ExplainInput): Promise<ExplainOutput> {
    const validatedInput = explainInputZ.parse(input);
    const { problemText, codeSnippet, examples, targetCompositionId } = validatedInput;

    const classification = await this.llmProvider.classifyPattern(
      problemText || '',
      codeSnippet
    );

    const narrationData = await this.llmProvider.generateNarration(
      problemText || '',
      codeSnippet,
      classification.pattern
    );

    const visualSpec = await this.createVisualSpec(
      classification.pattern,
      examples || [],
      this.options.fps || 60
    );

    const renderProps = await this.createRenderProps(
      problemText || '',
      narrationData,
      examples || [],
      targetCompositionId
    );

    const result = await this.validateAndRepair({
      narration: narrationData,
      visualSpec: visualSpec,
      renderProps,
      fps: this.options.fps || 60,
    });

    return {
      narration: result.narration,
      visualSpec: result.visualSpec,
      recommendedComposition: targetCompositionId || 'LongestSubstringExplainer',
      renderProps: result.renderProps,
    };
  }

  private async createVisualSpec(
    pattern: string,
    examples: string[],
    fps: number
  ): Promise<z.infer<typeof visualSpecZ>> {
    if (pattern === 'Sliding Window' && examples.length > 0) {
      const scenes = examples.map((example, idx) => {
        const trace = traceLongestSubstring(example, { 
          durations: durationsForFps(fps), 
          fps 
        });
        return {
          id: `example-${idx}`,
          duration: trace.duration,
          data: { input: example, trace: trace.steps },
        };
      });

      return {
        compositionId: 'LongestSubstringExplainer',
        fps,
        scenes: [
          {
            id: 'intro',
            duration: Math.round(4 * fps),
            overlays: [{ type: 'TextReveal', text: 'Algorithm Explanation' }],
          },
          ...scenes,
        ],
      };
    }

    return {
      compositionId: 'LongestSubstringExplainer',
      fps,
      scenes: [
        {
          id: 'intro',
          duration: Math.round(4 * fps),
          overlays: [{ type: 'TextReveal', text: 'Algorithm Explanation' }],
        },
      ],
    };
  }

  private async createRenderProps(
    problemText: string,
    narration: { sections: Array<{ id: string; title: string; lines: string[] }> },
    examples: string[],
    targetCompositionId?: string
  ): Promise<Record<string, unknown>> {
    const compositionId = targetCompositionId || 'LongestSubstringExplainer';
    
    if (compositionId === 'LongestSubstringExplainer') {
      const title = problemText || 'Algorithm Explanation';
      const intro = narration.sections.find((s) => s.id === 'intuition')?.lines.join(' ') || 
                   'We will solve this step by step.';
      
      return {
        title,
        intro,
        examples: examples.length > 0 ? examples : ['abcabcbb'],
        narration,
      };
    }

    return { title: problemText, examples };
  }

  private async validateAndRepair(artifacts: {
    narration: { sections: Array<{ id: string; title: string; lines: string[] }> };
    visualSpec: { compositionId: string; fps: number; scenes: Array<{ id: string; duration: number; overlays?: Array<{ type: string; text?: string; data?: Record<string, unknown> }>; data?: Record<string, unknown> }> };
    renderProps: Record<string, unknown>;
    fps: number;
  }): Promise<{
    narration: z.infer<typeof narrationScriptZ>;
    visualSpec: z.infer<typeof visualSpecZ>;
    renderProps: Record<string, unknown>;
  }> {
    const maxRetries = this.options.maxRetries || 2;
    let currentArtifacts = artifacts;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const validatedNarration = narrationScriptZ.parse(currentArtifacts.narration);
        const validatedVisualSpec = visualSpecZ.parse(currentArtifacts.visualSpec);

        const docsContext = await this.docsProvider.fetchDocsContext(['agents', 'workflows']);
        const critique = await this.selfCritic.reviewAndFix({
          narration: validatedNarration,
          visualSpec: validatedVisualSpec,
          renderProps: currentArtifacts.renderProps,
          fps: currentArtifacts.fps,
          docsContext,
          iteration: i + 1,
        });

        if (critique.metCriteria || critique.shouldStop) {
          return {
            narration: validatedNarration,
            visualSpec: validatedVisualSpec,
            renderProps: currentArtifacts.renderProps,
          };
        }

        if (critique.fixedArtifacts) {
          currentArtifacts = critique.fixedArtifacts as typeof currentArtifacts;
        }
      } catch {
        if (i === maxRetries - 1) {
          return this.createFallbackArtifacts(artifacts);
        }
      }
    }

    return this.createFallbackArtifacts(artifacts);
  }

  private createFallbackArtifacts(artifacts: { fps?: number; renderProps?: Record<string, unknown> }): {
    narration: z.infer<typeof narrationScriptZ>;
    visualSpec: z.infer<typeof visualSpecZ>;
    renderProps: Record<string, unknown>;
  } {
    return {
      narration: {
        sections: [
          { id: 'intro', title: 'Problem', lines: ['We need to solve this problem.'] },
          { id: 'intuition', title: 'Approach', lines: ['Use an appropriate algorithm.'] },
          { id: 'walkthrough', title: 'Solution', lines: ['Step through the solution.'] },
          { id: 'complexity', title: 'Analysis', lines: ['Time and space complexity.'] },
        ],
      },
      visualSpec: {
        compositionId: 'LongestSubstringExplainer',
        fps: artifacts.fps || 60,
        scenes: [
          {
            id: 'intro',
            duration: Math.round(4 * (artifacts.fps || 60)),
            overlays: [{ type: 'TextReveal', text: 'Algorithm Explanation' }],
          },
        ],
      },
      renderProps: artifacts.renderProps || { title: 'Algorithm', examples: ['example'] },
    };
  }
}
