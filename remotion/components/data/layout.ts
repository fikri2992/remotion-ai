export interface LayoutConfig {
  baseX: number;
  baseY: number;
  tileWidth: number;
  tileHeight: number;
  gap: number;
}

export const defaultLayout: LayoutConfig = {
  baseX: 240,
  baseY: 420,
  tileWidth: 64,
  tileHeight: 64,
  gap: 12,
};

export const xForIndex = (index: number, layout: LayoutConfig) =>
  layout.baseX + index * (layout.tileWidth + layout.gap);

export const centerXForIndex = (index: number, layout: LayoutConfig) =>
  xForIndex(index, layout) + layout.tileWidth / 2;

export const widthForRange = (start: number, end: number, layout: LayoutConfig) => {
  if (end < start) return 0;
  const count = end - start + 1;
  if (count <= 0) return 0;
  return count * layout.tileWidth + (count - 1) * layout.gap;
};
