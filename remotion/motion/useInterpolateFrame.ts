import { useCurrentFrame, interpolate } from 'remotion';

export const useInterpolateFrame = (
  domain: [number, number],
  range: [number, number],
  opts?: { extrapolate?: 'clamp' | 'extend' }
) => {
  const frame = useCurrentFrame();
  return interpolate(frame, domain, range, {
    extrapolateLeft: opts?.extrapolate ?? 'clamp',
    extrapolateRight: opts?.extrapolate ?? 'clamp',
  });
};
