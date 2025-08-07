import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { z } from 'zod';

export const arrayVisualizationSchema = z.object({
  array: z.array(z.number()).default([3, 7, 1, 9, 4, 6, 8, 2, 5]),
  title: z.string().default('Array Visualization'),
  algorithm: z.enum(['bubble-sort', 'binary-search', 'two-pointers', 'sliding-window']).default('bubble-sort'),
  speed: z.number().min(0.5).max(3).default(1),
});

interface ArrayElementProps {
  value: number;
  index: number;
  isHighlighted?: boolean;
  isComparing?: boolean;
  isSwapping?: boolean;
  isSorted?: boolean;
  x: number;
  y: number;
  size: number;
}

const ArrayElement: React.FC<ArrayElementProps> = ({
  value,
  index,
  isHighlighted = false,
  isComparing = false,
  isSwapping = false,
  isSorted = false,
  x,
  y,
  size,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation for swapping
  const swapOffset = isSwapping ? spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
    from: 0,
    to: 20,
  }) : 0;

  // Pulse animation for highlighting
  const pulseScale = isHighlighted ? 
    1 + Math.sin(frame * 0.3) * 0.1 : 1;

  const elementStyle = {
    position: 'absolute' as const,
    left: x,
    top: y - swapOffset,
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.4,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    transform: `scale(${pulseScale})`,
    transition: 'all 0.3s ease',
  };

  // Color scheme based on state
  const getColors = () => {
    if (isSorted) return { bg: '#000', text: '#fff', border: '#000' };
    if (isSwapping) return { bg: '#ff4444', text: '#fff', border: '#cc0000' };
    if (isComparing) return { bg: '#4444ff', text: '#fff', border: '#0000cc' };
    if (isHighlighted) return { bg: '#ffff44', text: '#000', border: '#cccc00' };
    return { bg: '#fff', text: '#000', border: '#000' };
  };

  const colors = getColors();

  return (
    <div
      style={{
        ...elementStyle,
        backgroundColor: colors.bg,
        color: colors.text,
        border: `3px solid ${colors.border}`,
        borderRadius: 8,
        boxShadow: isHighlighted ? '0 0 20px rgba(255, 255, 68, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div>{value}</div>
      <div
        style={{
          position: 'absolute',
          bottom: -30,
          fontSize: size * 0.25,
          color: '#666',
          fontFamily: 'monospace',
        }}
      >
        [{index}]
      </div>
    </div>
  );
};

interface PointerProps {
  x: number;
  y: number;
  label: string;
  color: string;
}

const Pointer: React.FC<PointerProps> = ({ x, y, label, color }) => {
  const frame = useCurrentFrame();
  const bounce = Math.sin(frame * 0.2) * 3;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y - 60 + bounce,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'monospace',
        fontWeight: 'bold',
      }}
    >
      <div
        style={{
          backgroundColor: color,
          color: '#fff',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 14,
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: `12px solid ${color}`,
        }}
      />
    </div>
  );
};

interface CodeBlockProps {
  code: string;
  highlightedLine?: number;
  x: number;
  y: number;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, highlightedLine, x, y }) => {
  const lines = code.split('\n');

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        backgroundColor: '#f8f8f8',
        border: '2px solid #000',
        borderRadius: 8,
        padding: 20,
        fontFamily: 'monospace',
        fontSize: 14,
        lineHeight: 1.5,
        minWidth: 300,
      }}
    >
      {lines.map((line, index) => (
        <div
          key={index}
          style={{
            backgroundColor: highlightedLine === index ? '#ffff88' : 'transparent',
            padding: '2px 4px',
            borderRadius: 4,
            margin: '1px 0',
          }}
        >
          <span style={{ color: '#666', marginRight: 10 }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          {line}
        </div>
      ))}
    </div>
  );
};

