import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { z } from 'zod';

export const recursionVisualizationSchema = z.object({
  algorithm: z.enum(['factorial', 'fibonacci', 'hanoi', 'tree-traversal']).default('factorial'),
  input: z.number().min(1).max(8).default(5),
  title: z.string().default('Recursion Visualization'),
  theme: z.enum(['light', 'dark', 'cyberpunk', 'nature']).default('light'),
  speed: z.number().min(0.5).max(3).default(1),
  showCode: z.boolean().default(true),
  showCallStack: z.boolean().default(true),
});

interface ThemeColors {
  background: string;
  text: string;
  stackFrame: string;
  stackBorder: string;
  active: string;
  returning: string;
  completed: string;
  accent: string;
  codeBlock: string;
  arrow: string;
}

const getRecursionTheme = (theme: string): ThemeColors => {
  switch (theme) {
    case 'dark':
      return {
        background: '#1a1a1a',
        text: '#ffffff',
        stackFrame: '#333333',
        stackBorder: '#666666',
        active: '#ff4a4a',
        returning: '#4a9eff',
        completed: '#4aff4a',
        accent: '#888888',
        codeBlock: '#2a2a2a',
        arrow: '#4a9eff',
      };
    case 'cyberpunk':
      return {
        background: '#0a0a0a',
        text: '#00ffff',
        stackFrame: '#1a0033',
        stackBorder: '#ff00ff',
        active: '#ff0080',
        returning: '#00ffff',
        completed: '#80ff00',
        accent: '#ff00ff',
        codeBlock: '#1a1a2e',
        arrow: '#00ffff',
      };
    case 'nature':
      return {
        background: '#f0f8f0',
        text: '#2d5016',
        stackFrame: '#e8f5e8',
        stackBorder: '#4a7c59',
        active: '#ff5722',
        returning: '#2196f3',
        completed: '#4caf50',
        accent: '#388e3c',
        codeBlock: '#e0f2e0',
        arrow: '#2196f3',
      };
    default: // light
      return {
        background: '#ffffff',
        text: '#000000',
        stackFrame: '#f8f9fa',
        stackBorder: '#000000',
        active: '#ff4444',
        returning: '#4444ff',
        completed: '#44ff44',
        accent: '#666666',
        codeBlock: '#f8f8f8',
        arrow: '#4444ff',
      };
  }
};

interface StackFrameProps {
  call: string;
  result?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  theme: ThemeColors;
  state: 'active' | 'returning' | 'completed';
  depth: number;
}

const StackFrame: React.FC<StackFrameProps> = ({
  call,
  result,
  x,
  y,
  width,
  height,
  theme,
  state,
  depth,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = state === 'active' ? spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
    from: 1,
    to: 1.05,
  }) : 1;

  const glowIntensity = state === 'active' ? Math.sin(frame * 0.4) * 0.5 + 0.5 : 0;

  const getStateColor = () => {
    switch (state) {
      case 'active': return theme.active;
      case 'returning': return theme.returning;
      case 'completed': return theme.completed;
      default: return theme.stackFrame;
    }
  };

  const stateColor = getStateColor();

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        backgroundColor: stateColor,
        border: `3px solid ${theme.stackBorder}`,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: theme.text,
        transform: `scale(${scale})`,
        boxShadow: glowIntensity > 0 ? 
          `0 0 ${15 * glowIntensity}px ${stateColor}` : 
          '0 2px 8px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s ease',
        zIndex: 10 - depth,
      }}
    >
      <div>{call}</div>
      {result !== undefined && (
        <div style={{ fontSize: 12, color: theme.accent, marginTop: 4 }}>
          → {result}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: -20,
          fontSize: 10,
          color: theme.accent,
        }}
      >
        Depth: {depth}
      </div>
    </div>
  );
};

interface RecursionTreeNodeProps {
  call: string;
  result?: number;
  x: number;
  y: number;
  theme: ThemeColors;
  state: 'active' | 'returning' | 'completed';
  children?: React.ReactNode;
}

const RecursionTreeNode: React.FC<RecursionTreeNodeProps> = ({
  call,
  result,
  x,
  y,
  theme,
  state,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = state === 'active' ? spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
    from: 1,
    to: 1.2,
  }) : 1;

  const getStateColor = () => {
    switch (state) {
      case 'active': return theme.active;
      case 'returning': return theme.returning;
      case 'completed': return theme.completed;
      default: return theme.stackFrame;
    }
  };

  const stateColor = getStateColor();

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 40,
        top: y - 20,
        width: 80,
        height: 40,
        backgroundColor: stateColor,
        border: `2px solid ${theme.stackBorder}`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: theme.text,
        transform: `scale(${scale})`,
        zIndex: 10,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div>{call}</div>
        {result !== undefined && (
          <div style={{ fontSize: 10 }}>→{result}</div>
        )}
      </div>
      {children}
    </div>
  );
};

