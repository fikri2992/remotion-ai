import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const cameraSystemSchema = z.object({
  backgroundColor: zColor(),
  theme: z.enum(['cyberpunk', 'nature', 'minimal']).default('cyberpunk'),
  duration: z.number().default(360),
});

interface CameraProps {
  children: React.ReactNode;
  targetX?: number;
  targetY?: number;
  zoom?: number;
  rotation?: number;
  smooth?: boolean;
}

const Camera: React.FC<CameraProps> = ({
  children,
  targetX = 0,
  targetY = 0,
  zoom = 1,
  rotation = 0,
  smooth = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const easingConfig = {
    damping: 12,
    stiffness: 60,
    mass: 1,
  };

  const smoothTargetX = smooth
    ? spring({
        frame,
        fps,
        config: easingConfig,
        from: 0,
        to: targetX,
      })
    : targetX;

  const smoothTargetY = smooth
    ? spring({
        frame,
        fps,
        config: easingConfig,
        from: 0,
        to: targetY,
      })
    : targetY;

  const smoothZoom = smooth
    ? spring({
        frame,
        fps,
        config: { ...easingConfig, damping: 8 },
        from: 1,
        to: zoom,
      })
    : zoom;

  const smoothRotation = smooth
    ? spring({
        frame,
        fps,
        config: { ...easingConfig, damping: 15 },
        from: 0,
        to: rotation,
      })
    : rotation;

  // Cinematic vignette effect
  const vignetteOpacity = interpolate(smoothZoom, [0.5, 2], [0.1, 0.4]);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `
            translate(${-smoothTargetX}px, ${-smoothTargetY}px)
            scale(${smoothZoom})
            rotate(${smoothRotation}deg)
          `,
          transformOrigin: 'center center',
          transition: 'transform 0.1s ease-out',
        }}
      >
        <AbsoluteFill
          style={{
            transform: `translate(${smoothTargetX}px, ${smoothTargetY}px)`,
          }}
        >
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
      
      {/* Cinematic vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at center, transparent 30%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

interface ElementProps {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'building' | 'tree' | 'water' | 'platform';
  theme: 'cyberpunk' | 'nature' | 'minimal';
  label?: string;
  animated?: boolean;
}

const Element: React.FC<ElementProps> = ({ x, y, width, height, type, theme, label, animated = true }) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.05) * 0.5 + 0.5;
  const glow = Math.sin(frame * 0.08) * 0.3 + 0.7;
  
  const getThemeColors = () => {
    switch (theme) {
      case 'cyberpunk':
        return {
          primary: `hsl(${280 + pulse * 40}, 70%, ${50 + pulse * 20}%)`,
          secondary: `hsl(${180 + pulse * 60}, 80%, ${40 + pulse * 30}%)`,
          accent: '#00ffff',
          glow: `0 0 ${20 + pulse * 10}px rgba(0, 255, 255, ${glow})`,
        };
      case 'nature':
        return {
          primary: `hsl(${120 + pulse * 20}, 60%, ${30 + pulse * 20}%)`,
          secondary: `hsl(${60 + pulse * 30}, 70%, ${40 + pulse * 15}%)`,
          accent: '#90EE90',
          glow: `0 0 ${15 + pulse * 8}px rgba(144, 238, 144, ${glow * 0.6})`,
        };
      default:
        return {
          primary: `hsl(${200 + pulse * 30}, 50%, ${40 + pulse * 20}%)`,
          secondary: `hsl(${220 + pulse * 20}, 60%, ${35 + pulse * 25}%)`,
          accent: '#ffffff',
          glow: `0 0 ${10 + pulse * 5}px rgba(255, 255, 255, ${glow * 0.4})`,
        };
    }
  };

  const colors = getThemeColors();
  const floatOffset = animated ? Math.sin(frame * 0.03 + x * 0.01) * 2 : 0;
  
  const getElementStyle = () => {
    const baseStyle = {
      left: x,
      top: y + floatOffset,
      width,
      height,
      borderRadius: type === 'water' ? '50%' : type === 'tree' ? '50% 50% 0 0' : 8,
      boxShadow: colors.glow,
      transition: 'all 0.3s ease',
    };

    switch (type) {
      case 'building':
        return {
          ...baseStyle,
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          border: `2px solid ${colors.accent}`,
        };
      case 'tree':
        return {
          ...baseStyle,
          background: `radial-gradient(circle at center, ${colors.primary} 0%, ${colors.secondary} 70%)`,
        };
      case 'water':
        return {
          ...baseStyle,
          background: `radial-gradient(circle at ${30 + pulse * 40}% ${30 + pulse * 40}%, ${colors.accent} 0%, ${colors.primary} 100%)`,
          opacity: 0.8,
        };
      case 'platform':
        return {
          ...baseStyle,
          background: `linear-gradient(90deg, ${colors.secondary} 0%, ${colors.primary} 50%, ${colors.secondary} 100%)`,
          borderRadius: 4,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <AbsoluteFill style={getElementStyle()}>
      {type === 'building' && (
        <>
          {/* Animated windows */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 4,
            padding: 8,
            height: '70%',
          }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: Math.sin(frame * 0.1 + i * 0.5) > 0.3 ? colors.accent : 'rgba(0,0,0,0.3)',
                  borderRadius: 2,
                  opacity: 0.9,
                  boxShadow: Math.sin(frame * 0.1 + i * 0.5) > 0.3 ? `0 0 5px ${colors.accent}` : 'none',
                }}
              />
            ))}
          </div>
          
          {/* Antenna */}
          <div style={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 2,
            height: 10,
            backgroundColor: colors.accent,
            boxShadow: `0 0 10px ${colors.accent}`,
          }} />
        </>
      )}
      
      {type === 'tree' && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: width * 0.2,
          height: height * 0.3,
          backgroundColor: '#8B4513',
          borderRadius: '0 0 4px 4px',
        }} />
      )}
      
      {label && (
        <div style={{
          position: 'absolute',
          bottom: -25,
          left: '50%',
          transform: 'translateX(-50%)',
          color: colors.accent,
          fontSize: 10,
          fontWeight: 'bold',
          textAlign: 'center',
          textShadow: `0 0 5px ${colors.accent}`,
          whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
      )}
    </AbsoluteFill>
  );
};

