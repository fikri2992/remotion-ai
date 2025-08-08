# Mastra Explainer Agent — Plan

## Goals
- Build an agent that takes a coding problem or code snippet and produces:
  - Text narration (clear, concise, sectioned)
  - JSON visual + motion spec compatible with our templating system
- Integrate outputs directly into Remotion render pipeline via dynamic `compositionId` + `props`.
- Target 60fps, flicker-free output; align timings with frame-based animations.
- Use an LLM (OpenAI or compatible) to boost understanding, narration quality, and fallback visual planning.
- Add a self-critique step that reviews and repairs outputs using an LLM with rubric-based checks, grounded by Mastra docs.
- Fetch relevant docs from Mastra MCP to guide prompting, validation, and repairs.

## Inputs & Outputs
- Inputs
  - problemText: natural language problem description
  - codeSnippet: optional code implementing/illustrating the solution
  - language: optional (ts/js/python/etc.)
  - examples: optional examples/inputs for visualization
- Outputs
  - narration: structured text script (sections + utterances)
  - visualSpec: JSON for visuals/motion, mapped to our components
  - recommendedComposition: defaults to `LongestSubstringExplainer` for sliding window; extensible
  - renderProps: final props object for Remotion composition
  - voiceTracks: optional array of generated audio assets aligned to sections or scenes

## Integration Points
- Remotion compositions: `remotion/Root.tsx` (e.g., `LongestSubstringExplainer`)
- Trace logic (example): `remotion/logic/slidingWindow/trace.ts` (`SlidingWindowStep`, `traceLongestSubstring()`)
- Render Queue: `server/render-queue.ts` (high-quality settings enforced)
- MCP/Tools: `mcp-server.js`, `mcp-server-simple.js`, `src/mastra/tools/remotion-server.ts` (`createRenderJob` accepts `compositionId` and `props`)
- Remotion audio integration: add voice track via `Audio` in compositions, using generated files and scene-aligned offsets
- TTS provider: OpenAI speech synthesis API via SDK (pluggable provider interface)
- Mastra MCP Docs: fetch guidance and API references via Mastra MCP (e.g., `mcp0_mastraDocs`, `mcp0_mastraExamples`) to ground prompts and validations.

## High-Level Architecture
1) Ingest & Normalize
   - Parse inputs, infer task type, detect algorithmic pattern.
2) Understand & Plan
   - Classify into known explainer templates (e.g., Sliding Window, Two Pointers, DP, Graph BFS/DFS).
3) Script Generation
   - Produce narration outline (Intro, Intuition, Walkthrough, Complexity, Outro) with concise sentences.
4) Visual Plan
   - Choose composition; compute frame timings; generate step list (trace) + overlays/calls to reusable components.
5) Packaging
   - Assemble `renderProps` based on chosen composition schema.
6) Optional Render
   - Create render job via `createRenderJob({ compositionId, props })`.

## Data Schemas

### NarrationScript (LLM-friendly and deterministic)
```json
{
  "sections": [
    {
      "id": "intro",
      "title": "Problem",
      "lines": ["We are finding the longest substring without repeating characters."]
    },
    {
      "id": "intuition",
      "title": "Intuition",
      "lines": ["Use a sliding window: expand right, shrink left when a duplicate appears."]
    },
    {
      "id": "walkthrough",
      "title": "Walkthrough",
      "lines": ["We move a right pointer across the string and track last seen positions."]
    },
    {
      "id": "complexity",
      "title": "Complexity",
      "lines": ["Time O(n), Space O(k) where k is the charset."]
    }
  ]
}
```

### VisualSpec (generic)
- A minimal, composition-agnostic shape that we can adapt per composition.
```json
{
  "compositionId": "LongestSubstringExplainer",
  "fps": 60,
  "scenes": [
    { "id": "intro", "duration": 120, "overlays": [
      { "type": "TextReveal", "text": "Longest Substring Without Repeating Characters" }
    ]},
    { "id": "run-1", "duration": 600, "data": { "input": "abcabcbb" } }
  ]
}
```

