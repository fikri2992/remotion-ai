import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { typography } from '../../tokens/typography';
import { colors } from '../../tokens/colors';

export interface KineticTermProps {
  text: string;
  active?: boolean;
  color?: string;
  style?: React.CSSProperties;
}

export const KineticTerm: React.FC<KineticTermProps> = ({ text, active = false, color = colors.accent, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = spring({ frame: active ? frame : 0, fps, config: { stiffness: 200, damping: 12 } });
  const scale = 1 + 0.15 * pulse;
  const shadow = `0 0 ${6 + 8 * pulse}px rgba(139,92,246,0.45)`;

  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: typography.fontFamily,
        fontWeight: typography.weight.bold,
        color,
        transform: `scale(${scale})`,
        textShadow: active ? shadow : undefined,
        transition: 'color 120ms ease',
        ...style,
      }}
    >
      {text}
    </span>
  );
};
