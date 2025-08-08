import React from 'react';
import { colors } from '../../tokens/colors';
import { LayoutConfig, defaultLayout, xForIndex, widthForRange } from './layout';

export interface SlidingWindowOverlayProps {
  start: number;
  end: number; // inclusive
  emphasis?: 'none' | 'enter' | 'update' | 'exit';
  layout?: LayoutConfig;
}

export const SlidingWindowOverlay: React.FC<SlidingWindowOverlayProps> = ({
  start,
  end,
  emphasis = 'none',
  layout = defaultLayout,
}) => {
  const left = xForIndex(start, layout) - 4;
  const width = widthForRange(start, end, layout) + 8;
  const top = layout.baseY - 4;
  const height = layout.tileHeight + 8;

  // subtle emphasis: scale/opacity variations could be added here
  const boxShadow = emphasis === 'update' ? '0 0 0 3px rgba(59,130,246,0.25) inset' : '0 0 0 1px rgba(59,130,246,0.2) inset';

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        background: colors.window,
        border: `2px solid ${colors.windowBorder}`,
        borderRadius: 12,
        boxShadow,
        backdropFilter: 'blur(0.5px)',
        transition: 'left 150ms ease, width 150ms ease',
      }}
    />
  );
};
