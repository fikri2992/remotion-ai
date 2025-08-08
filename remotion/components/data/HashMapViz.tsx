import React from 'react';
import { typography } from '../../tokens/typography';
import { colors } from '../../tokens/colors';

export interface HashMapVizProps {
  present: string[];
  emphasisKey?: string;
  mode?: 'check' | 'insert' | 'delete';
  style?: React.CSSProperties;
}

export const HashMapViz: React.FC<HashMapVizProps> = ({ present, emphasisKey, mode, style }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: 32,
        top: 32,
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
        ...style,
      }}
    >
      <div style={{ fontFamily: typography.fontFamily, fontSize: 16, color: colors.textSecondary, marginRight: 8 }}>
        Set:
      </div>
      {present.map((k, i) => {
        const emph = emphasisKey === k;
        return (
          <div
            key={`${k}-${i}`}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              border: `1px solid ${emph ? colors.warning : 'rgba(0,0,0,0.12)'}`,
              background: emph ? 'rgba(245,158,11,0.12)' : '#fff',
              color: colors.textPrimary,
              fontFamily: typography.fontFamily,
              fontSize: 16,
              transform: emph ? 'scale(1.05)' : 'scale(1)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
            }}
          >
            {k}
          </div>
        );
      })}
    </div>
  );
};
