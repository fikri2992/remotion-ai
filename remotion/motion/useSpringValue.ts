import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const useSpringValue = (
  enabled: boolean,
  config: { stiffness?: number; damping?: number } = {}
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { stiffness = 120, damping = 14 } = config;
  return spring({ frame: enabled ? frame : 0, fps, config: { stiffness, damping } });
};