### Algorithm-specific Steps (example: Sliding Window)
- We will reuse `SlidingWindowStep` from `remotion/logic/slidingWindow/trace.ts` where `t` is in frames.
- Example (partial):
```json
{
  "trace": {
    "steps": [
      { "t": 0, "type": "moveRight", "index": 0, "char": "a" },
      { "t": 12, "type": "addToSet", "char": "a" },
      { "t": 18, "type": "moveRight", "index": 1, "char": "b" }
    ],
    "duration": 720
  }
}
```

### Remotion Props for `LongestSubstringExplainer`
- Props draft (extensible; aligns with current usage):
```ts
{
  title: string;
  intro: string;
  examples: string[]; // will be traced to steps internally, or provided
  narration?: NarrationScript; // optional text overlay timeline
  traceOverrides?: { steps: SlidingWindowStep[]; duration: number }; // optional if we precompute
}
```

## LLM Integration (OpenAI and others)

- __Providers__
  - Default: OpenAI via SDK or Mastra model abstraction.
  - Pluggable: allow swapping providers without changing agent API.

- __Configuration__
  - Env vars: `OPENAI_API_KEY` (required for OpenAI). Optional: `LLM_MODEL` to override default model.
  - Sensible defaults: small/fast model for classification; larger model for narration when needed.

- __Responsibilities of LLM__
  - Pattern classification: detect Sliding Window, Two Pointers, DP, Graph, etc.
  - Narration generation: concise sections with 2–4 lines each.
  - Visual fallback: for unknown patterns, generate generic timeline keyframes (still frame-driven) that we map to components.
  - Copy polish: titles, intros/outros, and callouts.

- __Hybrid Orchestration__
  - Known patterns → deterministic tracers (e.g., `traceLongestSubstring()` with `durationsForFps()`), LLM only for narration.
  - Unknown patterns → LLM proposes a generic visual plan (scenes, overlays, timings); we clamp to frame grid and validate via Zod.

- __Schema Validation & Self-Repair__
  - Validate `narration` and `visualSpec` against Zod.
  - If invalid: return schema + errors to the LLM and request a corrected JSON (max 2 retries).
  - If still invalid: fallback to a minimal safe spec (intro + code block walkthrough) and deterministic timings.

- __Prompt Templates__
  - System: "You are an expert instructor. Produce concise, sectioned narration and a JSON visual plan that is frame-driven and schema-valid."
  - Classification prompt: summarize the problem/code and label the pattern; cite confidence and rationale.
  - Narration prompt: produce sections `intro`, `intuition`, `walkthrough`, `complexity` with short sentences; avoid fluff.
  - Visual prompt (fallback): propose scenes and overlays that map to our components (TextReveal, CodeBlock, Pointer, ArrayViz, Scoreboard), include integer durations (frames).

- __Cost/Latency & Caching__
  - Target: <1.5s for classification, <4s for narration on fast models when possible.
  - Cache: hash of `problemText + codeSnippet + examples + language` → reuse narration/visuals when inputs repeat.

- __Safety/Privacy__
  - Redact obvious secrets (keys, tokens) before sending to LLM.
  - Allow a no-network mode: skip LLM and rely on deterministic tracers and stock narration templates.

- __Observability__
  - Log token counts and timings (if enabled) for cost tracking.
  - Keep prompts and outputs for debugging with PII-safe filters.

- __Docs-Grounded Prompting__
  - Prior to generation, fetch relevant snippets from Mastra docs via MCP to shape instructions and constraints.
  - Embed short quotes/excerpts (limited tokens) into prompts for classification, narration style, and workflow best practices.
  - Maintain a compact, cached corpus keyed by feature (agents, workflows, tools, voice, rag, etc.).

## Self-Critique Agent and Doc-Grounded Review

- __Goals__
  - Automatically review narration, visualSpec, renderProps, and voiceTracks.
  - Catch factual errors, schema violations, timing/scene mismatches, and style issues.
  - Propose targeted fixes and apply a repair loop with constraints.

- __Inputs__
  - Artifacts: `narration`, `visualSpec`, `renderProps`, optional `voiceTracks`.
  - Constraints: fps, scene durations, schema definitions.
  - Docs excerpts: fetched via Mastra MCP docs to ground decisions and style.

- __Outputs__
  - `review`: scorecard with issues, severities, and suggested edits.
  - `fixedArtifacts`: optional corrected `narration`/`visualSpec`/`renderProps`.
  - `audit`: quotes from docs that motivated changes.

