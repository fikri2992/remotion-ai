import React from 'react';
import { typography } from '../../tokens/typography';
import { colors } from '../../tokens/colors';

export interface ScoreboardProps {
  current: number;
  best: number;
  style?: React.CSSProperties;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ current, best, style }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 32,
        right: 32,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 12,
        padding: '10px 14px',
        fontFamily: typography.fontFamily,
        color: colors.textPrimary,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        ...style,
      }}
    >
      <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 4 }}>Sliding Window</div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <div style={{ fontSize: 14, opacity: 0.6 }}>Current</div>
          <div style={{ fontSize: 24, fontWeight: typography.weight.bold }}>{current}</div>
        </div>
        <div>
          <div style={{ fontSize: 14, opacity: 0.6 }}>Best</div>
          <div style={{ fontSize: 24, fontWeight: typography.weight.bold, color: colors.accent }}>{best}</div>
        </div>
      </div>
    </div>
  );
};
