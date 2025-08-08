# Visualization and Motion Layer Design (Remotion Explainers)

This document specifies how we build the Visualization Layer (data-structure visuals, code, overlays) and the Motion Layer (camera, timing, text kinetics) for reusable coding explainers in Remotion.

Focus: modular, data-driven components driven by algorithm “step” events, with predictable camera and text animation APIs.


## Objectives
- Build reusable, composable visuals for CS concepts (array/string/window/pointers/hash map; graph later).
- Provide a camera grammar for cinematic focus and transitions that can auto-frame content.
- Unify motion with a small set of primitives (spring/interpolate/easing) so animations are consistent across scenes.
- Drive everything from deterministic “step traces” produced by pure functions.


## Conventions & Dependencies
- Remotion hooks: `useCurrentFrame`, `useVideoConfig`, `interpolate`, `spring`, `Easing`.
- TypeScript for strong types across steps and component props.
- Colors & typography tokens for consistent theming.
- Optional syntax highlighter for code (Shiki recommended, but we keep the `CodeBlock` pluggable).


## Directory Structure (Proposed)
- `remotion/components/camera/VirtualCamera.tsx`
- `remotion/components/camera/autoFraming.ts`
- `remotion/components/text/TextReveal.tsx`
- `remotion/components/text/KineticTerm.tsx`
- `remotion/components/text/Captions.tsx`
- `remotion/components/data/ArrayViz.tsx`
- `remotion/components/data/StringViz.tsx`
- `remotion/components/data/HashMapViz.tsx`
- `remotion/components/data/Pointer.tsx`
- `remotion/components/data/SlidingWindowOverlay.tsx`
- `remotion/components/code/CodeBlock.tsx`
- `remotion/components/hud/Scoreboard.tsx`
- `remotion/motion/useSpringValue.ts`
- `remotion/motion/useInterpolateFrame.ts`
- `remotion/motion/timing.ts` (e.g., `secondsToFrames`, beat helpers)
- `remotion/tokens/colors.ts`, `remotion/tokens/typography.ts`
- `remotion/logic/slidingWindow/trace.ts` (step tracer)
- `remotion/scenes/SlidingWindow/Scene.tsx` (assembles components & camera)
- `remotion/shots/` (shot-level composition using `VirtualCamera` and `Sequence`)


## Data Model: Step Events
All visuals subscribe to an ordered sequence of typed steps with timestamps. This is our single source of truth for state evolution.

```ts
// remotion/logic/slidingWindow/trace.ts
export type SlidingWindowStep =
  | { t: number; type: 'moveRight'; index: number; char: string }
  | { t: number; type: 'addToSet'; char: string }
  | { t: number; type: 'foundDuplicate'; char: string; atIndex: number }
  | { t: number; type: 'moveLeftUntil'; stopAtIndex: number }
  | { t: number; type: 'updateBest'; start: number; end: number };

export interface TraceResult {
  steps: SlidingWindowStep[];   // time `t` in frames or seconds (choose and document)
  duration: number;             // total frames or seconds
}
```

Guideline:
- Pick ONE time unit (frames preferred for Remotion). If using seconds, convert via `secondsToFrames()` when needed.
- The Scene maps `useCurrentFrame()` to the current step or segment, then drives component props accordingly.


## Rendering Lifecycle
- The Scene computes derived state from `frame` and `steps`.
- Each visual component is pure and controlled (state comes in via props). Animation is created via:
  - Frame-based interpolation (`interpolate`) for linear timelines.
  - Springs (`spring`) for natural motion and emphasis.
- The camera is a wrapper that applies CSS transforms to the scene graph.


## Visualization Components

### ArrayViz / StringViz
- Purpose: horizontal row of tiles representing chars/values; supports highlight regions, active indices, and selection windows.
- Props (shared core):
```ts
export interface TileHighlight {
  index: number;
  color?: string;        // semantic color token
  weight?: 'soft' | 'strong';
}

export interface RangeHighlight {
  start: number;
  end: number;           // inclusive or exclusive; document consistency
  color?: string;
}

export interface ArrayVizProps<T = string | number> {
  values: T[];
  activeIndices?: number[];
  highlights?: TileHighlight[];
  rangeHighlights?: RangeHighlight[]; // e.g., sliding window
  label?: string;                      // caption under array
  y?: number;                          // layout offset within camera space
}
```
- Implementation notes:
  - Render tiles with GPU-friendly transforms; avoid heavy shadows.
  - Provide a small `tileWidth`, `gap`, `baselineY` config via Scene or theme.
  - For StringViz, `values` is `string[]` derived via `Array.from(s)`.

### SlidingWindowOverlay
- Purpose: visualize the current window `[start, end]` with subtle breathing and drop-shadow.
- Props:
```ts
export interface SlidingWindowOverlayProps {
  start: number;
  end: number;               // inclusive
  emphasis?: 'none' | 'enter' | 'update' | 'exit';
}
```
- Motion: size changes use spring to add life; on updates, a gentle overshoot.

