import React from 'react';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { LayoutConfig, defaultLayout, centerXForIndex } from './layout';

export interface PointerProps {
  label: string; // e.g., 'L', 'R'
  index: number;
  color?: string;
  orientation?: 'top' | 'bottom';
  layout?: LayoutConfig;
}

export const Pointer: React.FC<PointerProps> = ({
  label,
  index,
  color = colors.primary,
  orientation = 'top',
  layout = defaultLayout,
}) => {
  const xCenter = centerXForIndex(index, layout);
  const arrowSize = 10;
  const offsetY = 40; // distance from tile
  const top =
    orientation === 'top'
      ? layout.baseY - offsetY
      : layout.baseY + layout.tileHeight + offsetY - arrowSize;

  const labelTop = orientation === 'top' ? top - 28 : top + 8;

  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      {/* Label bubble */}
      <div
        style={{
          position: 'absolute',
          left: xCenter - 12,
          top: labelTop,
          background: color,
          color: '#fff',
          borderRadius: 6,
          padding: '2px 6px',
          fontFamily: typography.fontFamily,
          fontSize: 16,
          fontWeight: typography.weight.bold,
        }}
      >
        {label}
      </div>

      {/* Arrow triangle */}
      <div
        style={{
          position: 'absolute',
          left: xCenter - arrowSize,
          top,
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderTop:
            orientation === 'bottom' ? `${arrowSize}px solid ${color}` : undefined,
          borderBottom:
            orientation === 'top' ? `${arrowSize}px solid ${color}` : undefined,
        }}
      />
    </div>
  );
};
