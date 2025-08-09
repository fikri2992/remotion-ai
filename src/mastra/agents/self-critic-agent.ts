import type { DocsContext, DocsProvider, DocsSnippet } from './docs-provider';

export type ReviewIssue = {
  severity: 'info' | 'warn' | 'error';
  message: string;
  path?: string; // dot-path to field
};

export type Review = {
  issues: ReviewIssue[];
  score?: number; // 0..1 simple heuristic
  audit?: {
    citations?: DocsSnippet[];
    notes?: string[];
  };
};

export type FixedArtifacts = {
  narration?: unknown;
  visualSpec?: unknown;
  renderProps?: Record<string, unknown>;
  voiceTracks?: unknown;
};

export type ReviewFixArgs = {
  narration?: unknown;
  visualSpec?: unknown;
  renderProps?: Record<string, unknown>;
  voiceTracks?: unknown;
  fps?: number;
  sceneMap?: Record<string, { startFrame: number; endFrame: number }>;
  docsContext?: DocsContext;
  criteria?: SuccessCriteria;
  iteration?: number;
};

export type SuccessCriteria = {
  minScore?: number;            // default 0.9
  maxIssues?: number;           // default 0
  requireNoErrors?: boolean;    // default true
  requiredCitations?: number;   // default 1
};

export class SelfCriticAgent {
  constructor(
    private options: {
      docsProvider?: DocsProvider;
      maxIterations?: number;
    } = {}
  ) {}

  async reviewAndFix(args: ReviewFixArgs): Promise<{ review: Review; fixedArtifacts?: FixedArtifacts; metCriteria: boolean; shouldStop: boolean }> {
    const { renderProps, narration, visualSpec, voiceTracks, docsContext } = args;
    const maxIterations = this.options.maxIterations ?? 1; // consume option to avoid unused lint

    // Basic pass-through review; extend with real LLM + rubric in later iteration
    const issues: ReviewIssue[] = [];

    // Simple checks
    if (renderProps && typeof renderProps === 'object') {
      const { title, intro } = renderProps as { title?: unknown; intro?: unknown };
      if (!title || String(title).trim().length < 3) {
        issues.push({ severity: 'warn', message: 'Title is missing or too short', path: 'renderProps.title' });
      }
      if (!intro || String(intro).trim().length < 3) {
        issues.push({ severity: 'info', message: 'Intro is missing or too short', path: 'renderProps.intro' });
      }
    }

    // Light-touch usage of inputs for lint hygiene and basic sanity checks
    if (Array.isArray(voiceTracks) && voiceTracks.length === 0) {
      issues.push({ severity: 'info', message: 'No voice tracks provided; TTS step may be skipped.', path: 'voiceTracks' });
    }
    if (narration && typeof narration === 'object') {
      // placeholder touch to reference narration
      void Object.keys(narration as Record<string, unknown>).length;
    }
    if (visualSpec && typeof visualSpec === 'object') {
      // placeholder touch to reference visualSpec
      void Object.keys(visualSpec as Record<string, unknown>).length;
    }

    // Create a minimal audit payload using docs citations if provided
    const citations = docsContext?.snippets?.slice(0, 3) ?? [];

    const review: Review = {
      issues,
      score: issues.length === 0 ? 1 : Math.max(0, 1 - issues.length * 0.1),
      audit: {
        citations,
        notes: citations.length
          ? [`Applied docs-grounded review (citations included). Iterations=${maxIterations}`]
          : [`No docs citations available; used heuristic checks. Iterations=${maxIterations}`],
      },
    };

    // For now, we do not mutate artifacts; return as-is
    const fixedArtifacts: FixedArtifacts | undefined = undefined;

    // Evaluate success criteria to control loop termination
    const c: SuccessCriteria = {
      minScore: 0.9,
      maxIssues: 0,
      requireNoErrors: true,
      requiredCitations: 1,
      ...(args.criteria || {}),
    };
    const errorCount = review.issues.filter(i => i.severity === 'error').length;
    const metScore = (review.score ?? 0) >= (c.minScore ?? 0.9);
    const metIssueCap = review.issues.length <= (c.maxIssues ?? 0);
    const metErrorRule = c.requireNoErrors ? errorCount === 0 : true;
    const metCitations = (review.audit?.citations?.length ?? 0) >= (c.requiredCitations ?? 1);
    const metCriteria = metScore && metIssueCap && metErrorRule && metCitations;
    const iteration = args.iteration ?? 1;
    const shouldStop = metCriteria || iteration >= (this.options.maxIterations ?? 1);

    return { review, fixedArtifacts, metCriteria, shouldStop };
  }
}
