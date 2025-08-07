import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { z } from 'zod';

const treeNodeSchema = z.object({
  id: z.string(),
  value: z.number(),
  x: z.number(),
  y: z.number(),
  left: z.string().optional(),
  right: z.string().optional(),
});

export const binaryTreeVisualizationSchema = z.object({
  nodes: z.array(treeNodeSchema).default([
    { id: '1', value: 50, x: 500, y: 100 },
    { id: '2', value: 30, x: 350, y: 200, left: '4', right: '5' },
    { id: '3', value: 70, x: 650, y: 200, left: '6', right: '7' },
    { id: '4', value: 20, x: 250, y: 300 },
    { id: '5', value: 40, x: 450, y: 300 },
    { id: '6', value: 60, x: 550, y: 300 },
    { id: '7', value: 80, x: 750, y: 300 },
  ]),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.enum(['left', 'right']),
  })).default([
    { from: '1', to: '2', type: 'left' },
    { from: '1', to: '3', type: 'right' },
    { from: '2', to: '4', type: 'left' },
    { from: '2', to: '5', type: 'right' },
    { from: '3', to: '6', type: 'left' },
    { from: '3', to: '7', type: 'right' },
  ]),
  title: z.string().default('Binary Tree Visualization'),
  algorithm: z.enum(['inorder', 'preorder', 'postorder', 'bfs', 'search', 'insert', 'static']).default('inorder'),
  theme: z.enum(['light', 'dark', 'cyberpunk', 'nature']).default('light'),
  speed: z.number().min(0.5).max(3).default(1),
  nodeSize: z.number().min(30).max(80).default(50),
  showValues: z.boolean().default(true),
  showCode: z.boolean().default(true),
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

const getTreeTheme = (theme: string): ThemeColors => {
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

interface TreeNodeProps {
  node: z.infer<typeof treeNodeSchema>;
  size: number;
  theme: ThemeColors;
  isVisited: boolean;
  isCurrent: boolean;
  isInPath: boolean;
  showValues: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  size,
  theme,
  isVisited,
  isCurrent,
  isInPath,
  showValues,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = isCurrent ? spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
    from: 1,
    to: 1.4,
  }) : isVisited ? 1.2 : 1;

  const pulseEffect = isCurrent ? 1 + Math.sin(frame * 0.4) * 0.1 : 1;
  const glowIntensity = (isCurrent || isVisited) ? Math.sin(frame * 0.3) * 0.5 + 0.5 : 0;

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
        fontSize: size * 0.35,
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
      {showValues && node.value}
    </div>
  );
};

interface TreeEdgeProps {
  edge: { from: string; to: string; type: 'left' | 'right' };
  nodes: z.infer<typeof treeNodeSchema>[];
  theme: ThemeColors;
  isActive: boolean;
}

const TreeEdge: React.FC<TreeEdgeProps> = ({ edge, nodes, theme, isActive }) => {
  const fromNode = nodes.find(n => n.id === edge.from);
  const toNode = nodes.find(n => n.id === edge.to);

  if (!fromNode || !toNode) return null;

  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  const strokeWidth = isActive ? 4 : 2;
  const edgeColor = isActive ? theme.current : theme.edge;

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
        zIndex: 1,
        borderRadius: strokeWidth / 2,
        boxShadow: isActive ? `0 0 10px ${edgeColor}` : 'none',
      }}
    >
      {/* Edge type label */}
      <div
        style={{
          position: 'absolute',
          left: '30%',
          top: -20,
          fontSize: 10,
          color: theme.accent,
          fontFamily: 'monospace',
          transform: `rotate(${-angle}rad)`,
          whiteSpace: 'nowrap',
        }}
      >
        {edge.type === 'left' ? 'L' : 'R'}
      </div>
    </div>
  );
};