export const RecursionVisualization: React.FC<z.infer<typeof recursionVisualizationSchema>> = ({
  algorithm,
  input,
  title,
  theme: themeName,
  speed,
  showCode,
  showCallStack,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const theme = getRecursionTheme(themeName);
  const animationFrame = Math.floor(frame * speed);

  // Generate recursion calls based on algorithm
  const generateCalls = () => {
    const calls: Array<{ call: string; depth: number; result?: number; state: 'active' | 'returning' | 'completed' }> = [];

    if (algorithm === 'factorial') {
      const factorial = (n: number, depth: number = 0): number => {
        calls.push({ call: `factorial(${n})`, depth, state: 'active' });
        if (n <= 1) {
          calls[calls.length - 1].result = 1;
          calls[calls.length - 1].state = 'completed';
          return 1;
        }
        const result = n * factorial(n - 1, depth + 1);
        calls[calls.length - depth - 1].result = result;
        calls[calls.length - depth - 1].state = 'completed';
        return result;
      };
      factorial(input);
    } else if (algorithm === 'fibonacci') {
      const fibonacci = (n: number, depth: number = 0): number => {
        calls.push({ call: `fib(${n})`, depth, state: 'active' });
        if (n <= 1) {
          calls[calls.length - 1].result = n;
          calls[calls.length - 1].state = 'completed';
          return n;
        }
        const result = fibonacci(n - 1, depth + 1) + fibonacci(n - 2, depth + 1);
        calls[calls.length - 1].result = result;
        calls[calls.length - 1].state = 'completed';
        return result;
      };
      fibonacci(Math.min(input, 6)); // Limit to prevent too many calls
    }

    return calls;
  };

  const allCalls = generateCalls();
  const step = Math.floor(animationFrame / 30);
  const visibleCalls = allCalls.slice(0, step + 1);

  // Update states based on animation progress
  const currentCalls = visibleCalls.map((call, index) => {
    if (index === visibleCalls.length - 1 && step < allCalls.length - 1) {
      return { ...call, state: 'active' as const };
    } else if (call.result !== undefined) {
      return { ...call, state: 'completed' as const };
    } else {
      return { ...call, state: 'returning' as const };
    }
  });

  const getAlgorithmCode = () => {
    switch (algorithm) {
      case 'factorial':
        return `function factorial(n) {
  // Base case
  if (n <= 1) {
    return 1;
  }
  
  // Recursive case
  return n * factorial(n - 1);
}

// Example: factorial(5)
// = 5 * factorial(4)
// = 5 * 4 * factorial(3)
// = 5 * 4 * 3 * factorial(2)
// = 5 * 4 * 3 * 2 * factorial(1)
// = 5 * 4 * 3 * 2 * 1
// = 120`;
      case 'fibonacci':
        return `function fibonacci(n) {
  // Base cases
  if (n <= 1) {
    return n;
  }
  
  // Recursive case
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Example: fibonacci(5)
// = fibonacci(4) + fibonacci(3)
// = (fibonacci(3) + fibonacci(2)) + 
//   (fibonacci(2) + fibonacci(1))
// = ((fibonacci(2) + fibonacci(1)) + 
//    (fibonacci(1) + fibonacci(0))) + 
//   ((fibonacci(1) + fibonacci(0)) + 1)
// = 5`;
      default:
        return '';
    }
  };

  const stackStartX = showCallStack ? 50 : width / 2 - 200;
  const stackStartY = 150;
  const frameHeight = 60;
  const frameSpacing = 70;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background }}>
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 32,
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif',
          color: theme.text,
          textAlign: 'center',
          textShadow: themeName === 'cyberpunk' ? `0 0 20px ${theme.accent}` : 'none',
        }}
      >
        {title}
      </div>

      {/* Algorithm and input */}
      <div
        style={{
          position: 'absolute',
          top: 75,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 20,
          fontFamily: 'monospace',
          color: theme.accent,
          textAlign: 'center',
        }}
      >
        {algorithm.toUpperCase()}({input})
      </div>

      {/* Call stack visualization */}
      {showCallStack && (
        <div
          style={{
            position: 'absolute',
            left: stackStartX - 10,
            top: stackStartY - 30,
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.text,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          Call Stack:
        </div>
      )}

      {showCallStack && currentCalls.map((call, index) => (
        <StackFrame
          key={`${call.call}-${index}`}
          call={call.call}
          result={call.result}
          x={stackStartX}
          y={stackStartY + index * frameSpacing}
          width={200}
          height={frameHeight}
          theme={theme}
          state={call.state}
          depth={call.depth}
        />
      ))}

      {/* Recursion tree visualization */}
      {algorithm === 'fibonacci' && !showCallStack && (
        <div
          style={{
            position: 'absolute',
            left: width / 2 - 200,
            top: 150,
            width: 400,
            height: 300,
          }}
        >
          {/* This would be a more complex tree structure for fibonacci */}
          <RecursionTreeNode
            call={`fib(${input})`}
            x={200}
            y={50}
            theme={theme}
            state={step > 0 ? 'active' : 'completed'}
          />
          {input > 1 && step > 1 && (
            <>
              <RecursionTreeNode
                call={`fib(${input - 1})`}
                x={120}
                y={120}
                theme={theme}
                state={step > 2 ? 'returning' : 'active'}
              />
              <RecursionTreeNode
                call={`fib(${input - 2})`}
                x={280}
                y={120}
                theme={theme}
                state={step > 3 ? 'returning' : 'active'}
              />
            </>
          )}
        </div>
      )}

      {/* Code block */}
      {showCode && (
        <div
          style={{
            position: 'absolute',
            left: showCallStack ? 300 : 40,
            bottom: 40,
            backgroundColor: theme.codeBlock,
            border: `2px solid ${theme.stackBorder}`,
            borderRadius: 12,
            padding: 20,
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.4,
            color: theme.text,
            maxWidth: 400,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          }}
        >
          {getAlgorithmCode().split('\n').map((line, index) => (
            <div key={index} style={{ margin: '2px 0' }}>
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
          top: 120,
          right: 40,
          backgroundColor: theme.codeBlock,
          border: `2px solid ${theme.stackBorder}`,
          borderRadius: 12,
          padding: 16,
          fontFamily: 'monospace',
          fontSize: 14,
          color: theme.text,
          minWidth: 200,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Recursion Status:</div>
        <div>Input: {input}</div>
        <div>Current Calls: {currentCalls.length}</div>
        <div>Max Depth: {Math.max(...currentCalls.map(c => c.depth), 0)}</div>
        <div>Step: {step}</div>
        
        <div style={{ marginTop: 12, fontWeight: 'bold' }}>Legend:</div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
          <div style={{ 
            width: 16, 
            height: 16, 
            backgroundColor: theme.active, 
            marginRight: 8,
            borderRadius: 2,
          }} />
          Active Call
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
          <div style={{ 
            width: 16, 
            height: 16, 
            backgroundColor: theme.returning, 
            marginRight: 8,
            borderRadius: 2,
          }} />
          Returning
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
          <div style={{ 
            width: 16, 
            height: 16, 
            backgroundColor: theme.completed, 
            marginRight: 8,
            borderRadius: 2,
          }} />
          Completed
        </div>
      </div>

      {/* Final result */}
      {currentCalls.length > 0 && currentCalls[0].result !== undefined && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 40,
            backgroundColor: theme.completed,
            border: `3px solid ${theme.stackBorder}`,
            borderRadius: 12,
            padding: 20,
            fontFamily: 'monospace',
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.text,
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ fontSize: 16, marginBottom: 8 }}>Final Result:</div>
          <div>{algorithm}({input}) = {currentCalls[0].result}</div>
        </div>
      )}

      {/* Recursion explanation */}
      <div
        style={{
          position: 'absolute',
          bottom: showCode ? 200 : 100,
          left: showCallStack ? 300 : 40,
          backgroundColor: theme.codeBlock,
          border: `2px solid ${theme.stackBorder}`,
          borderRadius: 12,
          padding: 16,
          fontFamily: 'Arial, sans-serif',
          fontSize: 12,
          color: theme.text,
          maxWidth: 300,
          lineHeight: 1.4,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>How Recursion Works:</div>
        <div>1. <strong>Base Case:</strong> Stops the recursion</div>
        <div>2. <strong>Recursive Case:</strong> Function calls itself</div>
        <div>3. <strong>Call Stack:</strong> Tracks function calls</div>
        <div>4. <strong>Unwinding:</strong> Returns values back up</div>
      </div>
    </AbsoluteFill>
  );
};
