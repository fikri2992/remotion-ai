import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { z } from 'zod';

const nodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  value: z.number().optional(),
});

const edgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  weight: z.number().optional(),
  directed: z.boolean().default(false),
});

export const graphVisualizationSchema = z.object({
  nodes: z.array(nodeSchema).default([
    { id: 'A', label: 'A', x: 200, y: 200 },
    { id: 'B', label: 'B', x: 400, y: 150 },
    { id: 'C', label: 'C', x: 600, y: 200 },
    { id: 'D', label: 'D', x: 300, y: 350 },
    { id: 'E', label: 'E', x: 500, y: 350 },
  ]),
  edges: z.array(edgeSchema).default([
    { from: 'A', to: 'B', weight: 4 },
    { from: 'A', to: 'D', weight: 2 },
    { from: 'B', to: 'C', weight: 3 },
    { from: 'B', to: 'E', weight: 1 },
    { from: 'C', to: 'E', weight: 5 },
    { from: 'D', to: 'E', weight: 6 },
  ]),
  title: z.string().default('Graph Visualization'),
  algorithm: z.enum(['dfs', 'bfs', 'dijkstra', 'static']).default('dfs'),
  theme: z.enum(['light', 'dark', 'cyberpunk', 'nature']).default('light'),
  speed: z.number().min(0.5).max(3).default(1),
  showWeights: z.boolean().default(true),
  showLabels: z.boolean().default(true),
  nodeSize: z.number().min(30).max(80).default(50),
  animationStyle: z.enum(['smooth', 'bouncy', 'pulse']).default('smooth'),
});

interface ThemeColors {
  background: string;
  text: string;
  node: string;
  nodeBorder: string;
  edge: string;
  visited: string;
  current: string;
  path: string;
  accent: string;
  codeBlock: string;
}

const getGraphTheme = (theme: string): ThemeColors => {
  switch (theme) {
    case 'dark':
      return {
        background: '#1a1a1a',
        text: '#ffffff',
        node: '#333333',
        nodeBorder: '#666666',
        edge: '#555555',
        visited: '#4a9eff',
        current: '#ff4a4a',
        path: '#4aff4a',
        accent: '#888888',
        codeBlock: '#2a2a2a',
      };
    case 'cyberpunk':
      return {
        background: '#0a0a0a',
        text: '#00ffff',
        node: '#1a0033',
        nodeBorder: '#ff00ff',
        edge: '#444444',
        visited: '#00ffff',
        current: '#ff0080',
        path: '#80ff00',
        accent: '#ff00ff',
        codeBlock: '#1a1a2e',
      };
    case 'nature':
      return {
        background: '#f0f8f0',
        text: '#2d5016',
        node: '#e8f5e8',
        nodeBorder: '#4a7c59',
        edge: '#7a9b7a',
        visited: '#2196f3',
        current: '#ff5722',
        path: '#4caf50',
        accent: '#388e3c',
        codeBlock: '#e0f2e0',
      };
    default: // light
      return {
        background: '#ffffff',
        text: '#000000',
        node: '#ffffff',
        nodeBorder: '#000000',
        edge: '#666666',
        visited: '#4444ff',
        current: '#ff4444',
        path: '#44ff44',
        accent: '#666666',
        codeBlock: '#f8f8f8',
      };
  }
};

interface NodeProps {
  node: z.infer<typeof nodeSchema>;
  size: number;
  theme: ThemeColors;
  isVisited: boolean;
  isCurrent: boolean;
  isInPath: boolean;
  showLabels: boolean;
  animationStyle: string;
}

