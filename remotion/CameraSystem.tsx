import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const cameraSystemSchema = z.object({
  backgroundColor: zColor(),
  targetX: z.number().default(0),
  targetY: z.number().default(0),
  zoom: z.number().default(1),
  duration: z.number().default(120),
});

interface CameraProps {
  children: React.ReactNode;
  targetX?: number;
  targetY?: number;
  zoom?: number;
  smooth?: boolean;
}

const Camera: React.FC<CameraProps> = ({
  children,
  targetX = 0,
  targetY = 0,
  zoom = 1,
  smooth = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const smoothTargetX = smooth
    ? spring({
        frame,
        fps,
        config: { damping: 20, stiffness: 100 },
        from: 0,
        to: targetX,
      })
    : targetX;

  const smoothTargetY = smooth
    ? spring({
        frame,
        fps,
        config: { damping: 20, stiffness: 100 },
        from: 0,
        to: targetY,
      })
    : targetY;

  const smoothZoom = smooth
    ? spring({
        frame,
        fps,
        config: { damping: 15, stiffness: 80 },
        from: 1,
        to: zoom,
      })
    : zoom;

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${-smoothTargetX}px, ${-smoothTargetY}px) scale(${smoothZoom})`,
        transformOrigin: 'center center',
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
  );
};

interface BuildingProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  windows?: number;
  label?: string;
}

const Building: React.FC<BuildingProps> = ({ x, y, width, height, color, windows = 4, label }) => {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill
      style={{
        left: x,
        top: y,
        width,
        height,
        backgroundColor: color,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 8,
        borderRadius: 4,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Windows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, flex: 1 }}>
        {Array.from({ length: windows }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: Math.sin(frame * 0.1 + i) > 0.5 ? '#ffeb3b' : '#333',
              borderRadius: 2,
              opacity: 0.8,
            }}
          />
        ))}
      </div>
      
      {/* Building label */}
      {label && (
        <div style={{
          color: 'white',
          fontSize: 12,
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: 4,
        }}>
          {label}
        </div>
      )}
    </AbsoluteFill>
  );
};

interface StreetProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

const Street: React.FC<StreetProps> = ({ x, y, width, height }) => {
  return (
    <AbsoluteFill
      style={{
        left: x,
        top: y,
        width,
        height,
        backgroundColor: '#444',
        borderRadius: 2,
      }}
    >
      {/* Street lines */}
      <AbsoluteFill
        style={{
          left: 0,
          top: '50%',
          width: '100%',
          height: 2,
          backgroundColor: '#fff',
          transform: 'translateY(-50%)',
        }}
      />
      <AbsoluteFill
        style={{
          left: 0,
          top: '50%',
          width: '100%',
          height: 2,
          backgroundImage: 'repeating-linear-gradient(90deg, #fff 0, #fff 20px, transparent 20px, transparent 40px)',
          transform: 'translateY(-50%)',
        }}
      />
    </AbsoluteFill>
  );
};

interface CarProps {
  x: number;
  y: number;
  color: string;
  direction?: 'left' | 'right';
}

const Car: React.FC<CarProps> = ({ x, y, color, direction = 'right' }) => {
  const frame = useCurrentFrame();
  const offsetX = Math.sin(frame * 0.05) * 2;
  
  return (
    <AbsoluteFill
      style={{
        left: x + offsetX,
        top: y,
        width: 40,
        height: 20,
        backgroundColor: color,
        borderRadius: 4,
        transform: `scaleX(${direction === 'left' ? -1 : 1})`,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Car windows */}
      <div style={{
        position: 'absolute',
        top: 2,
        left: 8,
        width: 24,
        height: 8,
        backgroundColor: '#87ceeb',
        borderRadius: 2,
      }} />
    </AbsoluteFill>
  );
};

export const CameraSystem: React.FC<z.infer<typeof cameraSystemSchema>> = ({
  backgroundColor,
  duration,
}) => {
  const frame = useCurrentFrame();
  useVideoConfig();

  // Dynamic camera movements based on timeline
  const timelineProgress = frame / duration;

  // Enhanced camera movements for city tour
  const cameraX = interpolate(
    timelineProgress,
    [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1],
    [0, 100, 400, 600, 800, 400, 0]
  );

  const cameraY = interpolate(
    timelineProgress,
    [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1],
    [0, 50, 150, 100, 200, 50, 0]
  );

  const cameraZoom = interpolate(
    timelineProgress,
    [0, 0.1, 0.25, 0.4, 0.6, 0.75, 0.9, 1],
    [0.8, 1.2, 0.9, 1.5, 1.1, 1.8, 1.0, 0.8]
  );

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Camera
        targetX={cameraX}
        targetY={cameraY}
        zoom={cameraZoom}
        smooth={true}
      >
        {/* City Layout */}
        
        {/* Downtown District */}
        <Building x={200} y={150} width={80} height={200} color="#e74c3c" label="Downtown Tower" windows={8} />
        <Building x={300} y={180} width={60} height={170} color="#c0392b" label="Office Block" windows={6} />
        <Building x={380} y={160} width={70} height={190} color="#e74c3c" label="Corporate HQ" windows={7} />
        
        {/* Residential Area */}
        <Building x={100} y={400} width={50} height={120} color="#3498db" label="Apartments" windows={4} />
        <Building x={160} y={420} width={45} height={100} color="#2980b9" label="Condo" windows={3} />
        <Building x={215} y={410} width={55} height={110} color="#3498db" label="Loft" windows={5} />
        
        {/* Shopping District */}
        <Building x={500} y={300} width={90} height={80} color="#f39c12" label="Mall" windows={6} />
        <Building x={600} y={320} width={70} height={60} color="#e67e22" label="Cafe" windows={4} />
        <Building x={680} y={310} width={60} height={70} color="#f39c12" label="Boutique" windows={3} />
        
        {/* Industrial Zone */}
        <Building x={800} y={450} width={100} height={90} color="#95a5a6" label="Factory" windows={2} />
        <Building x={920} y={470} width={80} height={70} color="#7f8c8d" label="Warehouse" windows={1} />
        
        {/* Streets */}
        <Street x={180} y={330} width={300} height={20} />
        <Street x={450} y={250} width={300} height={15} />
        <Street x={480} y={400} width={400} height={18} />
        <Street x={50} y={550} width={900} height={25} />
        
        {/* Moving Cars */}
        <Car x={200 + (frame * 2) % 300} y={335} color="#e74c3c" />
        <Car x={500 + (frame * 1.5) % 300} y={255} color="#3498db" direction="left" />
        <Car x={100 + (frame * 1.8) % 800} y={555} color="#2ecc71" />
        <Car x={600 + (frame * 2.2) % 400} y={405} color="#f39c12" direction="left" />
        
        {/* Parks and Green Spaces */}
        <AbsoluteFill
          style={{
            left: 50,
            top: 250,
            width: 120,
            height: 80,
            backgroundColor: '#27ae60',
            borderRadius: 8,
          }}
        >
          <div style={{
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold',
            textAlign: 'center',
            paddingTop: 30,
          }}>
            Central Park
          </div>
        </AbsoluteFill>
        
        <AbsoluteFill
          style={{
            left: 750,
            top: 200,
            width: 100,
            height: 60,
            backgroundColor: '#16a085',
            borderRadius: 6,
          }}
        >
          <div style={{
            color: 'white',
            fontSize: 11,
            fontWeight: 'bold',
            textAlign: 'center',
            paddingTop: 20,
          }}>
            Garden
          </div>
        </AbsoluteFill>
        
        {/* Water Feature */}
        <AbsoluteFill
          style={{
            left: 400,
            top: 500,
            width: 200,
            height: 40,
            backgroundColor: '#3498db',
            borderRadius: 20,
            opacity: 0.7,
          }}
        >
          <div style={{
            color: 'white',
            fontSize: 10,
            fontWeight: 'bold',
            textAlign: 'center',
            paddingTop: 12,
          }}>
            River
          </div>
        </AbsoluteFill>
      </Camera>

      {/* Enhanced HUD overlay */}
      <AbsoluteFill
        style={{
          padding: 20,
          fontFamily: 'monospace',
          color: 'white',
          fontSize: 14,
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)',
          borderRadius: 10,
          width: 250,
          height: 120,
          left: 20,
          top: 20,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>🏙️ City Tour</div>
        <div>📍 Position: ({Math.round(cameraX)}, {Math.round(cameraY)})</div>
        <div>🔍 Zoom: {cameraZoom.toFixed(2)}x</div>
        <div>⏱️ Progress: {(timelineProgress * 100).toFixed(1)}%</div>
        <div>🚗 Cars: {Math.floor(frame / 30) % 4 + 1} active</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