- __Rubric/Checklist__
  - Content correctness (algorithm steps, complexity, definitions).
  - Schema validity (Zod pass) and fps-aware timing constraints.
  - Visual plan consistency with chosen composition and components.
  - Clarity and brevity: short sentences, zero fluff.
  - Audio checks: no overrun per scene, loudness sanity, no excessive silence.

- __Repair Loop__
  - Limit to N=2 iterations. On failure: fallback to deterministic minimal spec and/or tighten narration.
  - Always re-run Zod validations and duration checks after changes.

- __MCP Docs Usage__
  - Query Mastra docs for relevant guides and references based on detected pattern and features used (agents, workflows, tools, voice).
  - Include brief citations in the `audit` output for traceability.

## Text-to-Speech (TTS) Agent and Workflow

- __Goals__
  - Convert `NarrationScript` into natural, engaging voiceover audio.
  - Maintain tight alignment to frame-based scenes (no drift, predictable duration handling).
  - Support styles/voices and caching to control cost/latency.

- __Inputs__
  - `narration: NarrationScript`
  - Options: `voice`, `style`, `pace`, `format` (e.g., mp3/wav), `sampleRate`, `targetLoudness`, `sectionTimingHints` (frames)

- __Outputs__
  - `voiceTracks: { sectionId: string; file: string; durationMs: number; offsetFrames?: number }[]`
  - Aggregate audio map consumable by Remotion compositions via `Audio` with offsets per scene/section

- __Prompt Engineering__
  - Use brief system guidance: “Expert instructor voice, energetic, clear articulation, no filler, correct terminology.”
  - Inject stage directions per section: emphasis, brief pauses at key transitions, pronounce code tokens clearly.
  - Ensure maximum line length and total target duration constraints per section (derived from scene duration in frames/fps).

- __Synthesis Pipeline__
  1) Segment narration by section → join lines with punctuation and short pause markers.
  2) Generate TTS per section with requested `voice/style`.
  3) Post-process: normalize loudness (target LUFS), trim leading/trailing silence, add boundary silence as needed.
  4) Measure duration, compute `offsetFrames` to align with scene start; adjust small gaps with fixed trailing silence.
  5) Cache audio by hash of text+voice+style+format to avoid re-generation.

- __Alignment Strategy__
  - Scenes have known frame windows; we aim narration duration <= scene duration.
  - If narration overruns: either (a) tighten pace via prompt/update, or (b) extend scene duration if allowed.
  - Avoid time-stretch DSP initially; prefer textual tightening via prompt with max character/duration hints.

- __Configuration__
  - Env: `OPENAI_API_KEY`, optional `TTS_VOICE`, `TTS_FORMAT`, `TTS_SAMPLE_RATE`, `TTS_TARGET_LUFS`.
  - Toggle: `OFFLINE_TTS=false` to enable network synthesis; when true, use stub audio or skip.

- __Mastra Workflow Orchestration__
  - Steps: classify → generate narration → TTS per section (parallel with concurrency cap) → validate durations → assemble voiceTracks → render.
  - Retries: if section invalid (too long/short), ask LLM to tighten/expand lines with explicit constraints (max retries 2).
  - Observability: capture synthesis timings, token usage (if any), cache hits, and section mismatch diagnostics.

## Agent API
- Class: `ExplainCodeAgent`
- Method: `explain({ problemText?, codeSnippet?, language?, examples?, targetCompositionId? })`
- Returns: `{ narration, visualSpec, recommendedComposition, renderProps }`
- Optional: `render({ compositionId, props })` → uses `createRenderJob` via MCP/tool.

- Class: `NarrationTTSAgent`
  - Method: `synthesize({ narration, voice?, style?, pace?, format?, sampleRate?, targetLoudness?, fps?, sceneMap? })`
  - Returns: `{ voiceTracks }`
  - Notes: pluggable provider; OpenAI speech synthesis by default; caches by content+params.

- Class: `SelfCriticAgent`
  - Method: `reviewAndFix({ narration, visualSpec, renderProps, voiceTracks?, fps, sceneMap, docsContext? })`
  - Returns: `{ review, fixedArtifacts }`
  - Notes: fetches docs via Mastra MCP; uses rubric; runs repair loop with Zod + timing re-validation.

