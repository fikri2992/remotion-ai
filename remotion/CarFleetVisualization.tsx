import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { z } from 'zod';

const carSchema = z.object({
  id: z.number(),
  position: z.number(),
  speed: z.number(),
});

export const carFleetVisualizationSchema = z.object({
  target: z.number().default(12),
  cars: z.array(carSchema).default([
    { id: 0, position: 10, speed: 2 },
    { id: 1, position: 8, speed: 4 },
    { id: 2, position: 0, speed: 1 },
    { id: 3, position: 5, speed: 1 },
    { id: 4, position: 3, speed: 3 },
  ]),
  title: z.string().default('Car Fleet Problem - Step by Step'),
  theme: z.enum(['light', 'dark', 'cyberpunk', 'nature']).default('light'),
  speed: z.number().min(0.5).max(3).default(1),
  showCode: z.boolean().default(true),
  showCalculations: z.boolean().default(true),
  phaseDuration: z.number().default(10), // seconds per phase
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
    case 'cyberpunk':
      return {
        background: '#0a0a0a',
        text: '#00ffff',
        road: '#1a0033',
        roadLines: '#ff00ff',
        car: '#00ffff',
        carBorder: '#ff00ff',
        fleet: ['#ff0080', '#80ff00', '#ffff00', '#ff8000', '#8000ff'],
        target: '#ff0040',
        accent: '#ff00ff',
        codeBlock: '#1a1a2e',
        calculation: '#00ff80',
      };
    case 'nature':
      return {
        background: '#f0f8f0',
        text: '#2d5016',
        road: '#8d6e63',
        roadLines: '#ffffff',
        car: '#4caf50',
        carBorder: '#2e7d32',
        fleet: ['#f44336', '#2196f3', '#ff9800', '#9c27b0', '#00bcd4'],
        target: '#e53935',
        accent: '#388e3c',
        codeBlock: '#e0f2e0',
        calculation: '#ff6f00',
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

interface CarProps {
  car: z.infer<typeof carSchema>;
  currentPosition: number;
  fleetId: number;
  theme: ThemeColors;
  roadY: number;
  scale: number;
  isLeader: boolean;
}

const Car: React.FC<CarProps> = ({
  car,
  currentPosition,
  fleetId,
  theme,
  roadY,
  scale,
  isLeader,
}) => {
  const frame = useCurrentFrame();
  
  const carColor = fleetId >= 0 ? theme.fleet[fleetId % theme.fleet.length] : theme.car;
  const bounce = isLeader ? Math.sin(frame * 0.2) * 2 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: currentPosition * scale - 25,
        top: roadY - 20 + bounce,
        width: 50,
        height: 25,
        backgroundColor: carColor,
        border: `2px solid ${theme.carBorder}`,
        borderRadius: '4px 12px 12px 4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.text,
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
    >
      {car.id}
      
      {/* Car details */}
      <div
        style={{
          position: 'absolute',
          bottom: -35,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 10,
          color: theme.text,
          textAlign: 'center',
          backgroundColor: theme.codeBlock,
          padding: '2px 6px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}
      >
        P:{car.position} S:{car.speed}
      </div>

      {/* Fleet indicator */}
      {fleetId >= 0 && (
        <div
          style={{
            position: 'absolute',
            top: -15,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 8,
            color: theme.text,
            backgroundColor: carColor,
            padding: '1px 4px',
            borderRadius: 2,
            fontWeight: 'bold',
          }}
        >
          F{fleetId + 1}
        </div>
      )}
    </div>
  );
};

interface RoadProps {
  width: number;
  roadY: number;
  target: number;
  scale: number;
  theme: ThemeColors;
}

const Road: React.FC<RoadProps> = ({ width, roadY, target, scale, theme }) => {
  const frame = useCurrentFrame();
  
  // Animated road lines
  const lineOffset = (frame * 2) % 40;

  return (
    <>
      {/* Road surface */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: roadY - 30,
          width: width,
          height: 60,
          backgroundColor: theme.road,
          border: `2px solid ${theme.carBorder}`,
        }}
      />
      
      {/* Road center line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: roadY - 1,
          width: width,
          height: 2,
          background: `repeating-linear-gradient(90deg, ${theme.roadLines} 0, ${theme.roadLines} 20px, transparent 20px, transparent 40px)`,
          transform: `translateX(${-lineOffset}px)`,
        }}
      />
      
      {/* Target line */}
      <div
        style={{
          position: 'absolute',
          left: target * scale,
          top: roadY - 40,
          width: 4,
          height: 80,
          backgroundColor: theme.target,
          boxShadow: `0 0 20px ${theme.target}`,
        }}
      />
      
      {/* Target label */}
      <div
        style={{
          position: 'absolute',
          left: target * scale - 30,
          top: roadY - 60,
          fontSize: 16,
          fontWeight: 'bold',
          color: theme.target,
          backgroundColor: theme.codeBlock,
          padding: '4px 8px',
          borderRadius: 4,
          border: `2px solid ${theme.target}`,
        }}
      >
        TARGET
      </div>
    </>
  );
};

// Educational phases for the Car Fleet problem
type Phase = {
  id: number;
  title: string;
  description: string;
  duration: number; // in seconds
  showElements: {
    cars: boolean;
    calculations: boolean;
    movement: boolean;
    fleets: boolean;
    code: boolean;
    explanation: boolean;
  };
};

const getPhases = (): Phase[] => [
  {
    id: 1,
    title: "Problem Introduction",
    description: "Cars are driving to the same destination. Faster cars can catch up to slower ones.",
    duration: 10,
    showElements: { cars: true, calculations: false, movement: false, fleets: false, code: false, explanation: true }
  },
  {
    id: 2,
    title: "Calculate Arrival Times",
    description: "First, we calculate how long each car takes to reach the target: (target - position) / speed",
    duration: 10,
    showElements: { cars: true, calculations: true, movement: false, fleets: false, code: false, explanation: true }
  },
  {
    id: 3,
    title: "Sort by Position",
    description: "We process cars from right to left (closest to target first) to see fleet formation.",
    duration: 10,
    showElements: { cars: true, calculations: true, movement: false, fleets: false, code: false, explanation: true }
  },
  {
    id: 4,
    title: "Fleet Formation Logic",
    description: "If a car behind arrives earlier or same time, it catches up and forms a fleet.",
    duration: 10,
    showElements: { cars: true, calculations: true, movement: true, fleets: true, code: false, explanation: true }
  },
  {
    id: 5,
    title: "Animation: Cars Moving",
    description: "Watch how faster cars catch up to slower cars ahead of them.",
    duration: 10,
    showElements: { cars: true, calculations: true, movement: true, fleets: true, code: false, explanation: true }
  },
  {
    id: 6,
    title: "Final Result",
    description: "Count the number of fleets that arrive at the destination.",
    duration: 10,
    showElements: { cars: true, calculations: true, movement: true, fleets: true, code: true, explanation: true }
  }
];

export const CarFleetVisualization: React.FC<z.infer<typeof carFleetVisualizationSchema>> = ({
  target,
  cars,
  title,
  theme: themeName,
  speed,
  showCode,
  showCalculations,
  phaseDuration,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const theme = getCarFleetTheme(themeName);
  const phases = getPhases();
  
  // Calculate current phase based on frame
  const totalFramesPerPhase = phaseDuration * fps;
  const currentPhaseIndex = Math.floor(frame / totalFramesPerPhase);
  const frameInPhase = frame % totalFramesPerPhase;
  const currentPhase = phases[Math.min(currentPhaseIndex, phases.length - 1)];
  
  const roadY = height / 2;
  const roadScale = (width - 200) / target;

  // Calculate arrival times for each car
  const carsWithTimes = cars.map(car => ({
    ...car,
    arrivalTime: (target - car.position) / car.speed,
  }));

  // Sort cars by position (rightmost first for processing)
  const sortedCars = [...carsWithTimes].sort((a, b) => b.position - a.position);

  // Simulate car fleet formation
  const getFleetFormation = () => {
    const fleets: Array<{ cars: typeof sortedCars; arrivalTime: number }> = [];
    
    for (const car of sortedCars) {
      let joinedFleet = false;
      
      // Check if this car can join an existing fleet
      for (const fleet of fleets) {
        // If this car would arrive before or at the same time as the fleet leader
        if (car.arrivalTime <= fleet.arrivalTime) {
          fleet.cars.push(car);
          joinedFleet = true;
          break;
        }
      }
      
      // If car doesn't join any fleet, create a new one
      if (!joinedFleet) {
        fleets.push({
          cars: [car],
          arrivalTime: car.arrivalTime,
        });
      }
    }
    
    return fleets;
  };

  const fleets = getFleetFormation();
  const phaseProgress = frameInPhase / totalFramesPerPhase; // 0 to 1 progress in current phase

  // Calculate current positions for animation based on phase
  const getCurrentPosition = (car: typeof carsWithTimes[0]) => {
    // Only show movement in phases 4 and 5
    if (currentPhaseIndex < 3) {
      return car.position; // Static position
    }
    
    // Calculate movement progress (0 to 1)
    let movementProgress = 0;
    if (currentPhaseIndex === 3) {
      // Phase 4: Start showing fleet formation
      movementProgress = phaseProgress * 0.3; // Slow start
    } else if (currentPhaseIndex === 4) {
      // Phase 5: Full animation
      movementProgress = 0.3 + phaseProgress * 0.7; // Complete the movement
    } else {
      // Phase 6+: Show final positions
      movementProgress = 1;
    }
    
    // Calculate target position based on fleet membership
    const fleet = fleets.find(f => f.cars.some(c => c.id === car.id));
    let targetPosition = target;
    
    if (fleet && fleet.cars.length > 1) {
      // If in a fleet, move to the position of the slowest car in the fleet
      const leader = fleet.cars.reduce((slowest, current) => 
        current.arrivalTime > slowest.arrivalTime ? current : slowest
      );

      targetPosition = Math.min(target, car.position + (target - car.position) * (leader.arrivalTime / Math.max(...fleet.cars.map(c => c.arrivalTime))));
    }
    
    // Interpolate between start and target position
    const newPosition = car.position + (targetPosition - car.position) * movementProgress;
    return Math.min(newPosition, target);
  };

  const getAlgorithmCode = () => {
    return `def carFleet(target, position, speed):
    # Calculate arrival time for each car
    cars = []
    for i in range(len(position)):
        time = (target - position[i]) / speed[i]
        cars.append((position[i], time))
    
    # Sort by position (rightmost first)
    cars.sort(reverse=True)
    
    fleets = 0
    prev_time = 0
    
    # Process cars from right to left
    for pos, time in cars:
        # If current car takes longer than previous,
        # it forms a new fleet
        if time > prev_time:
            fleets += 1
            prev_time = time
    
    return fleets

# Time Complexity: O(n log n)
# Space Complexity: O(n)`;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background }}>
      {/* Phase indicator */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 40,
          fontSize: 16,
          fontWeight: 'bold',
          color: theme.accent,
          backgroundColor: theme.codeBlock,
          padding: '8px 16px',
          borderRadius: 8,
          border: `2px solid ${theme.carBorder}`,
        }}
      >
        Phase {currentPhaseIndex + 1}/6: {currentPhase.title}
      </div>

      {/* Phase progress bar */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 40,
          width: 200,
          height: 20,
          backgroundColor: theme.codeBlock,
          border: `2px solid ${theme.carBorder}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${(phaseProgress * 100)}%`,
            height: '100%',
            backgroundColor: theme.target,
            transition: 'width 0.1s ease',
          }}
        />
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 28,
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif',
          color: theme.text,
          textAlign: 'center',
          textShadow: themeName === 'cyberpunk' ? `0 0 20px ${theme.accent}` : 'none',
        }}
      >
        {title}
      </div>

      {/* Phase description */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 18,
          color: theme.text,
          textAlign: 'center',
          maxWidth: 800,
          lineHeight: 1.5,
          backgroundColor: theme.codeBlock,
          padding: '12px 24px',
          borderRadius: 12,
          border: `2px solid ${theme.carBorder}`,
        }}
      >
        {currentPhase.description}
      </div>

      {/* Road and cars */}
      <Road
        width={width}
        roadY={roadY}
        target={target}
        scale={roadScale}
        theme={theme}
      />

      {/* Cars */}
      {cars.map((car, index) => {
        const currentPosition = getCurrentPosition(carsWithTimes[index]);
        const fleetIndex = fleets.findIndex(f => f.cars.some(c => c.id === car.id));
        const fleet = fleets[fleetIndex];
        const isLeader = fleet && fleet.cars[0].id === car.id;
        
        return (
          <Car
            key={car.id}
            car={car}
            currentPosition={currentPosition}
            fleetId={fleetIndex}
            theme={theme}
            roadY={roadY}
            scale={roadScale}
            isLeader={isLeader || false}
          />
        );
      })}

      {/* Distance markers */}
      {Array.from({ length: target + 1 }, (_, i) => i).filter(i => i % 2 === 0).map(distance => (
        <div
          key={distance}
          style={{
            position: 'absolute',
            left: distance * roadScale,
            top: roadY + 40,
            fontSize: 12,
            color: theme.accent,
            textAlign: 'center',
            transform: 'translateX(-50%)',
          }}
        >
          {distance}
        </div>
      ))}

      {/* Calculations panel - only show in appropriate phases */}
      {showCalculations && currentPhase.showElements.calculations && (
        <div
          style={{
            position: 'absolute',
            top: 160,
            right: 40,
            backgroundColor: theme.codeBlock,
            border: `2px solid ${theme.carBorder}`,
            borderRadius: 12,
            padding: 16,
            fontFamily: 'monospace',
            fontSize: 12,
            color: theme.text,
            minWidth: 280,
            maxHeight: 350,
            overflow: 'auto',
          }}
        >
          {currentPhaseIndex >= 1 && (
            <>
              <div style={{ fontWeight: 'bold', marginBottom: 8, color: theme.calculation }}>
                Step 1: Calculate Arrival Times
              </div>
              {carsWithTimes
                .sort((a, b) => b.position - a.position)
                .map(car => (
                <div key={car.id} style={{ marginBottom: 6, fontSize: 11 }}>
                  <div style={{ color: theme.fleet[fleets.findIndex(f => f.cars.some(c => c.id === car.id)) % theme.fleet.length] }}>
                    Car {car.id}: ({target} - {car.position}) ÷ {car.speed} = {car.arrivalTime.toFixed(1)}s
                  </div>
                </div>
              ))}
            </>
          )}
          
          {currentPhaseIndex >= 2 && (
            <>
              <div style={{ marginTop: 12, fontWeight: 'bold', color: theme.calculation }}>
                Step 2: Sort by Position (Right to Left)
              </div>
              <div style={{ fontSize: 11, color: theme.accent }}>
                Process order: {sortedCars.map(c => `Car ${c.id}`).join(' → ')}
              </div>
            </>
          )}
          
          {currentPhaseIndex >= 3 && currentPhase.showElements.fleets && (
            <>
              <div style={{ marginTop: 12, fontWeight: 'bold', color: theme.calculation }}>
                Step 3: Fleet Formation
              </div>
              {fleets.map((fleet, index) => (
                <div key={index} style={{ marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: theme.fleet[index % theme.fleet.length] }}>
                    Fleet {index + 1}: Cars [{fleet.cars.map(c => c.id).join(', ')}]
                  </span>
                  <div style={{ fontSize: 10, color: theme.accent, marginLeft: 8 }}>
                    Arrival: {fleet.arrivalTime.toFixed(1)}s
                  </div>
                </div>
              ))}
              
              <div style={{ marginTop: 12, fontWeight: 'bold', fontSize: 14, color: theme.target }}>
                Final Answer: {fleets.length} fleets
              </div>
            </>
          )}
        </div>
      )}

      {/* Code block */}
      {showCode && (
        <div
          style={{
            position: 'absolute',
            left: 40,
            bottom: 40,
            backgroundColor: theme.codeBlock,
            border: `2px solid ${theme.carBorder}`,
            borderRadius: 12,
            padding: 16,
            fontFamily: 'monospace',
            fontSize: 10,
            lineHeight: 1.3,
            color: theme.text,
            maxWidth: 400,
            maxHeight: 350,
            overflow: 'hidden',
          }}
        >
          {getAlgorithmCode().split('\n').map((line, index) => (
            <div key={index} style={{ margin: '1px 0' }}>
              <span style={{ color: theme.accent, marginRight: 4 }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Phase progress indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 14,
          color: theme.accent,
          fontFamily: 'monospace',
          backgroundColor: theme.codeBlock,
          padding: '8px 16px',
          borderRadius: 8,
        }}
      >
        Phase {currentPhaseIndex + 1}/6 - Progress: {Math.round(phaseProgress * 100)}%
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          top: 120,
          left: 40,
          backgroundColor: theme.codeBlock,
          border: `2px solid ${theme.carBorder}`,
          borderRadius: 12,
          padding: 16,
          fontFamily: 'Arial, sans-serif',
          fontSize: 12,
          color: theme.text,
          minWidth: 200,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Legend:</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ 
            width: 20, 
            height: 12, 
            backgroundColor: theme.car, 
            marginRight: 8,
            borderRadius: 2,
          }} />
          Individual Car
        </div>
        {fleets.slice(0, 3).map((_, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ 
              width: 20, 
              height: 12, 
              backgroundColor: theme.fleet[index], 
              marginRight: 8,
              borderRadius: 2,
            }} />
            Fleet {index + 1}
          </div>
        ))}
        <div style={{ marginTop: 8, fontSize: 10, color: theme.accent }}>
          • Cars catch up to slower cars ahead<br/>
          • Fleets move at slowest car's speed<br/>
          • Count final number of fleets
        </div>
      </div>
    </AbsoluteFill>
  );
};