interface FloatingObjectProps {
  x: number;
  y: number;
  size: number;
  theme: 'cyberpunk' | 'nature' | 'minimal';
  type: 'orb' | 'crystal' | 'spark';
}

const FloatingObject: React.FC<FloatingObjectProps> = ({ x, y, size, theme, type }) => {
  const frame = useCurrentFrame();
  const floatY = Math.sin(frame * 0.04 + x * 0.01) * 15;
  const rotation = frame * 2;
  const pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
  
  const getObjectStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      left: x,
      top: y + floatY,
      width: size * pulse,
      height: size * pulse,
      transform: `rotate(${rotation}deg)`,
    };

    switch (theme) {
      case 'cyberpunk':
        return {
          ...baseStyle,
          background: type === 'orb' 
            ? `radial-gradient(circle, #00ffff 0%, #ff00ff 100%)`
            : `conic-gradient(from 0deg, #00ffff, #ff00ff, #ffff00, #00ffff)`,
          borderRadius: type === 'orb' ? '50%' : '20%',
          boxShadow: `0 0 ${size}px rgba(0, 255, 255, 0.8)`,
        };
      case 'nature':
        return {
          ...baseStyle,
          background: type === 'orb'
            ? `radial-gradient(circle, #90EE90 0%, #228B22 100%)`
            : `conic-gradient(from 0deg, #90EE90, #32CD32, #228B22, #90EE90)`,
          borderRadius: type === 'orb' ? '50%' : '30%',
          boxShadow: `0 0 ${size * 0.8}px rgba(144, 238, 144, 0.6)`,
        };
      default:
        return {
          ...baseStyle,
          background: type === 'orb'
            ? `radial-gradient(circle, #ffffff 0%, #cccccc 100%)`
            : `conic-gradient(from 0deg, #ffffff, #f0f0f0, #cccccc, #ffffff)`,
          borderRadius: type === 'orb' ? '50%' : '25%',
          boxShadow: `0 0 ${size * 0.6}px rgba(255, 255, 255, 0.4)`,
        };
    }
  };

  return <div style={getObjectStyle()} />;
};

