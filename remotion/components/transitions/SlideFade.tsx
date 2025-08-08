import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

export interface SlideFadeProps {
  startFrame: number;
  durationInFrames: number;
  axis?: 'x' | 'y';
  distance?: number; // px of slide in/out
  fadeIn?: number; // frames
  fadeOut?: number; // frames
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const SlideFade: React.FC<SlideFadeProps> = ({
  startFrame,
  durationInFrames,
  axis = 'y',
  distance = 24,
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

  const signIn = -1; // slide in from negative direction
  const slideIn = interpolate(local, [0, fadeIn], [distance * signIn, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const slideOut = interpolate(total - local, [0, fadeOut], [0, distance], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const translate = Math.max(0, Math.min(distance, slideOut)) + Math.max(-distance, Math.min(0, slideIn));

  const transform = axis === 'x' ? `translateX(${translate}px)` : `translateY(${translate}px)`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity,
        transform,
        willChange: 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
