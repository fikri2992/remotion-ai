import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { z } from 'zod';

const listNodeSchema = z.object({
  id: z.string(),
  value: z.number(),
  next: z.string().optional(),
});

export const linkedListVisualizationSchema = z.object({
  nodes: z.array(listNodeSchema).default([
    { id: '1', value: 10, next: '2' },
    { id: '2', value: 20, next: '3' },
    { id: '3', value: 30, next: '4' },
    { id: '4', value: 40 },
  ]),
  operations: z.array(z.object({
    type: z.enum(['insert', 'delete', 'search', 'traverse']),
    value: z.number().optional(),
    position: z.number().optional(),
  })).default([
    { type: 'traverse' },
    { type: 'search', value: 30 },
    { type: 'insert', value: 25, position: 2 },
    { type: 'delete', position: 1 },
  ]),
  title: z.string().default('Linked List Visualization'),
  theme: z.enum(['light', 'dark', 'cyberpunk', 'nature']).default('light'),
  speed: z.number().min(0.5).max(3).default(1),
  showCode: z.boolean().default(true),
  showPointers: z.boolean().default(true),
});

interface ThemeColors {
  background: string;
  text: string;
  node: string;
  nodeBorder: string;
  pointer: string;
  highlight: string;
  accent: string;
  codeBlock: string;
  arrow: string;
}

const getLinkedListTheme = (theme: string): ThemeColors => {
  switch (theme) {
    case 'dark':
      return {
        background: '#1a1a1a',
        text: '#ffffff',
        node: '#333333',
        nodeBorder: '#666666',
        pointer: '#4a9eff',
        highlight: '#ff4a4a',
        accent: '#888888',
        codeBlock: '#2a2a2a',
        arrow: '#4a9eff',
      };
    case 'cyberpunk':
      return {
        background: '#0a0a0a',
        text: '#00ffff',
        node: '#1a0033',
        nodeBorder: '#ff00ff',
        pointer: '#00ffff',
        highlight: '#ff0080',
        accent: '#ff00ff',
        codeBlock: '#1a1a2e',
        arrow: '#00ffff',
      };
    case 'nature':
      return {
        background: '#f0f8f0',
        text: '#2d5016',
        node: '#e8f5e8',
        nodeBorder: '#4a7c59',
        pointer: '#2196f3',
        highlight: '#ff5722',
        accent: '#388e3c',
        codeBlock: '#e0f2e0',
        arrow: '#2196f3',
      };
    default: // light
      return {
        background: '#ffffff',
        text: '#000000',
        node: '#ffffff',
        nodeBorder: '#000000',
        pointer: '#4444ff',
        highlight: '#ff4444',
        accent: '#666666',
        codeBlock: '#f8f8f8',
        arrow: '#4444ff',
      };
  }
};

interface ListNodeProps {
  node: z.infer<typeof listNodeSchema>;
  x: number;
  y: number;
  theme: ThemeColors;
  isHighlighted: boolean;
  isCurrent: boolean;
  showPointers: boolean;
}

const ListNode: React.FC<ListNodeProps> = ({
  node,
  x,
  y,
  theme,
  isHighlighted,
  isCurrent,
  showPointers,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = isCurrent ? spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
    from: 1,
    to: 1.2,
  }) : isHighlighted ? 1.1 : 1;

  const glowIntensity = (isCurrent || isHighlighted) ? Math.sin(frame * 0.4) * 0.5 + 0.5 : 0;

  const nodeColor = isCurrent ? theme.highlight : isHighlighted ? theme.pointer : theme.node;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        display: 'flex',
        alignItems: 'center',
        transform: `scale(${scale})`,
        zIndex: 10,
      }}
    >
      {/* Data part */}
      <div
        style={{
          width: 80,
          height: 60,
          backgroundColor: nodeColor,
          border: `3px solid ${theme.nodeBorder}`,
          borderRadius: '8px 0 0 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          color: theme.text,
          boxShadow: glowIntensity > 0 ? 
            `0 0 ${15 * glowIntensity}px ${nodeColor}` : 
            '0 2px 8px rgba(0, 0, 0, 0.15)',
        }}
      >
        {node.value}
      </div>

      {/* Pointer part */}
      {showPointers && (
        <div
          style={{
            width: 40,
            height: 60,
            backgroundColor: theme.pointer,
            border: `3px solid ${theme.nodeBorder}`,
            borderLeft: 'none',
            borderRadius: '0 8px 8px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 'bold',
            fontFamily: 'monospace',
            color: theme.text,
          }}
        >
          {node.next ? '→' : '∅'}
        </div>
      )}

      {/* Node ID label */}
      <div
        style={{
          position: 'absolute',
          bottom: -25,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 12,
          color: theme.accent,
          fontFamily: 'monospace',
        }}
      >
        Node {node.id}
      </div>
    </div>
  );
};

