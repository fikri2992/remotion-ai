import React from 'react';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { LayoutConfig, defaultLayout, xForIndex } from './layout';

export interface TileHighlight {
  index: number;
  color?: string;
  weight?: 'soft' | 'strong';
}

export interface RangeHighlight {
  start: number;
  end: number;
  color?: string;
}

export interface ArrayVizProps<T = string | number> {
  values: T[];
  activeIndices?: number[];
  highlights?: TileHighlight[];
  rangeHighlights?: RangeHighlight[];
  label?: string;
  y?: number; // overrides baseY
  layout?: LayoutConfig;
}

export const ArrayViz = <T extends string | number>({
  values,
  activeIndices = [],
  highlights = [],
  rangeHighlights = [],
  label,
  y,
  layout = defaultLayout,
}: ArrayVizProps<T>) => {
  const baseY = y ?? layout.baseY;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      {/* Range highlights as background bands */}
      {rangeHighlights.map((r, i) => {
        const startX = xForIndex(r.start, layout);
        const width = (r.end - r.start + 1) * layout.tileWidth + (r.end - r.start) * layout.gap;
        return (
          <div key={`range-${i}`} style={{
            position: 'absolute',
            left: startX,
            top: baseY,
            width,
            height: layout.tileHeight,
            background: r.color ?? 'rgba(59,130,246,0.08)',
            borderRadius: 8,
          }} />
        );
      })}

      {/* Tiles */}
      {values.map((v, i) => {
        const isActive = activeIndices.includes(i);
        const h = highlights.find((hh) => hh.index === i);
        const x = xForIndex(i, layout);
        const bg = h ? (h.weight === 'strong' ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.08)') : colors.bg;
        const borderColor = isActive ? colors.accent : colors.muted;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: x,
            top: baseY,
            width: layout.tileWidth,
            height: layout.tileHeight,
            border: `2px solid ${borderColor}`,
            borderRadius: 10,
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textPrimary,
            fontFamily: typography.fontFamily,
            fontSize: typography.sizes.body,
            fontWeight: typography.weight.semibold,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
            {String(v)}
          </div>
        );
      })}

      {/* Label */}
      {label ? (
        <div style={{
          position: 'absolute', left: xForIndex(0, layout), top: baseY + layout.tileHeight + 24,
          fontFamily: typography.fontFamily, color: colors.textSecondary, fontSize: typography.sizes.caption,
        }}>
          {label}
        </div>
      ) : null}
    </div>
  );
};
