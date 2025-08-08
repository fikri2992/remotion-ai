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
  // Snap geometry to whole pixels to avoid subpixel shimmer at 60fps
  const left = Math.round(xForIndex(start, layout) - 4);
  const width = Math.round(widthForRange(start, end, layout) + 8);
  const top = Math.round(layout.baseY - 4);
  const height = Math.round(layout.tileHeight + 8);

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
        // Promote to its own layer for smoother compositing
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        contain: 'layout paint',
      }}
    />
  );
};
