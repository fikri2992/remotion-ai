import React from 'react';
import { useCurrentFrame, Easing, interpolate } from 'remotion';

export interface FadeInOutProps {
  startFrame: number; // absolute start frame on the global timeline
  durationInFrames: number; // base duration of the content (excluding the extra tail for fade out)
  fadeIn?: number; // frames
  fadeOut?: number; // frames
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const FadeInOut: React.FC<FadeInOutProps> = ({
  startFrame,
  durationInFrames,
  fadeIn = 12,
  fadeOut = 12,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  const total = durationInFrames;

  const alphaIn = fadeIn > 0
    ? interpolate(local, [0, fadeIn], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.ease })
    : 1;
  const alphaOut = fadeOut > 0
    ? interpolate(total - local, [0, fadeOut], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.ease })
    : 1;

  const opacity = Math.max(0, Math.min(1, Math.min(alphaIn, alphaOut)));

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity,
        transition: 'opacity 100ms linear',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