export const CameraSystem: React.FC<z.infer<typeof cameraSystemSchema>> = ({
  backgroundColor,
  theme,
  duration,
}) => {
  const frame = useCurrentFrame();
  useVideoConfig();

  // Dynamic camera movements with cinematic timing
  const timelineProgress = frame / duration;
  
  // Smooth camera path with easing
  const cameraX = interpolate(
    timelineProgress,
    [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
    [0, 150, 300, 500, 700, 450, 200, 0],
    {
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const cameraY = interpolate(
    timelineProgress,
    [0, 0.12, 0.28, 0.45, 0.62, 0.78, 0.9, 1],
    [0, 80, 160, 120, 240, 100, 50, 0],
    {
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Dramatic zoom with breathing effect
  const baseZoom = interpolate(
    timelineProgress,
    [0, 0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92, 1],
    [0.6, 1.0, 0.8, 1.4, 1.1, 1.8, 1.2, 0.9, 0.6],
    {
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  const breathingZoom = Math.sin(frame * 0.02) * 0.05 + 1;
  const cameraZoom = baseZoom * breathingZoom;
  
  // Subtle rotation for cinematic effect
  const cameraRotation = interpolate(
    timelineProgress,
    [0, 0.3, 0.7, 1],
    [0, -2, 3, 0],
    { easing: Easing.bezier(0.25, 0.46, 0.45, 0.94) }
  );

  return (
    <AbsoluteFill style={{ 
      background: `linear-gradient(135deg, ${backgroundColor} 0%, ${theme === 'cyberpunk' ? '#1a0033' : theme === 'nature' ? '#0d2818' : '#1a1a2e'} 100%)` 
    }}>
      <Camera
        targetX={cameraX}
        targetY={cameraY}
        zoom={cameraZoom}
        rotation={cameraRotation}
        smooth={true}
      >
        {/* Main Elements */}
        <Element x={200} y={150} width={80} height={200} type="building" theme={theme} label="Tower Alpha" />
        <Element x={320} y={180} width={60} height={170} type="building" theme={theme} label="Core Beta" />
        <Element x={420} y={160} width={70} height={190} type="building" theme={theme} label="Hub Gamma" />
        
        <Element x={100} y={400} width={50} height={120} type="building" theme={theme} label="Node 1" />
        <Element x={180} y={420} width={45} height={100} type="building" theme={theme} label="Node 2" />
        
        <Element x={500} y={300} width={90} height={80} type="platform" theme={theme} label="Platform A" />
        <Element x={620} y={320} width={70} height={60} type="platform" theme={theme} label="Platform B" />
        
        <Element x={800} y={450} width={100} height={90} type="building" theme={theme} label="Facility X" />
        
        {/* Nature/Water Elements */}
        <Element x={50} y={250} width={120} height={80} type={theme === 'nature' ? 'tree' : 'water'} theme={theme} label="Zone Alpha" />
        <Element x={750} y={200} width={100} height={60} type={theme === 'nature' ? 'tree' : 'water'} theme={theme} label="Zone Beta" />
        
        {/* Floating Objects */}
        {Array.from({ length: 12 }).map((_, i) => (
          <FloatingObject
            key={i}
            x={100 + i * 80}
            y={100 + (i % 3) * 150}
            size={15 + (i % 3) * 5}
            theme={theme}
            type={i % 3 === 0 ? 'orb' : i % 3 === 1 ? 'crystal' : 'spark'}
          />
        ))}
      </Camera>

      {/* Enhanced HUD */}
      <AbsoluteFill
        style={{
          padding: 20,
          fontFamily: 'monospace',
          color: theme === 'cyberpunk' ? '#00ffff' : theme === 'nature' ? '#90EE90' : '#ffffff',
          fontSize: 14,
          textShadow: `0 0 10px ${theme === 'cyberpunk' ? '#00ffff' : theme === 'nature' ? '#90EE90' : '#ffffff'}`,
          background: `linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%)`,
          borderRadius: 15,
          border: `2px solid ${theme === 'cyberpunk' ? '#00ffff' : theme === 'nature' ? '#90EE90' : '#ffffff'}`,
          width: 280,
          height: 140,
          left: 20,
          top: 20,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          🎬 {theme.toUpperCase()} CAM
        </div>
        <div>📍 Position: ({Math.round(cameraX)}, {Math.round(cameraY)})</div>
        <div>🔍 Zoom: {cameraZoom.toFixed(2)}x</div>
        <div>🔄 Rotation: {cameraRotation.toFixed(1)}°</div>
        <div>⏱️ Progress: {(timelineProgress * 100).toFixed(1)}%</div>
        <div>✨ Objects: {12 + Math.floor(frame / 60) % 5} active</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
