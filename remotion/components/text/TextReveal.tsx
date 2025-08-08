import React from 'react';
import { useCurrentFrame } from 'remotion';
import { typography } from '../../tokens/typography';
import { colors } from '../../tokens/colors';

export type RevealMode = 'byChar' | 'byWord' | 'byLine';

export interface TextRevealProps {
  text: string;
  mode?: RevealMode;
  fromFrame?: number;
  delayPer?: number; // frames between reveals
  style?: React.CSSProperties;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  mode = 'byWord',
  fromFrame = 0,
  delayPer = 3,
  style,
}) => {
  const frame = useCurrentFrame();
  const start = Math.max(frame - fromFrame, 0);

  const splitter = mode === 'byChar' ? '' : mode === 'byWord' ? ' ' : '\n';
  const parts = mode === 'byLine' ? text.split('\n') : text.split(splitter);

  return (
    <div style={{
      fontFamily: typography.fontFamily,
      fontSize: typography.sizes.body,
      color: colors.textPrimary,
      lineHeight: 1.25,
      whiteSpace: mode === 'byLine' ? 'pre-line' : 'pre-wrap',
      ...style,
    }}>
      {parts.map((p, i) => {
        const shouldShow = start / delayPer >= i;
        const opacity = shouldShow ? 1 : 0;
        const translateY = shouldShow ? 0 : 8;
        const spanStyle: React.CSSProperties = {
          display: mode === 'byWord' ? 'inline-block' : 'block',
          opacity,
          transform: `translateY(${translateY}px)`,
          marginRight: mode === 'byWord' ? 6 : 0,
        };
        return (
          <span key={i} style={spanStyle}>
            {p}
            {mode === 'byWord' ? ' ' : ''}
          </span>
        );
      })}
    </div>
  );
};
