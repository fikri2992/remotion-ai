import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { z } from 'zod';

export const arrayVisualizationEnhancedSchema = z.object({
  array: z.array(z.number()).default([3, 7, 1, 9, 4, 6, 8, 2, 5]),
  title: z.string().default('Enhanced Array Visualization'),
  algorithm: z.enum(['bubble-sort', 'binary-search', 'two-pointers', 'sliding-window']).default('bubble-sort'),
  speed: z.number().min(0.5).max(3).default(1),
  theme: z.enum(['light', 'dark', 'cyberpunk', 'nature']).default('light'),
  showCode: z.boolean().default(true),
  showIndices: z.boolean().default(true),
  showLegend: z.boolean().default(true),
  elementSize: z.number().min(40).max(120).default(80),
  animationStyle: z.enum(['smooth', 'bouncy', 'elastic']).default('smooth'),
});

interface ThemeColors {
  background: string;
  text: string;
  elementBg: string;
  elementBorder: string;
  comparing: string;
  swapping: string;
  sorted: string;
  highlighted: string;
  codeBlock: string;
  accent: string;
}

const getTheme = (theme: string): ThemeColors => {
  switch (theme) {
    case 'dark':
      return {
        background: '#1a1a1a',
        text: '#ffffff',
        elementBg: '#333333',
        elementBorder: '#666666',
        comparing: '#4a9eff',
        swapping: '#ff4a4a',
        sorted: '#4aff4a',
        highlighted: '#ffff4a',
        codeBlock: '#2a2a2a',
        accent: '#888888',
      };
    case 'cyberpunk':
      return {
        background: '#0a0a0a',
        text: '#00ffff',
        elementBg: '#1a0033',
        elementBorder: '#ff00ff',
        comparing: '#00ffff',
        swapping: '#ff0080',
        sorted: '#80ff00',
        highlighted: '#ffff00',
        codeBlock: '#1a1a2e',
        accent: '#ff00ff',
      };
    case 'nature':
      return {
        background: '#f0f8f0',
        text: '#2d5016',
        elementBg: '#e8f5e8',
        elementBorder: '#4a7c59',
        comparing: '#2196f3',
        swapping: '#ff5722',
        sorted: '#4caf50',
        highlighted: '#ffc107',
        codeBlock: '#e0f2e0',
        accent: '#388e3c',
      };
    default: // light
      return {
        background: '#ffffff',
        text: '#000000',
        elementBg: '#ffffff',
        elementBorder: '#000000',
        comparing: '#4444ff',
        swapping: '#ff4444',
        sorted: '#000000',
        highlighted: '#ffff44',
        codeBlock: '#f8f8f8',
        accent: '#666666',
      };
  }
};

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
  theme: ThemeColors;
  animationStyle: string;
  showIndices: boolean;
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
  theme,
  animationStyle,
  showIndices,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Different animation configs based on style
  const getAnimationConfig = () => {
    switch (animationStyle) {
      case 'bouncy':
        return { damping: 8, stiffness: 150, mass: 1 };
      case 'elastic':
        return { damping: 6, stiffness: 200, mass: 0.8 };
      default:
        return { damping: 12, stiffness: 100, mass: 1 };
    }
  };

  const config = getAnimationConfig();

  // Enhanced animations
  const swapOffset = isSwapping ? spring({
    frame,
    fps,
    config,
    from: 0,
    to: 30,
  }) : 0;

  const pulseScale = isHighlighted ? 
    1 + Math.sin(frame * 0.4) * 0.15 : 1;

  const glowIntensity = (isComparing || isSwapping || isHighlighted) ?
    Math.sin(frame * 0.3) * 0.5 + 0.5 : 0;

  const elementStyle = {
    position: 'absolute' as const,
    left: x,
    top: y - swapOffset,
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.35,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    transform: `scale(${pulseScale})`,
    transition: 'all 0.3s ease',
    borderRadius: 12,
  };

  const getColors = () => {
    if (isSorted) return { bg: theme.sorted, text: theme.background, border: theme.sorted };
    if (isSwapping) return { bg: theme.swapping, text: theme.background, border: theme.swapping };
    if (isComparing) return { bg: theme.comparing, text: theme.background, border: theme.comparing };
    if (isHighlighted) return { bg: theme.highlighted, text: theme.background, border: theme.highlighted };
    return { bg: theme.elementBg, text: theme.text, border: theme.elementBorder };
  };

  const colors = getColors();

  return (
    <div
      style={{
        ...elementStyle,
        backgroundColor: colors.bg,
        color: colors.text,
        border: `3px solid ${colors.border}`,
        boxShadow: glowIntensity > 0 ? 
          `0 0 ${20 * glowIntensity}px ${colors.border}` : 
          '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div>{value}</div>
      {showIndices && (
        <div
          style={{
            position: 'absolute',
            bottom: -35,
            fontSize: size * 0.25,
            color: theme.accent,
            fontFamily: 'monospace',
          }}
        >
          [{index}]
        </div>
      )}
    </div>
  );
};

interface PointerProps {
  x: number;
  y: number;
  label: string;
  color: string;
  theme: ThemeColors;
}

const Pointer: React.FC<PointerProps> = ({ x, y, label, color, theme }) => {
  const frame = useCurrentFrame();
  const bounce = Math.sin(frame * 0.25) * 4;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y - 70 + bounce,
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
          color: theme.background,
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 16,
          marginBottom: 8,
          boxShadow: `0 0 15px ${color}`,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: `15px solid ${color}`,
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
  theme: ThemeColors;
  show: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, highlightedLine, x, y, theme, show }) => {
  const frame = useCurrentFrame();
  const opacity = show ? interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' }) : 0;
  
  if (!show) return null;

  const lines = code.split('\n');

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        backgroundColor: theme.codeBlock,
        border: `2px solid ${theme.elementBorder}`,
        borderRadius: 12,
        padding: 24,
        fontFamily: 'monospace',
        fontSize: 14,
        lineHeight: 1.6,
        minWidth: 350,
        opacity,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
      }}
    >
      {lines.map((line, index) => (
        <div
          key={index}
          style={{
            backgroundColor: highlightedLine === index ? theme.highlighted : 'transparent',
            color: highlightedLine === index ? theme.background : theme.text,
            padding: '4px 8px',
            borderRadius: 6,
            margin: '2px 0',
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ color: theme.accent, marginRight: 12 }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          {line}
        </div>
      ))}
    </div>
  );
};

