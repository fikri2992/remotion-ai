import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { z } from 'zod';

const carSchema = z.object({
  id: z.number(),
  position: z.number(),
  speed: z.number(),
});

export const carFleetVisualizationEnhancedSchema = z.object({
  target: z.number().default(12),
  cars: z.array(carSchema).default([
    { id: 0, position: 10, speed: 2 },
    { id: 1, position: 8, speed: 4 },
    { id: 2, position: 0, speed: 1 },
    { id: 3, position: 5, speed: 1 },
    { id: 4, position: 3, speed: 3 },
  ]),
  title: z.string().default('Car Fleet Problem - Enhanced'),
  theme: z.enum(['light', 'dark', 'cyberpunk', 'nature']).default('light'),
  speed: z.number().min(0.5).max(3).default(1),
  showCode: z.boolean().default(true),
  showCalculations: z.boolean().default(true),
  phaseDuration: z.number().default(10),
  aspectRatio: z.enum(['landscape', 'portrait']).default('landscape'),
  useCamera: z.boolean().default(true),
});

interface ThemeColors {
  background: string;
  text: string;
  road: string;
  roadLines: string;
  car: string;
  carBorder: string;
  fleet: string[];
  target: string;
  accent: string;
  codeBlock: string;
  calculation: string;
}

