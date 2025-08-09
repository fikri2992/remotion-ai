import { useVideoConfig } from 'remotion';

export const secondsToFramesStatic = (s: number, fps = 30) => Math.round(s * fps);
export const framesToSecondsStatic = (f: number, fps = 30) => f / fps;

export const useFps = () => {
  const { fps } = useVideoConfig();
  return fps ?? 30;
};

export const secondsToFrames = (s: number, fps?: number) => {
  if (fps) return Math.round(s * fps);
  return Math.round(s * 30);
};

export const framesToSeconds = (f: number, fps?: number) => {
  if (fps) return f / fps;
  return f / 30;
};
