import React, { useMemo } from 'react';
import { Sequence, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { typography } from '../../tokens/typography';
import { colors } from '../../tokens/colors';
import { TextReveal } from '../../components/text/TextReveal';
import { KineticTerm } from '../../components/text/KineticTerm';
import { SlidingWindowScene } from './Scene';
import { traceLongestSubstring, durationsForFps } from '../../logic/slidingWindow/trace';
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

export const computeExplainerDuration = (examples: string[], fps: number = 30): number => {
  // Hard cuts, no overlap; durations scale with fps
  const intro = Math.max(1, Math.round(4 * fps)); // 4s
  const outro = Math.max(1, Math.round(4 * fps)); // 4s
  const examplesDur = examples
    .map((s) => traceLongestSubstring(s, { durations: durationsForFps(fps), fps }).duration)
    .reduce((a, b) => a + b, 0);
  return intro + examplesDur + outro;
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
  const { width, fps } = useVideoConfig();
  const sec = (s: number) => Math.max(1, Math.round(s * fps));
  // Precompute segments
  const introFrames = sec(4);
  const segments = useMemo(
    () => examples.map((s) => ({ s, dur: traceLongestSubstring(s, { durations: durationsForFps(fps), fps }).duration })),
    [examples, fps]
  );

  let cursor = 0;
  const sequences: React.ReactNode[] = [];

  // Intro
  sequences.push(
    <Sequence key="intro" from={cursor} durationInFrames={introFrames}>
      <FadeInOut startFrame={cursor} durationInFrames={introFrames} fadeIn={0} fadeOut={0}>
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
    const start = cursor;
    const label = `Example ${idx + 1}: s = "${s}"  →  answer = ${lengthOfLongestSubstring(
      s
    )}`;

    // Label overlay with slide+fade
    const labelFrames = Math.min(sec(0.6), dur);
    sequences.push(
      <Sequence key={`label-${idx}`} from={start} durationInFrames={labelFrames}>
        <SlideFade startFrame={start} durationInFrames={labelFrames} axis="y" distance={12} fadeIn={sec(0.2)} fadeOut={sec(0.2)}>
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

    // Example scene with hard cut (no fade)
    sequences.push(
      <Sequence key={`example-${idx}`} from={start} durationInFrames={dur}>
        <SlidingWindowScene s={s} frameOffset={start} />
      </Sequence>
    );

    cursor = start + dur;
  });

  // Outro
  const outroFrames = 120;
  const outroStart = cursor;
  sequences.push(
    <Sequence key="outro" from={outroStart} durationInFrames={outroFrames}>
      <FadeInOut startFrame={outroStart} durationInFrames={outroFrames} fadeIn={0} fadeOut={0}>
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