### Pointer
- Purpose: labeled pointer to an index (e.g., `left`, `right`).
```ts
export interface PointerProps {
  label: string;       // e.g., 'L', 'R', 'i', 'j'
  index: number;       // aligned with ArrayViz tiles
  color?: string;
  orientation?: 'top' | 'bottom';
}
```
- Motion: animate x-position with spring for smooth glides when index changes.

### HashMapViz (set)
- Purpose: represent membership checks visually without deep hashing complexity.
```ts
export interface HashMapVizProps {
  present: string[];               // current elements in set/map
  emphasisKey?: string;            // key being queried or inserted
  mode?: 'check' | 'insert' | 'delete';
}
```
- Visual: boxes or chips; on duplicate, flash the chip in warning color.

### CodeBlock
- Purpose: show minimal code with active line highlight and transient diffs.
```ts
export interface CodeBlockProps {
  code: string;
  language?: string;               // e.g., 'ts', 'js', 'py'
  activeLine?: number;             // 1-based
  diff?: { line: number; kind: 'add' | 'remove' | 'update' }[];
  theme?: 'light' | 'dark';
}
```
- Implementation: integrate Shiki (server-side prehighlight) or a light client highlighter. For Remotion renders, prehighlighting is most reliable.

### Scoreboard
- Purpose: show `current` and `best` lengths.
```ts
export interface ScoreboardProps {
  current: number;
  best: number;
}
```
- Motion: on `best` change, scale-bounce the value and briefly glow.


## Motion Layer
A small set of primitives and helpers unify feel across the system.

### Timing Helpers
- `remotion/motion/timing.ts`
```ts
import { useVideoConfig } from 'remotion';

export const secondsToFrames = (s: number, fps?: number) => {
  if (!fps) return Math.round(s * 30); // fallback
  return Math.round(s * fps);
};
```

### Interpolation & Springs
- `remotion/motion/useInterpolateFrame.ts` – convenience wrapper:
```ts
import { useCurrentFrame, interpolate } from 'remotion';

export const useInterpolateFrame = (domain: [number, number], range: [number, number], opts?: { extrapolate?: 'clamp' | 'extend' }) => {
  const frame = useCurrentFrame();
  return interpolate(frame, domain, range, {
    extrapolateLeft: opts?.extrapolate ?? 'clamp',
    extrapolateRight: opts?.extrapolate ?? 'clamp',
  });
};
```
- `remotion/motion/useSpringValue.ts` – target-based spring for prop changes:
```ts
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const useSpringValue = (stiffness: number, damping: number, on?: boolean) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: on ? frame : 0, fps, config: { stiffness, damping } });
};
```
(Components use this to accent state changes like pointer moves or window resizes.)

### Camera System
- `remotion/components/camera/VirtualCamera.tsx`: wraps children and applies `transform: translate/scale/rotate` based on the current shot.
- Props:
```ts
export interface CameraTransform { x: number; y: number; scale: number; rotate?: number }
export interface ShotKeyframe { frame: number; to: Partial<CameraTransform>; easing?: (n: number) => number }
export interface VirtualCameraProps {
  width: number; height: number;            // virtual canvas size
  base?: CameraTransform;                   // default transform
  keyframes?: ShotKeyframe[];               // sorted by frame
  children: React.ReactNode;
}
```
- Implementation:
  - Interpolate between keyframes by current `frame`.
  - Use slight overshoot (`spring`) on big moves (whip-pan, crash-zoom) and then settle.
- `autoFraming.ts` utility:
```ts
export interface Bounds { x: number; y: number; w: number; h: number }
export interface SafeArea { w: number; h: number; margin: number }
export const computeCameraToFrame = (subject: Bounds, safe: SafeArea): CameraTransform => {
  // compute scale and translation so that `subject` fits within `safe` with margin
  // return { x, y, scale }
};
```
- Shot Grammar:
  - Establishing → Focus Subject → Compare → Detail → Recap → Outro
  - Transitions: cut, dissolve (opacity crossfade), whip (fast translate + motion blur), crash zoom (scale + slight rotate, quickly settle)

### Text Animation System
- `TextReveal.tsx`:
  - Modes: `byChar`, `byWord`, `byLine`.
  - Options: `delayPer`, `stagger`, `springConfig`, `emphasis`.
- `KineticTerm.tsx`:
  - Emphasize keywords with scale pop, color shift, or brief blur-in.
- `Captions.tsx`:
  - Karaoke highlight for narration; feed in word timings or step timestamps.