const getCarFleetTheme = (theme: string): ThemeColors => {
  switch (theme) {
    case 'dark':
      return {
        background: '#1a1a1a',
        text: '#ffffff',
        road: '#333333',
        roadLines: '#666666',
        car: '#4a9eff',
        carBorder: '#ffffff',
        fleet: ['#ff4a4a', '#4aff4a', '#ffff4a', '#ff4aff', '#4affff'],
        target: '#ff6b6b',
        accent: '#888888',
        codeBlock: '#2a2a2a',
        calculation: '#ffd93d',
      };
    default: // light
      return {
        background: '#ffffff',
        text: '#000000',
        road: '#666666',
        roadLines: '#ffffff',
        car: '#2196f3',
        carBorder: '#000000',
        fleet: ['#f44336', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'],
        target: '#e53935',
        accent: '#666666',
        codeBlock: '#f8f8f8',
        calculation: '#1976d2',
      };
  }
};

// Camera component for smooth zooming and panning
interface CameraProps {
  children: React.ReactNode;
  targetX?: number;
  targetY?: number;
  zoom?: number;
}

const Camera: React.FC<CameraProps> = ({ children, targetX = 0, targetY = 0, zoom = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const animatedX = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 200 },
    from: 0,
    to: targetX,
  });

  const animatedY = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 200 },
    from: 0,
    to: targetY,
  });

  const animatedZoom = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 200 },
    from: 1,
    to: zoom,
  });

  return (
    <div
      style={{
        transform: `translate(${-animatedX}px, ${-animatedY}px) scale(${animatedZoom})`,
        transformOrigin: '50% 50%',
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </div>
  );
};

// Educational phases with camera settings
type Phase = {
  id: number;
  title: string;
  description: string;
  camera: { x: number; y: number; zoom: number };
  showElements: {
    cars: boolean;
    calculations: boolean;
    movement: boolean;
    fleets: boolean;
    code: boolean;
  };
};

const getPhases = (aspectRatio: string): Phase[] => {
  const isPortrait = aspectRatio === 'portrait';
  
  return [
    {
      id: 1,
      title: "Problem Introduction",
      description: "Cars are driving to the same destination. Faster cars can catch up to slower ones.",
      camera: { x: 0, y: 0, zoom: 1 },
      showElements: { cars: true, calculations: false, movement: false, fleets: false, code: false }
    },
    {
      id: 2,
      title: "Calculate Arrival Times",
      description: "Calculate how long each car takes: (target - position) ÷ speed",
      camera: { x: isPortrait ? 0 : 200, y: isPortrait ? -100 : 0, zoom: 1.2 },
      showElements: { cars: true, calculations: true, movement: false, fleets: false, code: false }
    },
    {
      id: 3,
      title: "Sort by Position",
      description: "Process cars from right to left (closest to target first)",
      camera: { x: isPortrait ? 0 : -100, y: 0, zoom: 1.1 },
      showElements: { cars: true, calculations: true, movement: false, fleets: false, code: false }
    },
    {
      id: 4,
      title: "Fleet Formation Logic",
      description: "Cars that arrive earlier or same time form fleets",
      camera: { x: 0, y: isPortrait ? 50 : 0, zoom: 1.3 },
      showElements: { cars: true, calculations: true, movement: true, fleets: true, code: false }
    },
    {
      id: 5,
      title: "Animation: Cars Moving",
      description: "Watch faster cars catch up to slower cars ahead",
      camera: { x: 0, y: 0, zoom: 1.5 },
      showElements: { cars: true, calculations: true, movement: true, fleets: true, code: false }
    },
    {
      id: 6,
      title: "Final Result",
      description: "Count the number of fleets at the destination",
      camera: { x: isPortrait ? 0 : -150, y: isPortrait ? -50 : 0, zoom: 1 },
      showElements: { cars: true, calculations: true, movement: true, fleets: true, code: true }
    }
  ];
};

export const CarFleetVisualizationEnhanced: React.FC<z.infer<typeof carFleetVisualizationEnhancedSchema>> = ({
  target,
  cars,
  title,
  theme: themeName,
  speed,
  showCode,
  showCalculations,
  phaseDuration,
  aspectRatio,
  useCamera,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const theme = getCarFleetTheme(themeName);
  const phases = getPhases(aspectRatio);
  const isPortrait = aspectRatio === 'portrait';
  
  // Calculate current phase
  const totalFramesPerPhase = phaseDuration * fps;
  const currentPhaseIndex = Math.floor(frame / totalFramesPerPhase);
  const frameInPhase = frame % totalFramesPerPhase;
  const currentPhase = phases[Math.min(currentPhaseIndex, phases.length - 1)];
  const phaseProgress = frameInPhase / totalFramesPerPhase;
  
  const roadY = height / 2;
  const roadScale = (width - (isPortrait ? 100 : 200)) / target;

  // Calculate fleet formation
  const carsWithTimes = cars.map(car => ({
    ...car,
    arrivalTime: (target - car.position) / car.speed,
  }));

  const sortedCars = [...carsWithTimes].sort((a, b) => b.position - a.position);

  const getFleetFormation = () => {
    const fleets: Array<{ cars: typeof sortedCars; arrivalTime: number }> = [];
    
    for (const car of sortedCars) {
      let joinedFleet = false;
      
      for (const fleet of fleets) {
        if (car.arrivalTime <= fleet.arrivalTime) {
          fleet.cars.push(car);
          joinedFleet = true;
          break;
        }
      }
      
      if (!joinedFleet) {
        fleets.push({ cars: [car], arrivalTime: car.arrivalTime });
      }
    }
    
    return fleets;
  };

  const fleets = getFleetFormation();

  // Camera settings
  const cameraSettings = useCamera ? currentPhase.camera : { x: 0, y: 0, zoom: 1 };

  const content = (
    <AbsoluteFill style={{ backgroundColor: theme.background }}>
      {/* Phase indicator - larger text */}
      <div
        style={{
          position: 'absolute',
          top: isPortrait ? 30 : 20,
          left: isPortrait ? 20 : 40,
          fontSize: isPortrait ? 24 : 20,
          fontWeight: 'bold',
          color: theme.accent,
          backgroundColor: theme.codeBlock,
          padding: isPortrait ? '15px 25px' : '12px 20px',
          borderRadius: 12,
          border: `3px solid ${theme.carBorder}`,
        }}
      >
        Phase {currentPhaseIndex + 1}/6: {currentPhase.title}
      </div>

      {/* Title - larger */}
      <div
        style={{
          position: 'absolute',
          top: isPortrait ? 100 : 80,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: isPortrait ? 36 : 32,
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif',
          color: theme.text,
          textAlign: 'center',
        }}
      >
        {title}
      </div>

      {/* Phase description - larger */}
      <div
        style={{
          position: 'absolute',
          top: isPortrait ? 160 : 130,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: isPortrait ? 22 : 22,
          color: theme.text,
          textAlign: 'center',
          maxWidth: isPortrait ? width - 40 : 900,
          lineHeight: 1.5,
          backgroundColor: theme.codeBlock,
          padding: isPortrait ? '18px 25px' : '16px 28px',
          borderRadius: 15,
          border: `3px solid ${theme.carBorder}`,
        }}
      >
        {currentPhase.description}
      </div>

      {/* Road with larger elements */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: roadY - (isPortrait ? 60 : 50),
          width: width,
          height: isPortrait ? 120 : 100,
          backgroundColor: theme.road,
          border: `4px solid ${theme.carBorder}`,
        }}
      />

      {/* Target line - larger */}
      <div
        style={{
          position: 'absolute',
          left: target * roadScale,
          top: roadY - (isPortrait ? 80 : 70),
          width: isPortrait ? 8 : 6,
          height: isPortrait ? 160 : 140,
          backgroundColor: theme.target,
          boxShadow: `0 0 40px ${theme.target}`,
        }}
      />

      {/* Target label - larger */}
      <div
        style={{
          position: 'absolute',
          left: target * roadScale - 50,
          top: roadY - (isPortrait ? 120 : 100),
          fontSize: isPortrait ? 28 : 24,
          fontWeight: 'bold',
          color: theme.target,
          backgroundColor: theme.codeBlock,
          padding: isPortrait ? '10px 20px' : '8px 16px',
          borderRadius: 10,
          border: `4px solid ${theme.target}`,
        }}
      >
        TARGET
      </div>

      {/* Cars - larger */}
      {cars.map((car, index) => {
        const fleetIndex = fleets.findIndex(f => f.cars.some(c => c.id === car.id));
        const carColor = fleetIndex >= 0 ? theme.fleet[fleetIndex % theme.fleet.length] : theme.car;
        const carWidth = isPortrait ? 90 : 80;
        const carHeight = isPortrait ? 45 : 40;
        
        return (
          <div
            key={car.id}
            style={{
              position: 'absolute',
              left: car.position * roadScale - carWidth / 2,
              top: roadY - carHeight / 2,
              width: carWidth,
              height: carHeight,
              backgroundColor: carColor,
              border: `4px solid ${theme.carBorder}`,
              borderRadius: '8px 20px 20px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isPortrait ? 24 : 20,
              fontWeight: 'bold',
              color: theme.text,
              zIndex: 10,
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
            }}
          >
            {car.id}
            
            {/* Car details - larger */}
            <div
              style={{
                position: 'absolute',
                bottom: isPortrait ? -55 : -50,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: isPortrait ? 18 : 16,
                color: theme.text,
                textAlign: 'center',
                backgroundColor: theme.codeBlock,
                padding: isPortrait ? '6px 12px' : '4px 10px',
                borderRadius: 8,
                fontWeight: 'bold',
              }}
            >
              P:{car.position} S:{car.speed}
            </div>

            {/* Fleet indicator - larger */}
            {fleetIndex >= 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: isPortrait ? -30 : -25,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: isPortrait ? 16 : 14,
                  color: theme.text,
                  backgroundColor: carColor,
                  padding: isPortrait ? '4px 10px' : '3px 8px',
                  borderRadius: 6,
                  fontWeight: 'bold',
                }}
              >
                F{fleetIndex + 1}
              </div>
            )}
          </div>
        );
      })}

      {/* Calculations panel - larger text */}
      {showCalculations && currentPhase.showElements.calculations && (
        <div
          style={{
            position: 'absolute',
            top: isPortrait ? 250 : 220,
            right: isPortrait ? 20 : 40,
            backgroundColor: theme.codeBlock,
            border: `4px solid ${theme.carBorder}`,
            borderRadius: 15,
            padding: isPortrait ? 25 : 20,
            fontFamily: 'monospace',
            fontSize: isPortrait ? 18 : 16,
            color: theme.text,
            minWidth: isPortrait ? 350 : 320,
            maxHeight: isPortrait ? 450 : 400,
            overflow: 'auto',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 12, color: theme.calculation, fontSize: isPortrait ? 22 : 20 }}>
            Calculations:
          </div>
          {carsWithTimes.map(car => (
            <div key={car.id} style={{ marginBottom: 10, fontSize: isPortrait ? 16 : 14 }}>
              <div style={{ color: theme.fleet[fleets.findIndex(f => f.cars.some(c => c.id === car.id)) % theme.fleet.length] }}>
                Car {car.id}: ({target} - {car.position}) ÷ {car.speed} = {car.arrivalTime.toFixed(1)}s
              </div>
            </div>
          ))}
          
          <div style={{ marginTop: 20, fontWeight: 'bold', fontSize: isPortrait ? 24 : 20, color: theme.target }}>
            Final Answer: {fleets.length} fleets
          </div>
        </div>
      )}

      {/* Phase progress - larger */}
      <div
        style={{
          position: 'absolute',
          bottom: isPortrait ? 40 : 30,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: isPortrait ? 20 : 18,
          color: theme.accent,
          fontFamily: 'monospace',
          backgroundColor: theme.codeBlock,
          padding: isPortrait ? '15px 25px' : '12px 20px',
          borderRadius: 12,
          fontWeight: 'bold',
        }}
      >
        Phase {currentPhaseIndex + 1}/6 - Progress: {Math.round(phaseProgress * 100)}%
      </div>
    </AbsoluteFill>
  );

  return useCamera ? (
    <Camera
      targetX={cameraSettings.x}
      targetY={cameraSettings.y}
      zoom={cameraSettings.zoom}
    >
      {content}
    </Camera>
  ) : content;
};
