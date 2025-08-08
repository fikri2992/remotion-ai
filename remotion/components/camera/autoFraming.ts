export interface Bounds { x: number; y: number; w: number; h: number }
export interface SafeArea { w: number; h: number; margin: number }
export interface CameraTransform { x: number; y: number; scale: number; rotate?: number }

/**
 * Compute a camera transform to frame `subject` inside the `safe` area.
 * Assumes the world space matches the render dimensions; returns translate in px and scale factor.
 */
export const computeCameraToFrame = (subject: Bounds, safe: SafeArea): CameraTransform => {
  const innerW = Math.max(1, safe.w - safe.margin * 2);
  const innerH = Math.max(1, safe.h - safe.margin * 2);
  const sx = innerW / Math.max(1, subject.w);
  const sy = innerH / Math.max(1, subject.h);
  const scale = Math.min(sx, sy);

  const subjectCx = subject.x + subject.w / 2;
  const subjectCy = subject.y + subject.h / 2;
  const safeCx = safe.w / 2;
  const safeCy = safe.h / 2;

  // After scaling the content, translate so that subject center aligns with safe center
  const x = safeCx - subjectCx * scale;
  const y = safeCy - subjectCy * scale;

  return { x, y, scale };
};
