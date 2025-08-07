import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { z } from 'zod';

export const stackQueueVisualizationSchema = z.object({
  dataStructure: z.enum(['stack', 'queue']).default('stack'),
  operations: z.array(z.object({
    type: z.enum(['push', 'pop', 'enqueue', 'dequeue']),
    value: z.number().optional(),
  })).default([
    { type: 'push', value: 10 },
    { type: 'push', value: 20 },
    { type: 'push', value: 30 },
    { type: 'pop' },
    { type: 'push', value: 40 },
    { type: 'pop' },
  ]),
  title: z.string().default('Stack & Queue Visualization'),
  theme: z.enum(['light', 'dark', 'cyberpunk', 'nature']).default('light'),
  speed: z.number().min(0.5).max(3).default(1),
  showCode: z.boolean().default(true),
  maxSize: z.number().min(5).max(15).default(8),
});

interface ThemeColors {
  background: string;
  text: string;
  container: string;
  containerBorder: string;
  element: string;
  elementBorder: string;
  highlight: string;
  accent: string;
  codeBlock: string;
  arrow: string;
}

const getStackQueueTheme = (theme: string): ThemeColors => {
  switch (theme) {
    case 'dark':
      return {
        background: '#1a1a1a',
        text: '#ffffff',
        container: '#333333',
        containerBorder: '#666666',
        element: '#4a4a4a',
        elementBorder: '#888888',
        highlight: '#ff4a4a',
        accent: '#888888',
        codeBlock: '#2a2a2a',
        arrow: '#4a9eff',
      };
    case 'cyberpunk':
      return {
        background: '#0a0a0a',
        text: '#00ffff',
        container: '#1a0033',
        containerBorder: '#ff00ff',
        element: '#330066',
        elementBorder: '#ff00ff',
        highlight: '#ff0080',
        accent: '#ff00ff',
        codeBlock: '#1a1a2e',
        arrow: '#00ffff',
      };
    case 'nature':
      return {
        background: '#f0f8f0',
        text: '#2d5016',
        container: '#e8f5e8',
        containerBorder: '#4a7c59',
        element: '#d4edda',
        elementBorder: '#4a7c59',
        highlight: '#ff5722',
        accent: '#388e3c',
        codeBlock: '#e0f2e0',
        arrow: '#2196f3',
      };
    default: // light
      return {
        background: '#ffffff',
        text: '#000000',
        container: '#f8f9fa',
        containerBorder: '#000000',
        element: '#ffffff',
        elementBorder: '#000000',
        highlight: '#ff4444',
        accent: '#666666',
        codeBlock: '#f8f8f8',
        arrow: '#4444ff',
      };
  }
};

interface StackElementProps {
  value: number;
  index: number;
  isHighlighted: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  theme: ThemeColors;
}

const StackElement: React.FC<StackElementProps> = ({
  value,
  index,
  isHighlighted,
  x,
  y,
  width,
  height,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = isHighlighted ? spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
    from: 1,
    to: 1.1,
  }) : 1;

  const glowIntensity = isHighlighted ? Math.sin(frame * 0.4) * 0.5 + 0.5 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        backgroundColor: isHighlighted ? theme.highlight : theme.element,
        border: `3px solid ${theme.elementBorder}`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: theme.text,
        transform: `scale(${scale})`,
        boxShadow: glowIntensity > 0 ? 
          `0 0 ${15 * glowIntensity}px ${theme.highlight}` : 
          '0 2px 8px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s ease',
        zIndex: 10,
      }}
    >
      {value}
      <div
        style={{
          position: 'absolute',
          right: -30,
          fontSize: 14,
          color: theme.accent,
          fontFamily: 'monospace',
        }}
      >
        [{index}]
      </div>
    </div>
  );
};

interface QueueElementProps {
  value: number;
  index: number;
  isHighlighted: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  theme: ThemeColors;
}

const QueueElement: React.FC<QueueElementProps> = ({
  value,
  index,
  isHighlighted,
  x,
  y,
  width,
  height,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = isHighlighted ? spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
    from: 1,
    to: 1.1,
  }) : 1;

  const glowIntensity = isHighlighted ? Math.sin(frame * 0.4) * 0.5 + 0.5 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        backgroundColor: isHighlighted ? theme.highlight : theme.element,
        border: `3px solid ${theme.elementBorder}`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: theme.text,
        transform: `scale(${scale})`,
        boxShadow: glowIntensity > 0 ? 
          `0 0 ${15 * glowIntensity}px ${theme.highlight}` : 
          '0 2px 8px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s ease',
        zIndex: 10,
      }}
    >
      {value}
      <div
        style={{
          position: 'absolute',
          bottom: -25,
          fontSize: 12,
          color: theme.accent,
          fontFamily: 'monospace',
        }}
      >
        [{index}]
      </div>
    </div>
  );
};