export const BinaryTreeVisualization: React.FC<z.infer<typeof binaryTreeVisualizationSchema>> = ({
  nodes,
  edges,
  title,
  algorithm,
  theme: themeName,
  speed,
  nodeSize,
  showValues,
  showCode,
}) => {
  const frame = useCurrentFrame();
  useVideoConfig();

  const theme = getTreeTheme(themeName);
  const animationFrame = Math.floor(frame * speed);

  // Tree traversal algorithms
  const getTraversalState = () => {
    const visited: string[] = [];
    const current: string[] = [];
    const activeEdges: string[] = [];

    if (algorithm === 'static') {
      return { visited, current, activeEdges };
    }

    const step = Math.floor(animationFrame / 60);
    
    // Build adjacency list
    const adjList: { [key: string]: string[] } = {};
    nodes.forEach(node => {
      adjList[node.id] = [];
    });
    edges.forEach(edge => {
      adjList[edge.from].push(edge.to);
    });

    if (algorithm === 'inorder') {
      // Inorder traversal simulation
      const inorderTraversal = (nodeId: string, visitedSet: Set<string>, result: string[]) => {
        if (!nodeId || visitedSet.has(nodeId)) return;
        
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const leftChild = edges.find(e => e.from === nodeId && e.type === 'left')?.to;
        const rightChild = edges.find(e => e.from === nodeId && e.type === 'right')?.to;

        if (leftChild) inorderTraversal(leftChild, visitedSet, result);
        
        visitedSet.add(nodeId);
        result.push(nodeId);
        
        if (rightChild) inorderTraversal(rightChild, visitedSet, result);
      };

      const result: string[] = [];
      const visitedSet = new Set<string>();
      inorderTraversal('1', visitedSet, result);
      
      if (step < result.length) {
        visited.push(...result.slice(0, step));
        current.push(result[step]);
      } else {
        visited.push(...result);
      }
    } else if (algorithm === 'preorder') {
      // Preorder traversal
      const preorderTraversal = (nodeId: string, visitedSet: Set<string>, result: string[]) => {
        if (!nodeId || visitedSet.has(nodeId)) return;
        
        visitedSet.add(nodeId);
        result.push(nodeId);

        const leftChild = edges.find(e => e.from === nodeId && e.type === 'left')?.to;
        const rightChild = edges.find(e => e.from === nodeId && e.type === 'right')?.to;

        if (leftChild) preorderTraversal(leftChild, visitedSet, result);
        if (rightChild) preorderTraversal(rightChild, visitedSet, result);
      };

      const result: string[] = [];
      const visitedSet = new Set<string>();
      preorderTraversal('1', visitedSet, result);
      
      if (step < result.length) {
        visited.push(...result.slice(0, step));
        current.push(result[step]);
      } else {
        visited.push(...result);
      }
    } else if (algorithm === 'bfs') {
      // BFS traversal
      const queue = ['1'];
      const visitedSet = new Set<string>();
      const result: string[] = [];

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (!visitedSet.has(nodeId)) {
          visitedSet.add(nodeId);
          result.push(nodeId);
          
          const children = edges.filter(e => e.from === nodeId).map(e => e.to);
          queue.push(...children);
        }
      }

      if (step < result.length) {
        visited.push(...result.slice(0, step));
        current.push(result[step]);
      } else {
        visited.push(...result);
      }
    }

    // Find active edges
    if (current.length > 0) {
      const currentNode = current[0];
      activeEdges.push(...edges
        .filter(e => e.from === currentNode)
        .map(e => `${e.from}-${e.to}`)
      );
    }

    return { visited, current, activeEdges };
  };

  const state = getTraversalState();

  const getAlgorithmCode = () => {
    switch (algorithm) {
      case 'inorder':
        return `function inorderTraversal(node) {
  if (!node) return;
  
  // Traverse left subtree
  inorderTraversal(node.left);
  
  // Visit current node
  console.log(node.value);
  
  // Traverse right subtree
  inorderTraversal(node.right);
}`;
      case 'preorder':
        return `function preorderTraversal(node) {
  if (!node) return;
  
  // Visit current node
  console.log(node.value);
  
  // Traverse left subtree
  preorderTraversal(node.left);
  
  // Traverse right subtree
  preorderTraversal(node.right);
}`;
      case 'postorder':
        return `function postorderTraversal(node) {
  if (!node) return;
  
  // Traverse left subtree
  postorderTraversal(node.left);
  
  // Traverse right subtree
  postorderTraversal(node.right);
  
  // Visit current node
  console.log(node.value);
}`;
      case 'bfs':
        return `function bfsTraversal(root) {
  const queue = [root];
  
  while (queue.length > 0) {
    const node = queue.shift();
    console.log(node.value);
    
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
  }
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

      {/* Algorithm name */}
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
        {algorithm.toUpperCase()} TRAVERSAL
      </div>

      {/* Tree edges */}
      {edges.map((edge, index) => (
        <TreeEdge
          key={`${edge.from}-${edge.to}-${index}`}
          edge={edge}
          nodes={nodes}
          theme={theme}
          isActive={state.activeEdges.includes(`${edge.from}-${edge.to}`)}
        />
      ))}

      {/* Tree nodes */}
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          size={nodeSize}
          theme={theme}
          isVisited={state.visited.includes(node.id)}
          isCurrent={state.current.includes(node.id)}
          isInPath={false}
          showValues={showValues}
        />
      ))}

      {/* Code block */}
      {showCode && algorithm !== 'static' && (
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
            maxWidth: 350,
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
          top: 120,
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
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Traversal Status:</div>
        <div>Step: {Math.floor(frame * speed)}</div>
        <div>Visited: [{state.visited.join(', ')}]</div>
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

      {/* Traversal order display */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          backgroundColor: theme.codeBlock,
          border: `2px solid ${theme.nodeBorder}`,
          borderRadius: 12,
          padding: 16,
          fontFamily: 'monospace',
          fontSize: 16,
          color: theme.text,
          maxWidth: 300,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Traversal Order:</div>
        <div style={{ fontSize: 18, color: theme.accent }}>
          {state.visited.map(nodeId => {
            const node = nodes.find(n => n.id === nodeId);
            return node?.value;
          }).join(' → ')}
          {state.current.length > 0 && (
            <span style={{ color: theme.current }}>
              {state.visited.length > 0 ? ' → ' : ''}
              [{nodes.find(n => n.id === state.current[0])?.value}]
            </span>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
