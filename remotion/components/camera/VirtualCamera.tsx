import React, { useMemo } from 'react';
import { useCurrentFrame, Easing } from 'remotion';

export interface CameraTransform {
  x: number;
  y: number;
  scale: number;
  rotate?: number; // degrees
}

export interface ShotKeyframe {
  frame: number;
  to: Partial<CameraTransform>;
  easing?: (n: number) => number;
}

export interface VirtualCameraProps {
  width?: number | string; // defaults to 100%
  height?: number | string; // defaults to 100%
  base?: CameraTransform;
  keyframes?: ShotKeyframe[]; // sorted by frame ascending
  children: React.ReactNode;
}

const defaultTransform: CameraTransform = { x: 0, y: 0, scale: 1, rotate: 0 };

export const VirtualCamera: React.FC<VirtualCameraProps> = ({
  width = '100%',
  height = '100%',
  base,
  keyframes = [],
  children,
}) => {
  const frame = useCurrentFrame();

  const transform = useMemo(() => {
    const b = base ?? defaultTransform;
    if (!keyframes.length) return b;

    // Find bracketing keyframes
    const prev = [...keyframes].filter((k) => k.frame <= frame).pop();
    const next = [...keyframes].find((k) => k.frame > frame);

    const from = prev?.to ?? {};
    const to = next?.to ?? prev?.to ?? {};

    const start = prev?.frame ?? 0;
    const end = next?.frame ?? start + 1;
    const t = end === start ? 1 : (frame - start) / (end - start);
    const ease = next?.easing || prev?.easing || Easing.ease;
    const tt = ease(Math.min(Math.max(t, 0), 1));

    const lerp = (a: number, c?: number) => {
      const bval = a;
      const toVal = c ?? a;
      return bval + (toVal - bval) * tt;
    };

    return {
      x: lerp(b.x, from.x ?? to.x ?? b.x),
      y: lerp(b.y, from.y ?? to.y ?? b.y),
      scale: lerp(b.scale, from.scale ?? to.scale ?? b.scale),
      rotate: lerp(b.rotate ?? 0, from.rotate ?? to.rotate ?? b.rotate ?? 0),
    } as CameraTransform;
  }, [base, frame, keyframes]);

  const transformStyle = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotate ?? 0}deg)`;

  return (
    <div style={{ width, height, overflow: 'hidden', position: 'relative', background: 'transparent' }}>
      <div style={{ width: '100%', height: '100%', transform: `${transformStyle} translateZ(0)`, transformOrigin: '50% 50%', willChange: 'transform' }}>
        {children}
      </div>
    </div>
  );
};
