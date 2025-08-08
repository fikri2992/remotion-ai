import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { VirtualCamera } from '../../components/camera/VirtualCamera';
import { StringViz } from '../../components/data/StringViz';
import { SlidingWindowOverlay } from '../../components/data/SlidingWindowOverlay';
import { Pointer } from '../../components/data/Pointer';
import { HashMapViz } from '../../components/data/HashMapViz';
import { CodeBlock } from '../../components/code/CodeBlock';
import { Scoreboard } from '../../components/hud/Scoreboard';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { traceLongestSubstring, SlidingWindowStep } from '../../logic/slidingWindow/trace';

export const slidingWindowCompSchema = z.object({
  s: z.string().default('abcabcbb'),
  frameOffset: z.number().default(0),
});

export type SlidingWindowSceneProps = z.infer<typeof slidingWindowCompSchema>;

interface DerivedState {
  left: number;
  right: number;
  best: number;
}

const code = `function lengthOfLongestSubstring(s) {
  const set = new Set();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    while (set.has(c)) {
      set.delete(s[left]);
      left++;
    }
    set.add(c);
    best = Math.max(best, right - left + 1);
  }
  return best;
}`;

const activeLineFor = (step?: SlidingWindowStep): number | undefined => {
  if (!step) return undefined;
  switch (step.type) {
    case 'moveRight':
      return 5; // const c = s[right];
    case 'foundDuplicate':
      return 6; // while (set.has(c))
    case 'moveLeftUntil':
      return 7; // set.delete(s[left])
    case 'addToSet':
      return 10; // set.add(c)
    case 'updateBest':
      return 11; // best = Math.max(...)
    default:
      return undefined;
  }
};

export const SlidingWindowScene: React.FC<SlidingWindowSceneProps> = ({ s, frameOffset = 0 }) => {
  const absFrame = useCurrentFrame();
  const frame = Math.max(0, absFrame - frameOffset);

  const trace = useMemo(() => traceLongestSubstring(s), [s]);
  const stepIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < trace.steps.length; i++) {
      const st: SlidingWindowStep = trace.steps[i];
      if (st.t <= frame) idx = i; else break;
    }
    return Math.max(0, idx);
  }, [trace.steps, frame]);

  const currentStep = trace.steps[stepIndex];

  const derived: DerivedState = useMemo(() => {
    let left = 0;
    let right = -1;
    let best = 0;
    for (let i = 0; i <= stepIndex; i++) {
      const st = trace.steps[i];
      switch (st.type) {
        case 'moveRight':
          right = st.index;
          break;
        case 'foundDuplicate':
          // no state change here; visual emphasis handled elsewhere
          break;
        case 'moveLeftUntil':
          left = st.stopAtIndex;
          break;
        case 'addToSet':
          break;
        case 'updateBest':
          best = st.end - st.start + 1;
          break;
      }
    }
    return { left, right, best };
  }, [stepIndex, trace.steps]);

  const presentSet = useMemo(() => {
    const { left, right } = derived;
    const sub = s.slice(Math.max(0, left), Math.max(0, right) + 1);
    const uniq: string[] = [];
    for (const ch of sub) if (!uniq.includes(ch)) uniq.push(ch);
    return uniq;
  }, [derived, s]);

  const activeLine = activeLineFor(currentStep);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <VirtualCamera>
        {/* Title */}
        <div style={{
          position: 'absolute', left: 32, top: 24, fontFamily: typography.fontFamily,
          fontSize: typography.sizes.title, color: colors.textPrimary,
        }}>
          Longest Substring Without Repeating Characters
        </div>

        {/* String visualization & window */}
        <StringViz s={s} rangeHighlights={[{ start: Math.max(0, derived.left), end: Math.max(derived.left, derived.right) }]} />
        <SlidingWindowOverlay start={Math.max(0, derived.left)} end={Math.max(derived.left, derived.right)} emphasis={currentStep?.type === 'moveRight' || currentStep?.type === 'moveLeftUntil' ? 'update' : 'none'} />

        {/* Pointers */}
        <Pointer label="L" index={Math.max(0, derived.left)} color={colors.accent} orientation="top" />
        <Pointer label="R" index={Math.max(0, derived.right)} color={colors.primary} orientation="bottom" />

        {/* Set viz */}
        <HashMapViz present={presentSet} emphasisKey={currentStep?.type === 'foundDuplicate' ? currentStep.char : undefined} style={{ position: 'absolute', left: 32, top: 120 }} />

        {/* Scoreboard */}
        <Scoreboard current={Math.max(0, derived.right - derived.left + 1)} best={derived.best} />

        {/* Code */}
        <div style={{ position: 'absolute', left: 32, bottom: 32, right: 32 }}>
          <CodeBlock code={code} theme="light" activeLine={activeLine} />
        </div>
      </VirtualCamera>
    </div>
  );
};