## Scene Orchestration
- `remotion/scenes/SlidingWindow/Scene.tsx` subscribes to the `TraceResult` and composes:
  - `ArrayViz`/`StringViz` for the input string
  - `SlidingWindowOverlay` bound to `[left,right]`
  - `Pointer` for `L` and `R`
  - `HashMapViz` for set membership
  - `CodeBlock` with `activeLine`
  - `Scoreboard` for `current`/`best`
  - `VirtualCamera` keyframes/auto-frame around the active focus (e.g., duplicate tile)
- Use `Sequence` blocks for shot timing:
```tsx
<Sequence from={0} durationInFrames={240}>{/* Intro */}</Sequence>
<Sequence from={240} durationInFrames={480}>{/* Visualization */}</Sequence>
<Sequence from={720} durationInFrames={120}>{/* Complexity + Outro */}</Sequence>
```


## Example: Mapping Steps → Visual State (Sliding Window)
- Steps (from tracer): `moveRight`, `addToSet`, `foundDuplicate`, `moveLeftUntil`, `updateBest`.
- Visual mapping:
  - `moveRight` → `Pointer R` springs to next index; window grows (`end++`).
  - `addToSet` → `HashMapViz` chip appears with soft scale-in.
  - `foundDuplicate` → duplicate tile flashes warning; camera focuses on that tile.
  - `moveLeftUntil` → `Pointer L` glides forward; window shrinks and chips fade out accordingly.
  - `updateBest` → `Scoreboard.best` bounce.
- Code mapping: highlight the line corresponding to each phase (`activeLine`).


## Theming & Tokens
- `remotion/tokens/colors.ts`: semantic colors `primary`, `accent`, `warning`, `success`, `muted`.
- `remotion/tokens/typography.ts`: font families, weights, sizes. Title, subtitle, code font.
- All components accept optional `color`/`theme` props; defaults pull from tokens.


## Performance Guidelines
- Prefer transforms (`translate`, `scale`, `opacity`) over layout-affecting properties.
- Keep components pure and controlled; memoize where inputs are large.
- Precompute `TraceResult` before rendering; avoid heavy computations per frame.
- Limit number of simultaneously animating elements; stagger and group.


## Testing & Debugging
- Add a “stepper” dev control to scrub through steps and pause on key events.
- Write unit tests for tracer functions; snapshot key visual states.
- Validate camera auto-framing by overlaying debug bounds.


## Implementation Milestones (Layer-Specific)
- M1: Tokens, timing helpers, `VirtualCamera` + `autoFraming`, `TextReveal`.
- M2: `ArrayViz`, `StringViz`, `Pointer`, `SlidingWindowOverlay`, `Scoreboard`, `CodeBlock`.
- M3: Integrate tracer to drive a complete `SlidingWindow/Scene.tsx` with camera shots.
- M4: Polish transitions, add `KineticTerm` and `Captions` if VO exists.


## Rendering & Automation (Context)
- Use your Mastra MCP server tools (`createRenderJob`, `getRenderStatus`, `cancelRenderJob`) via a small CLI wrapper to batch renders.
- Keep visual layer deterministic (no random seeds) for consistent outputs in CI.


## Appendix: Type Index (Snapshot)
```ts
// Camera
export interface CameraTransform { x: number; y: number; scale: number; rotate?: number }
export interface ShotKeyframe { frame: number; to: Partial<CameraTransform>; easing?: (n:number)=>number }

// Visuals
export interface TileHighlight { index: number; color?: string; weight?: 'soft' | 'strong' }
export interface RangeHighlight { start: number; end: number; color?: string }
export interface ArrayVizProps<T = string | number> {
  values: T[]; activeIndices?: number[]; highlights?: TileHighlight[]; rangeHighlights?: RangeHighlight[]; label?: string; y?: number;
}
export interface SlidingWindowOverlayProps { start: number; end: number; emphasis?: 'none' | 'enter' | 'update' | 'exit' }
export interface PointerProps { label: string; index: number; color?: string; orientation?: 'top' | 'bottom' }
export interface HashMapVizProps { present: string[]; emphasisKey?: string; mode?: 'check' | 'insert' | 'delete' }
export interface CodeBlockProps { code: string; language?: string; activeLine?: number; diff?: { line:number; kind:'add'|'remove'|'update' }[]; theme?: 'light'|'dark' }
export interface ScoreboardProps { current: number; best: number }

// Tracer (sliding window)
export type SlidingWindowStep =
  | { t: number; type: 'moveRight'; index: number; char: string }
  | { t: number; type: 'addToSet'; char: string }
  | { t: number; type: 'foundDuplicate'; char: string; atIndex: number }
  | { t: number; type: 'moveLeftUntil'; stopAtIndex: number }
  | { t: number; type: 'updateBest'; start: number; end: number };
export interface TraceResult { steps: SlidingWindowStep[]; duration: number }
```

—
This spec gives you a concrete file map, component APIs, and motion primitives to implement a consistent, scalable Visualization and Motion layer for explainers. Start with M1–M2 to get a functioning foundation, then assemble the Sliding Window scene driven by the tracer.