export const ArrayVisualizationEnhanced: React.FC<z.infer<typeof arrayVisualizationEnhancedSchema>> = ({
  array,
  title,
  algorithm,
  speed,
  theme: themeName,
  showCode,
  showIndices,
  showLegend,
  elementSize,
  animationStyle,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const theme = getTheme(themeName);
  const animationFrame = Math.floor(frame * speed);
  const spacing = elementSize + 20;
  const startX = (width - (array.length * spacing)) / 2;
  const arrayY = height / 2;

  // Algorithm states (same logic as before but with proper typing)
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
        { index: left, label: 'L', color: theme.comparing },
        { index: right, label: 'R', color: theme.swapping },
        { index: mid, label: 'M', color: theme.sorted },
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
    <AbsoluteFill style={{ backgroundColor: theme.background }}>
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 42,
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif',
          color: theme.text,
          textAlign: 'center',
          textShadow: themeName === 'cyberpunk' ? `0 0 20px ${theme.accent}` : 'none',
        }}
      >
        {title}
      </div>

      {/* Algorithm name */}
      <div
        style={{
          position: 'absolute',
          top: 120,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 28,
          fontFamily: 'monospace',
          color: theme.accent,
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
          theme={theme}
          animationStyle={animationStyle}
          showIndices={showIndices}
        />
      ))}

      {/* Pointers */}
      {state.pointers?.map((pointer, index) => (
        <Pointer
          key={index}
          x={startX + pointer.index * spacing + elementSize / 2 - 25}
          y={arrayY}
          label={pointer.label}
          color={pointer.color}
          theme={theme}
        />
      ))}

      {/* Code block */}
      <CodeBlock
        code={getAlgorithmCode()}
        x={60}
        y={height - 320}
        theme={theme}
        show={showCode}
      />

      {/* Step counter */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          right: 60,
          fontSize: 20,
          fontFamily: 'monospace',
          color: theme.text,
          backgroundColor: theme.codeBlock,
          padding: '12px 24px',
          borderRadius: 12,
          border: `2px solid ${theme.elementBorder}`,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        Step: {animationFrame}
      </div>

      {/* Enhanced Legend */}
      {showLegend && (
        <div
          style={{
            position: 'absolute',
            top: 240,
            right: 60,
            fontSize: 16,
            fontFamily: 'Arial, sans-serif',
            color: theme.text,
            backgroundColor: theme.codeBlock,
            padding: '16px 20px',
            borderRadius: 12,
            border: `2px solid ${theme.elementBorder}`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div style={{ marginBottom: 12, fontWeight: 'bold', fontSize: 18 }}>Legend:</div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ 
              width: 24, 
              height: 24, 
              backgroundColor: theme.comparing, 
              marginRight: 12, 
              border: `2px solid ${theme.comparing}`,
              borderRadius: 4,
            }} />
            Comparing
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ 
              width: 24, 
              height: 24, 
              backgroundColor: theme.swapping, 
              marginRight: 12, 
              border: `2px solid ${theme.swapping}`,
              borderRadius: 4,
            }} />
            Swapping
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ 
              width: 24, 
              height: 24, 
              backgroundColor: theme.sorted, 
              marginRight: 12, 
              border: `2px solid ${theme.sorted}`,
              borderRadius: 4,
            }} />
            Sorted
          </div>
        </div>
      )}

      {/* Theme indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 60,
          fontSize: 14,
          fontFamily: 'monospace',
          color: theme.accent,
          opacity: 0.7,
        }}
      >
        Theme: {themeName.toUpperCase()}
      </div>
    </AbsoluteFill>
  );
};
