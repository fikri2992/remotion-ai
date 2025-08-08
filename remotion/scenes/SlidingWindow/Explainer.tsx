import React, { useMemo } from 'react';
import { Sequence, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { typography } from '../../tokens/typography';
import { colors } from '../../tokens/colors';
import { TextReveal } from '../../components/text/TextReveal';
import { KineticTerm } from '../../components/text/KineticTerm';
import { SlidingWindowScene } from './Scene';
import { traceLongestSubstring } from '../../logic/slidingWindow/trace';
import { FadeInOut } from '../../components/transitions/FadeInOut';
import { SlideFade } from '../../components/transitions/SlideFade';

export const slidingWindowExplainerSchema = z.object({
  title: z
    .string()
    .default('Longest Substring Without Repeating Characters'),
  intro: z
    .string()
    .default(
      'We use the Sliding Window technique. Move right to expand, move left to remove duplicates.'
    ),
  examples: z
    .array(z.string())
    .default(['abcabcbb', 'bbbbb', 'pwwkew']),
});

export type SlidingWindowExplainerProps = z.infer<
  typeof slidingWindowExplainerSchema
>;

export const computeExplainerDuration = (examples: string[]): number => {
  // Very short transitions
  const intro = 120; // 4s at 30fps
  const overlap = 3; // frames of overlap
  const outro = 120; // 4s
  const examplesDur = examples
    .map((s) => traceLongestSubstring(s).duration)
    .reduce((a, b) => a + b, 0);
  const transitions = (examples.length > 0 ? examples.length + 1 : 1); // intro->first, between examples, last->outro
  return intro + examplesDur + outro - overlap * transitions;
};

const lengthOfLongestSubstring = (s: string) => {
  const set = new Set<string>();
  let left = 0;
  let best = 0;
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
};

export const SlidingWindowExplainer: React.FC<SlidingWindowExplainerProps> = ({
  title,
  intro,
  examples,
}) => {
  const { width } = useVideoConfig();
  // Precompute segments
  const introFrames = 120;
  const overlap = 3;
  const segments = useMemo(
    () => examples.map((s) => ({ s, dur: traceLongestSubstring(s).duration })),
    [examples]
  );

  let cursor = 0;
  const sequences: React.ReactNode[] = [];

  // Intro
  sequences.push(
    <Sequence key="intro" from={cursor} durationInFrames={introFrames}>
      <FadeInOut startFrame={cursor} durationInFrames={introFrames} fadeIn={overlap} fadeOut={overlap}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
          }}
        >
          <div
            style={{
              fontFamily: typography.fontFamily,
              fontSize: typography.sizes.title,
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            {title}
          </div>
          <div style={{ maxWidth: Math.min(1200, width - 120) }}>
            <TextReveal text={intro} mode="byWord" />
          </div>
          <div style={{ marginTop: 16 }}>
            <KineticTerm text="Sliding Window" active />
          </div>
        </div>
      </FadeInOut>
    </Sequence>
  );
  cursor += introFrames;

  // Examples
  segments.forEach(({ s, dur }, idx) => {
    const start = Math.max(0, cursor - overlap);
    const label = `Example ${idx + 1}: s = "${s}"  →  answer = ${lengthOfLongestSubstring(
      s
    )}`;

    // Label overlay with slide+fade
    sequences.push(
      <Sequence key={`label-${idx}`} from={start} durationInFrames={Math.min(18, dur)}>
        <SlideFade startFrame={start} durationInFrames={Math.min(18, dur)} axis="y" distance={12} fadeIn={4} fadeOut={4}>
          <div
            style={{
              position: 'absolute',
              left: 32,
              top: 24,
              fontFamily: typography.fontFamily,
              fontSize: typography.sizes.subtitle,
              color: colors.textPrimary,
            }}
          >
            {label}
          </div>
        </SlideFade>
      </Sequence>
    );

    // Example scene with crossfade
    sequences.push(
      <Sequence key={`example-${idx}`} from={start} durationInFrames={dur}>
        <FadeInOut startFrame={start} durationInFrames={dur} fadeIn={overlap} fadeOut={0}>
          <SlidingWindowScene s={s} frameOffset={start} />
        </FadeInOut>
      </Sequence>
    );

    cursor = start + dur;
  });

  // Outro
  const outroFrames = 120;
  const outroStart = Math.max(0, cursor - overlap);
  sequences.push(
    <Sequence key="outro" from={outroStart} durationInFrames={outroFrames}>
      <FadeInOut startFrame={outroStart} durationInFrames={outroFrames} fadeIn={overlap} fadeOut={overlap}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            gap: 14,
          }}
        >
          <div
            style={{
              fontFamily: typography.fontFamily,
              fontSize: typography.sizes.subtitle,
              color: colors.textPrimary,
            }}
          >
            Complexity
          </div>
          <TextReveal
            text={
              'Time: O(n) — each character visited at most twice\nSpace: O(min(n, charset))'
            }
            mode="byLine"
          />
        </div>
      </FadeInOut>
    </Sequence>
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: colors.bg }} />
      {sequences}
    </div>
  );
};