const GraphNode: React.FC<NodeProps> = ({
  node,
  size,
  theme,
  isVisited,
  isCurrent,
  isInPath,
  showLabels,
  animationStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const getAnimationConfig = () => {
    switch (animationStyle) {
      case 'bouncy':
        return { damping: 8, stiffness: 150, mass: 1 };
      case 'pulse':
        return { damping: 6, stiffness: 200, mass: 0.8 };
      default:
        return { damping: 12, stiffness: 100, mass: 1 };
    }
  };

  const config = getAnimationConfig();

  const scale = isCurrent ? spring({
    frame,
    fps,
    config,
    from: 1,
    to: 1.3,
  }) : isVisited ? 1.1 : 1;

  const pulseEffect = animationStyle === 'pulse' && (isCurrent || isVisited) ?
    1 + Math.sin(frame * 0.3) * 0.1 : 1;

  const glowIntensity = (isCurrent || isVisited) ?
    Math.sin(frame * 0.4) * 0.5 + 0.5 : 0;

  const getNodeColor = () => {
    if (isCurrent) return theme.current;
    if (isInPath) return theme.path;
    if (isVisited) return theme.visited;
    return theme.node;
  };

  const nodeColor = getNodeColor();

  return (
    <div
      style={{
        position: 'absolute',
        left: node.x - size / 2,
        top: node.y - size / 2,
        width: size,
        height: size,
        backgroundColor: nodeColor,
        border: `3px solid ${theme.nodeBorder}`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: theme.text,
        transform: `scale(${scale * pulseEffect})`,
        boxShadow: glowIntensity > 0 ? 
          `0 0 ${20 * glowIntensity}px ${nodeColor}` : 
          '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s ease',
        zIndex: 10,
      }}
    >
      {showLabels && node.label}
      {node.value !== undefined && (
        <div
          style={{
            position: 'absolute',
            bottom: -25,
            fontSize: size * 0.25,
            color: theme.accent,
            fontFamily: 'monospace',
          }}
        >
          {node.value}
        </div>
      )}
    </div>
  );
};

interface EdgeProps {
  edge: z.infer<typeof edgeSchema>;
  nodes: z.infer<typeof nodeSchema>[];
  theme: ThemeColors;
  isActive: boolean;
  isInPath: boolean;
  showWeights: boolean;
}

const GraphEdge: React.FC<EdgeProps> = ({
  edge,
  nodes,
  theme,
  isActive,
  isInPath,
  showWeights,
}) => {
  const frame = useCurrentFrame();
  
  const fromNode = nodes.find(n => n.id === edge.from);
  const toNode = nodes.find(n => n.id === edge.to);

  if (!fromNode || !toNode) return null;

  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  const strokeWidth = isActive ? 4 : isInPath ? 3 : 2;
  const opacity = isActive ? 1 : isInPath ? 0.8 : 0.6;

  const getEdgeColor = () => {
    if (isActive) return theme.current;
    if (isInPath) return theme.path;
    return theme.edge;
  };

  const edgeColor = getEdgeColor();

  // Animated dash for active edges
  const dashOffset = isActive ? -frame * 2 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: fromNode.x,
        top: fromNode.y,
        width: length,
        height: strokeWidth,
        backgroundColor: edgeColor,
        transformOrigin: '0 50%',
        transform: `rotate(${angle}rad)`,
        opacity,
        zIndex: 1,
        borderRadius: strokeWidth / 2,
        boxShadow: isActive ? `0 0 10px ${edgeColor}` : 'none',
      }}
    >
      {/* Animated dash pattern for active edges */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `repeating-linear-gradient(90deg, transparent 0, transparent 10px, ${theme.background} 10px, ${theme.background} 20px)`,
            transform: `translateX(${dashOffset}px)`,
            borderRadius: strokeWidth / 2,
          }}
        />
      )}
      
      {/* Arrow for directed edges */}
      {edge.directed && (
        <div
          style={{
            position: 'absolute',
            right: -8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderLeft: `8px solid ${edgeColor}`,
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
          }}
        />
      )}
      
      {/* Weight label */}
      {showWeights && edge.weight !== undefined && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: -20,
            transform: 'translateX(-50%)',
            backgroundColor: theme.codeBlock,
            color: theme.text,
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: 'monospace',
            border: `1px solid ${theme.nodeBorder}`,
            zIndex: 5,
          }}
        >
          {edge.weight}
        </div>
      )}
    </div>
  );
};