## Pipeline Details
0) Docs Fetch (MCP)
   - Fetch small, targeted excerpts from Mastra docs (agents, workflows, tools/mcp, voice) for grounding.
1) Detection & Routing
   - Heuristics + prompt to classify algorithmic pattern (sliding window, two pointers, DP...).
2) Variable Extraction
   - From problem or code: identify inputs (string/array), main pointers/counters.
3) Narration Generation
   - System prompt enforces concise, 2–4 short lines per section.
4) Visual Trace Generation
   - For known patterns: call deterministic tracer (e.g., `traceLongestSubstring()`), fps-aware durations via `durationsForFps()`.
   - For unknown patterns: fallback to generic timeline with `CodeBlock`, pointer overlays, keyframes from LLM (still frame-driven).
5) Assembly
   - Build `renderProps` per chosen composition schema, include `narration` and either `examples` or `traceOverrides`.
6) Validation
   - Zod schemas to validate narration and visual/motion prior to render.
7) TTS (optional)
   - Generate `voiceTracks` via `NarrationTTSAgent`; map sections to scene offsets; include in composition props or add `Audio` tracks in composition assembly.
8) Self-Critique & Repair
   - Run `SelfCriticAgent` with artifacts + docs excerpts; apply safe fixes; re-validate.
9) Finalize & Render
   - Package final `renderProps` (+ voiceTracks) and optionally create render job via MCP tool.

## Prompting Guidelines
- Style: instructional, energetic, no fluff, short sentences.
- Sections: `intro`, `intuition`, `walkthrough`, `complexity`, `outro` (optional).
- Visual: prefer integer-pixel snapping; keep persistent backgrounds to avoid white frames; no CSS transitions.

## Testing & QA
- Unit: schema validation (zod) for narration and visual specs.
- Integration: generate trace for canonical examples (e.g., "abcabcbb") and verify durations align with 60fps.
- E2E: run via MCP tool `createRenderJob` and verify `videoUrl` and frame coverage; compare golden frames for flicker.
 - Audio: loudness normalization checks, absence of clipping, no long silences, narration duration vs scene duration sanity.

## Roadmap
- M1: Planning + skeleton `ExplainCodeAgent`; basic sliding-window path; map to `LongestSubstringExplainer` props; wire OpenAI client (config only, behind interface).
- M2: Add LLM-driven classification + narration; robust templates; Zod schemas + self-repair loop.
- M3: Add 1–2 more patterns (Two Pointers, BFS) and corresponding tracers/visuals.
- M4: Add TTS agent (OpenAI speech synthesis), caching, loudness normalization, section alignment; expose in workflow.
- M5: Add SelfCriticAgent with docs-grounded review + repair loop; integrate Mastra MCP doc fetching across steps.
- M6: Add evaluation harness; golden-frame diffs; UX polish; audio QA automation.
- M7: Generalize across languages; add safety/guardrails.

## Risks & Mitigations
- Misalignment between narration and timeline → lock timings to tracer outputs and maintain section-to-scene mapping.
- FPS drift → always use frame-driven durations (`durationsForFps()`), avoid CSS animations.
- Composition mismatch → validate `compositionId` + props; provide fallbacks.

## Next Steps
1) Scaffold `src/mastra/agents/explain-code-agent.ts` (Mastra agent wrapper + schemas) with provider interface for LLM.
2) Add OpenAI client wiring (read `OPENAI_API_KEY`, `LLM_MODEL`), no calls yet.
3) Implement Sliding Window path: parse inputs → `traceLongestSubstring()` → build narration (LLM or template) + props → (optional) create render job.
4) Scaffold `src/mastra/agents/narration-tts-agent.ts` with provider interface and OpenAI speech synthesis; add audio caching + normalization utilities.
5) Scaffold `src/mastra/agents/self-critic-agent.ts` with rubric prompts, Zod checks, doc fetch via Mastra MCP, and repair loop.
6) Add MCP command to invoke agents and return `{ narration, visualSpec, voiceTracks, props, review, fixedArtifacts, jobId? }`.
7) Document env setup and usage, caching toggle, offline mode, audio QA checks, and doc-grounded review settings.