export const ArrayVisualization: React.FC<z.infer<typeof arrayVisualizationSchema>> = ({
  array,
  title,
  algorithm,
  speed,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Animation timing
  const animationFrame = Math.floor(frame * speed);
  const elementSize = 80;
  const spacing = 100;
  const startX = (width - (array.length * spacing)) / 2;
  const arrayY = height / 2;

  // Algorithm-specific logic
  const getBubbleSortState = (): { comparing: number[]; swapping: number[]; sorted: number[] } => {
    const step = Math.floor(animationFrame / 30);
    const subStep = animationFrame % 30;
    const i = Math.floor(step / array.length);
    const j = step % array.length;

    if (i >= array.length - 1) {
      return { comparing: [], swapping: [], sorted: array.map((_, idx) => idx) };
    }

    if (j >= array.length - 1 - i) {
      return { comparing: [], swapping: [], sorted: [] };
    }

    const comparing = [j, j + 1];
    const swapping = subStep > 15 && array[j] > array[j + 1] ? [j, j + 1] : [];

    return { comparing, swapping, sorted: [] };
  };

  const getBinarySearchState = (): { comparing: number[]; swapping: number[]; sorted: number[]; pointers: Array<{ index: number; label: string; color: string }> } => {
    const target = array[Math.floor(array.length / 2)];
    const step = Math.floor(animationFrame / 60);
    let left = 0;
    let right = array.length - 1;

    for (let i = 0; i < step && left <= right; i++) {
      const mid = Math.floor((left + right) / 2);
      if (array[mid] === target) break;
      if (array[mid] < target) left = mid + 1;
      else right = mid - 1;
    }

    const mid = Math.floor((left + right) / 2);
    return {
      comparing: left <= right ? [left, right, mid] : [],
      swapping: [],
      sorted: [],
      pointers: [
        { index: left, label: 'L', color: '#ff4444' },
        { index: right, label: 'R', color: '#4444ff' },
        { index: mid, label: 'M', color: '#44ff44' },
      ],
    };
  };

  const getAlgorithmState = (): { comparing: number[]; swapping: number[]; sorted: number[]; pointers: Array<{ index: number; label: string; color: string }> } => {
    switch (algorithm) {
      case 'bubble-sort':
        return { ...getBubbleSortState(), pointers: [] };
      case 'binary-search':
        return getBinarySearchState();
      default:
        return { comparing: [], swapping: [], sorted: [], pointers: [] };
    }
  };

  const state = getAlgorithmState();

  const getAlgorithmCode = () => {
    switch (algorithm) {
      case 'bubble-sort':
        return `function bubbleSort(arr) {
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = 0; j < arr.length - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        // Swap elements
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}`;
      case 'binary-search':
        return `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  
  return -1;
}`;
      default:
        return '';
    }
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#fff' }}>
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 36,
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif',
          color: '#000',
          textAlign: 'center',
        }}
      >
        {title}
      </div>

      {/* Algorithm name */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 24,
          fontFamily: 'monospace',
          color: '#666',
          textAlign: 'center',
        }}
      >
        {algorithm.replace('-', ' ').toUpperCase()}
      </div>

      {/* Array elements */}
      {array.map((value, index) => (
        <ArrayElement
          key={index}
          value={value}
          index={index}
          isComparing={state.comparing.includes(index)}
          isSwapping={state.swapping.includes(index)}
          isSorted={state.sorted.includes(index)}
          x={startX + index * spacing}
          y={arrayY}
          size={elementSize}
        />
      ))}

      {/* Pointers */}
      {state.pointers?.map((pointer, index) => (
        <Pointer
          key={index}
          x={startX + pointer.index * spacing + elementSize / 2 - 20}
          y={arrayY}
          label={pointer.label}
          color={pointer.color}
        />
      ))}

      {/* Code block */}
      <CodeBlock
        code={getAlgorithmCode()}
        x={50}
        y={height - 300}
      />

      {/* Step counter */}
      <div
        style={{
          position: 'absolute',
          top: 150,
          right: 50,
          fontSize: 18,
          fontFamily: 'monospace',
          color: '#000',
          backgroundColor: '#f0f0f0',
          padding: '10px 20px',
          borderRadius: 8,
          border: '2px solid #000',
        }}
      >
        Step: {animationFrame}
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          right: 50,
          fontSize: 14,
          fontFamily: 'Arial, sans-serif',
          color: '#000',
        }}
      >
        <div style={{ marginBottom: 10, fontWeight: 'bold' }}>Legend:</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
          <div style={{ width: 20, height: 20, backgroundColor: '#4444ff', marginRight: 10, border: '1px solid #000' }} />
          Comparing
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
          <div style={{ width: 20, height: 20, backgroundColor: '#ff4444', marginRight: 10, border: '1px solid #000' }} />
          Swapping
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
          <div style={{ width: 20, height: 20, backgroundColor: '#000', marginRight: 10, border: '1px solid #000' }} />
          Sorted
        </div>
      </div>
    </AbsoluteFill>
  );
};