interface ArrowProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  theme: ThemeColors;
  isActive: boolean;
}

const Arrow: React.FC<ArrowProps> = ({ fromX, fromY, toX, toY, theme, isActive }) => {
  const frame = useCurrentFrame();
  
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  const strokeWidth = isActive ? 4 : 2;
  const arrowColor = isActive ? theme.highlight : theme.arrow;

  // Animated dash for active arrows
  const dashOffset = isActive ? -frame * 2 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: fromX,
        top: fromY,
        width: length,
        height: strokeWidth,
        backgroundColor: arrowColor,
        transformOrigin: '0 50%',
        transform: `rotate(${angle}rad)`,
        zIndex: 5,
        borderRadius: strokeWidth / 2,
      }}
    >
      {/* Animated dash pattern for active arrows */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `repeating-linear-gradient(90deg, transparent 0, transparent 8px, ${theme.background} 8px, ${theme.background} 16px)`,
            transform: `translateX(${dashOffset}px)`,
            borderRadius: strokeWidth / 2,
          }}
        />
      )}
      
      {/* Arrow head */}
      <div
        style={{
          position: 'absolute',
          right: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderLeft: `12px solid ${arrowColor}`,
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
        }}
      />
    </div>
  );
};

export const LinkedListVisualization: React.FC<z.infer<typeof linkedListVisualizationSchema>> = ({
  nodes,
  operations,
  title,
  theme: themeName,
  speed,
  showCode,
  showPointers,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const theme = getLinkedListTheme(themeName);
  const animationFrame = Math.floor(frame * speed);

  // Calculate node positions
  const nodeSpacing = showPointers ? 160 : 120;
  const startX = (width - (nodes.length * nodeSpacing)) / 2;
  const nodeY = height / 2 - 30;

  // Simulate operations
  const getOperationState = () => {
    const step = Math.floor(animationFrame / 60);
    let currentNode = '';
    let highlightedNodes: string[] = [];
    let activeArrows: string[] = [];
    let currentOperation: { type: string; value?: number; position?: number } | null = null;

    if (step < operations.length) {
      currentOperation = operations[step];
      
      if (currentOperation.type === 'traverse') {
        const traverseStep = (animationFrame % 60) / 10;
        const nodeIndex = Math.floor(traverseStep);
        if (nodeIndex < nodes.length) {
          currentNode = nodes[nodeIndex].id;
          highlightedNodes = nodes.slice(0, nodeIndex).map(n => n.id);
          if (nodeIndex > 0) {
            activeArrows.push(`${nodes[nodeIndex - 1].id}-${nodes[nodeIndex].id}`);
          }
        }
      } else if (currentOperation.type === 'search') {
        const searchStep = (animationFrame % 60) / 10;
        const nodeIndex = Math.floor(searchStep);
        if (nodeIndex < nodes.length) {
          currentNode = nodes[nodeIndex].id;
          highlightedNodes = nodes.slice(0, nodeIndex).map(n => n.id);
          
          // Found the target
          if (nodes[nodeIndex].value === currentOperation.value) {
            currentNode = nodes[nodeIndex].id;
          }
        }
      }
    }

    return { currentNode, highlightedNodes, activeArrows, currentOperation };
  };

  const state = getOperationState();

  const getAlgorithmCode = () => {
    return `class ListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.size = 0;
  }
  
  insert(value, position = 0) {
    const newNode = new ListNode(value);
    
    if (position === 0) {
      newNode.next = this.head;
      this.head = newNode;
    } else {
      let current = this.head;
      for (let i = 0; i < position - 1; i++) {
        current = current.next;
      }
      newNode.next = current.next;
      current.next = newNode;
    }
    this.size++;
  }
  
  delete(position) {
    if (position === 0) {
      this.head = this.head.next;
    } else {
      let current = this.head;
      for (let i = 0; i < position - 1; i++) {
        current = current.next;
      }
      current.next = current.next.next;
    }
    this.size--;
  }
  
  search(value) {
    let current = this.head;
    let position = 0;
    
    while (current) {
      if (current.value === value) {
        return position;
      }
      current = current.next;
      position++;
    }
    
    return -1;
  }
  
  traverse() {
    const result = [];
    let current = this.head;
    
    while (current) {
      result.push(current.value);
      current = current.next;
    }
    
    return result;
  }
}`;
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

      {/* Current operation */}
      <div
        style={{
          position: 'absolute',
          top: 85,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 18,
          fontFamily: 'monospace',
          color: theme.accent,
          textAlign: 'center',
        }}
      >
        {state.currentOperation ? 
          `${state.currentOperation.type.toUpperCase()}${state.currentOperation.value ? `(${state.currentOperation.value})` : ''}` : 
          'STATIC VIEW'
        }
      </div>

      {/* Head pointer */}
      <div
        style={{
          position: 'absolute',
          left: startX - 60,
          top: nodeY + 15,
          fontSize: 16,
          fontWeight: 'bold',
          color: theme.pointer,
          fontFamily: 'monospace',
        }}
      >
        HEAD
      </div>
      <div
        style={{
          position: 'absolute',
          left: startX - 20,
          top: nodeY + 20,
          width: 0,
          height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderLeft: `15px solid ${theme.pointer}`,
        }}
      />

      {/* Linked list nodes */}
      {nodes.map((node, index) => (
        <ListNode
          key={node.id}
          node={node}
          x={startX + index * nodeSpacing}
          y={nodeY}
          theme={theme}
          isHighlighted={state.highlightedNodes.includes(node.id)}
          isCurrent={state.currentNode === node.id}
          showPointers={showPointers}
        />
      ))}

      {/* Arrows between nodes */}
      {nodes.map((node, index) => {
        if (node.next && index < nodes.length - 1) {
          const fromX = startX + index * nodeSpacing + (showPointers ? 120 : 80);
          const fromY = nodeY + 30;
          const toX = startX + (index + 1) * nodeSpacing;
          const toY = nodeY + 30;

          return (
            <Arrow
              key={`${node.id}-${node.next}`}
              fromX={fromX}
              fromY={fromY}
              toX={toX}
              toY={toY}
              theme={theme}
              isActive={state.activeArrows.includes(`${node.id}-${node.next}`)}
            />
          );
        }
        return null;
      })}

      {/* Code block */}
      {showCode && (
        <div
          style={{
            position: 'absolute',
            left: 40,
            bottom: 40,
            backgroundColor: theme.codeBlock,
            border: `2px solid ${theme.nodeBorder}`,
            borderRadius: 12,
            padding: 16,
            fontFamily: 'monospace',
            fontSize: 9,
            lineHeight: 1.3,
            color: theme.text,
            maxWidth: 320,
            maxHeight: 400,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          }}
        >
          {getAlgorithmCode().split('\n').slice(0, 30).map((line, index) => (
            <div key={index} style={{ margin: '1px 0' }}>
              <span style={{ color: theme.accent, marginRight: 4 }}>
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
          top: 130,
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
        <div>Nodes: {nodes.length}</div>
        <div>Current: {state.currentNode || 'None'}</div>
        <div>Operation: {state.currentOperation?.type || 'None'}</div>
        {state.currentOperation?.value && (
          <div>Target: {state.currentOperation.value}</div>
        )}
        
        <div style={{ marginTop: 12, fontWeight: 'bold' }}>Legend:</div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
          <div style={{ 
            width: 16, 
            height: 16, 
            backgroundColor: theme.pointer, 
            marginRight: 8,
            borderRadius: 2,
          }} />
          Visited
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
          <div style={{ 
            width: 16, 
            height: 16, 
            backgroundColor: theme.highlight, 
            marginRight: 8,
            borderRadius: 2,
          }} />
          Current
        </div>
      </div>

      {/* List values display */}
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
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>List Contents:</div>
        <div style={{ fontSize: 18, color: theme.accent }}>
          {nodes.map((node, index) => (
            <span key={node.id}>
              {node.value}
              {index < nodes.length - 1 && ' → '}
            </span>
          ))}
          {' → ∅'}
        </div>
      </div>
    </AbsoluteFill>
  );
};