export const GraphVisualization: React.FC<z.infer<typeof graphVisualizationSchema>> = ({
  nodes,
  edges,
  title,
  algorithm,
  theme: themeName,
  speed,
  showWeights,
  showLabels,
  nodeSize,
  animationStyle,
}) => {
  const frame = useCurrentFrame();
  useVideoConfig();

  const theme = getGraphTheme(themeName);
  const animationFrame = Math.floor(frame * speed);

  // Algorithm simulation
  const getTraversalState = () => {
    const visited: string[] = [];
    const current: string[] = [];
    const path: string[] = [];
    const activeEdges: string[] = [];

    if (algorithm === 'static') {
      return { visited, current, path, activeEdges };
    }

    const step = Math.floor(animationFrame / 60);
    
    if (algorithm === 'dfs') {
      // Simple DFS simulation
      const stack = ['A'];
      const visitedSet = new Set<string>();
      let stepCount = 0;

      while (stack.length > 0 && stepCount <= step) {
        const node = stack.pop()!;
        if (!visitedSet.has(node)) {
          visitedSet.add(node);
          visited.push(node);
          
          if (stepCount === step) {
            current.push(node);
          }
          
          // Add neighbors to stack
          const neighbors = edges
            .filter(e => e.from === node || e.to === node)
            .map(e => e.from === node ? e.to : e.from)
            .filter(n => !visitedSet.has(n));
          
          stack.push(...neighbors);
        }
        stepCount++;
      }
    } else if (algorithm === 'bfs') {
      // Simple BFS simulation
      const queue = ['A'];
      const visitedSet = new Set<string>();
      let stepCount = 0;

      while (queue.length > 0 && stepCount <= step) {
        const node = queue.shift()!;
        if (!visitedSet.has(node)) {
          visitedSet.add(node);
          visited.push(node);
          
          if (stepCount === step) {
            current.push(node);
          }
          
          // Add neighbors to queue
          const neighbors = edges
            .filter(e => e.from === node || e.to === node)
            .map(e => e.from === node ? e.to : e.from)
            .filter(n => !visitedSet.has(n));
          
          queue.push(...neighbors);
        }
        stepCount++;
      }
    }

    // Find active edges
    if (current.length > 0) {
      const currentNode = current[0];
      activeEdges.push(...edges
        .filter(e => e.from === currentNode || e.to === currentNode)
        .map(e => `${e.from}-${e.to}`)
      );
    }

    return { visited, current, path, activeEdges };
  };

  const state = getTraversalState();

  const getAlgorithmCode = () => {
    switch (algorithm) {
      case 'dfs':
        return `function dfs(graph, start) {
  const visited = new Set();
  const stack = [start];
  const result = [];
  
  while (stack.length > 0) {
    const node = stack.pop();
    if (!visited.has(node)) {
      visited.add(node);
      result.push(node);
      
      // Add neighbors to stack
      for (let neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }
  }
  
  return result;
}`;
      case 'bfs':
        return `function bfs(graph, start) {
  const visited = new Set();
  const queue = [start];
  const result = [];
  
  while (queue.length > 0) {
    const node = queue.shift();
    if (!visited.has(node)) {
      visited.add(node);
      result.push(node);
      
      // Add neighbors to queue
      for (let neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
  }
  
  return result;
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

      {/* Algorithm name */}
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
        {algorithm.toUpperCase()}
      </div>

      {/* Edges */}
      {edges.map((edge, index) => (
        <GraphEdge
          key={`${edge.from}-${edge.to}-${index}`}
          edge={edge}
          nodes={nodes}
          theme={theme}
          isActive={state.activeEdges.includes(`${edge.from}-${edge.to}`)}
          isInPath={state.path.some(p => p === edge.from || p === edge.to)}
          showWeights={showWeights}
        />
      ))}

      {/* Nodes */}
      {nodes.map((node) => (
        <GraphNode
          key={node.id}
          node={node}
          size={nodeSize}
          theme={theme}
          isVisited={state.visited.includes(node.id)}
          isCurrent={state.current.includes(node.id)}
          isInPath={state.path.includes(node.id)}
          showLabels={showLabels}
          animationStyle={animationStyle}
        />
      ))}

      {/* Code block */}
      {algorithm !== 'static' && (
        <div
          style={{
            position: 'absolute',
            left: 40,
            bottom: 40,
            backgroundColor: theme.codeBlock,
            border: `2px solid ${theme.nodeBorder}`,
            borderRadius: 12,
            padding: 20,
            fontFamily: 'monospace',
            fontSize: 12,
            lineHeight: 1.5,
            color: theme.text,
            maxWidth: 400,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          }}
        >
          {getAlgorithmCode().split('\n').map((line, index) => (
            <div key={index} style={{ margin: '2px 0' }}>
              <span style={{ color: theme.accent, marginRight: 8 }}>
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
          border: `2px solid ${theme.nodeBorder}`,
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
        <div>Step: {animationFrame}</div>
        <div>Visited: {state.visited.length}</div>
        <div>Current: {state.current.join(', ') || 'None'}</div>
        <div style={{ marginTop: 12, fontWeight: 'bold' }}>Legend:</div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
          <div style={{ 
            width: 16, 
            height: 16, 
            backgroundColor: theme.visited, 
            borderRadius: '50%',
            marginRight: 8,
          }} />
          Visited
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
          <div style={{ 
            width: 16, 
            height: 16, 
            backgroundColor: theme.current, 
            borderRadius: '50%',
            marginRight: 8,
          }} />
          Current
        </div>
      </div>

      {/* Theme indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 40,
          fontSize: 12,
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