export const StackQueueVisualization: React.FC<z.infer<typeof stackQueueVisualizationSchema>> = ({
  dataStructure,
  operations,
  title,
  theme: themeName,
  speed,
  showCode,
  maxSize,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const theme = getStackQueueTheme(themeName);
  const animationFrame = Math.floor(frame * speed);

  // Simulate operations
  const getDataStructureState = () => {
    const data: number[] = [];
    const step = Math.floor(animationFrame / 60);
    let currentOperation: { type: string; value?: number } | null = null;
    let highlightedIndex = -1;

    for (let i = 0; i < Math.min(step, operations.length); i++) {
      const op = operations[i];
      
      if (dataStructure === 'stack') {
        if (op.type === 'push' && op.value !== undefined && data.length < maxSize) {
          data.push(op.value);
        } else if (op.type === 'pop' && data.length > 0) {
          data.pop();
        }
      } else { // queue
        if (op.type === 'enqueue' && op.value !== undefined && data.length < maxSize) {
          data.push(op.value);
        } else if (op.type === 'dequeue' && data.length > 0) {
          data.shift();
        }
      }
    }

    if (step < operations.length) {
      currentOperation = operations[step];
      if (dataStructure === 'stack') {
        highlightedIndex = currentOperation.type === 'push' ? data.length - 1 : data.length;
      } else {
        highlightedIndex = currentOperation.type === 'enqueue' ? data.length - 1 : 0;
      }
    }

    return { data, currentOperation, highlightedIndex };
  };

  const state = getDataStructureState();

  const getAlgorithmCode = () => {
    if (dataStructure === 'stack') {
      return `class Stack {
  constructor() {
    this.items = [];
  }
  
  push(element) {
    this.items.push(element);
  }
  
  pop() {
    if (this.isEmpty()) return null;
    return this.items.pop();
  }
  
  peek() {
    return this.items[this.items.length - 1];
  }
  
  isEmpty() {
    return this.items.length === 0;
  }
  
  size() {
    return this.items.length;
  }
}`;
    } else {
      return `class Queue {
  constructor() {
    this.items = [];
  }
  
  enqueue(element) {
    this.items.push(element);
  }
  
  dequeue() {
    if (this.isEmpty()) return null;
    return this.items.shift();
  }
  
  front() {
    return this.items[0];
  }
  
  isEmpty() {
    return this.items.length === 0;
  }
  
  size() {
    return this.items.length;
  }
}`;
    }
  };

  const containerWidth = dataStructure === 'stack' ? 120 : Math.max(400, state.data.length * 80);
  const containerHeight = dataStructure === 'stack' ? maxSize * 60 + 40 : 100;
  const containerX = width / 2 - containerWidth / 2;
  const containerY = height / 2 - containerHeight / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background }}>
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 36,
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif',
          color: theme.text,
          textAlign: 'center',
          textShadow: themeName === 'cyberpunk' ? `0 0 20px ${theme.accent}` : 'none',
        }}
      >
        {title}
      </div>

      {/* Data structure type */}
      <div
        style={{
          position: 'absolute',
          top: 90,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 24,
          fontFamily: 'monospace',
          color: theme.accent,
          textAlign: 'center',
        }}
      >
        {dataStructure.toUpperCase()} - {dataStructure === 'stack' ? 'LIFO' : 'FIFO'}
      </div>

      {/* Container */}
      <div
        style={{
          position: 'absolute',
          left: containerX,
          top: containerY,
          width: containerWidth,
          height: containerHeight,
          backgroundColor: theme.container,
          border: `3px solid ${theme.containerBorder}`,
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        }}
      />

      {/* Stack elements */}
      {dataStructure === 'stack' && state.data.map((value, index) => (
        <StackElement
          key={`${index}-${value}`}
          value={value}
          index={index}
          isHighlighted={index === state.highlightedIndex}
          x={containerX + 10}
          y={containerY + containerHeight - (index + 1) * 60 - 10}
          width={100}
          height={50}
          theme={theme}
        />
      ))}

      {/* Queue elements */}
      {dataStructure === 'queue' && state.data.map((value, index) => (
        <QueueElement
          key={`${index}-${value}`}
          value={value}
          index={index}
          isHighlighted={index === state.highlightedIndex}
          x={containerX + 20 + index * 70}
          y={containerY + 25}
          width={60}
          height={50}
          theme={theme}
        />
      ))}

      {/* Pointers for queue */}
      {dataStructure === 'queue' && state.data.length > 0 && (
        <>
          {/* Front pointer */}
          <div
            style={{
              position: 'absolute',
              left: containerX + 20,
              top: containerY - 40,
              fontSize: 16,
              fontWeight: 'bold',
              color: theme.arrow,
              fontFamily: 'monospace',
            }}
          >
            FRONT
          </div>
          <div
            style={{
              position: 'absolute',
              left: containerX + 35,
              top: containerY - 20,
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: `12px solid ${theme.arrow}`,
            }}
          />

          {/* Rear pointer */}
          <div
            style={{
              position: 'absolute',
              left: containerX + 20 + (state.data.length - 1) * 70,
              top: containerY + containerHeight + 10,
              fontSize: 16,
              fontWeight: 'bold',
              color: theme.arrow,
              fontFamily: 'monospace',
            }}
          >
            REAR
          </div>
          <div
            style={{
              position: 'absolute',
              left: containerX + 35 + (state.data.length - 1) * 70,
              top: containerY + containerHeight,
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: `12px solid ${theme.arrow}`,
            }}
          />
        </>
      )}

      {/* Stack pointer */}
      {dataStructure === 'stack' && state.data.length > 0 && (
        <>
          <div
            style={{
              position: 'absolute',
              left: containerX + containerWidth + 20,
              top: containerY + containerHeight - state.data.length * 60 + 15,
              fontSize: 16,
              fontWeight: 'bold',
              color: theme.arrow,
              fontFamily: 'monospace',
            }}
          >
            TOP
          </div>
          <div
            style={{
              position: 'absolute',
              left: containerX + containerWidth + 10,
              top: containerY + containerHeight - state.data.length * 60 + 20,
              width: 0,
              height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: `12px solid ${theme.arrow}`,
            }}
          />
        </>
      )}

      {/* Code block */}
      {showCode && (
        <div
          style={{
            position: 'absolute',
            left: 40,
            bottom: 40,
            backgroundColor: theme.codeBlock,
            border: `2px solid ${theme.containerBorder}`,
            borderRadius: 12,
            padding: 20,
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.4,
            color: theme.text,
            maxWidth: 300,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          }}
        >
          {getAlgorithmCode().split('\n').map((line, index) => (
            <div key={index} style={{ margin: '1px 0' }}>
              <span style={{ color: theme.accent, marginRight: 6 }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Status panel */}
      <div
        style={{
          position: 'absolute',
          top: 140,
          right: 40,
          backgroundColor: theme.codeBlock,
          border: `2px solid ${theme.containerBorder}`,
          borderRadius: 12,
          padding: 16,
          fontFamily: 'monospace',
          fontSize: 14,
          color: theme.text,
          minWidth: 200,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Status:</div>
        <div>Size: {state.data.length}/{maxSize}</div>
        <div>Current Op: {state.currentOperation?.type || 'None'}</div>
        {state.currentOperation?.value && (
          <div>Value: {state.currentOperation.value}</div>
        )}
        <div>Empty: {state.data.length === 0 ? 'Yes' : 'No'}</div>
        <div>Full: {state.data.length === maxSize ? 'Yes' : 'No'}</div>
        
        <div style={{ marginTop: 12, fontWeight: 'bold' }}>Contents:</div>
        <div style={{ fontSize: 12, color: theme.accent }}>
          [{state.data.join(', ')}]
        </div>
      </div>

      {/* Operation sequence */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          backgroundColor: theme.codeBlock,
          border: `2px solid ${theme.containerBorder}`,
          borderRadius: 12,
          padding: 16,
          fontFamily: 'monospace',
          fontSize: 12,
          color: theme.text,
          maxWidth: 250,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Operations:</div>
        {operations.slice(0, Math.floor(animationFrame / 60) + 1).map((op, index) => (
          <div
            key={index}
            style={{
              color: index === Math.floor(animationFrame / 60) ? theme.highlight : theme.accent,
              fontWeight: index === Math.floor(animationFrame / 60) ? 'bold' : 'normal',
            }}
          >
            {index + 1}. {op.type}{op.value ? `(${op.value})` : '()'}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
