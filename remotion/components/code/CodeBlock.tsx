import React from 'react';
import { typography } from '../../tokens/typography';
import { colors } from '../../tokens/colors';

export interface CodeBlockProps {
  code: string;
  language?: string;
  activeLine?: number; // 1-based
  theme?: 'light' | 'dark';
  style?: React.CSSProperties;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, activeLine, theme = 'light', style }) => {
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  const bg = theme === 'light' ? '#F9FAFB' : '#0B1220';
  const fg = theme === 'light' ? colors.textPrimary : '#D1D5DB';
  const activeBg = theme === 'light' ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.25)';

  return (
    <div
      style={{
        fontFamily: typography.codeFontFamily,
        fontSize: typography.sizes.code,
        background: bg,
        color: fg,
        padding: 16,
        borderRadius: 12,
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        whiteSpace: 'pre',
        lineHeight: 1.35,
        ...style,
      }}
    >
      {lines.map((l, i) => (
        <div key={i} style={{
          background: activeLine === i + 1 ? activeBg : 'transparent',
          borderRadius: 8,
          padding: '2px 6px',
        }}>
          <span style={{ opacity: 0.35, marginRight: 12 }}>{i + 1}</span>
          {l}
        </div>
      ))}
    </div>
  );
};
