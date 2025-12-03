import React, { useMemo, useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { AlertTriangle, GitBranch, Zap, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function TaskDependencyGraph({ tasks, onTaskClick }) {
  const { tokens } = useTheme();
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  // Build dependency graph and calculate critical path
  const graph = useMemo(() => {
    if (!tasks || tasks.length === 0) return { nodes: [], edges: [], criticalPath: [] };

    // Filter tasks with dependencies
    const tasksWithDeps = tasks.filter(t => 
      t.depends_on?.length > 0 || tasks.some(other => other.depends_on?.includes(t.id))
    );

    if (tasksWithDeps.length === 0) return { nodes: [], edges: [], criticalPath: [] };

    // Build adjacency list
    const adjList = {};
    const inDegree = {};
    
    tasksWithDeps.forEach(task => {
      adjList[task.id] = [];
      inDegree[task.id] = 0;
    });

    tasksWithDeps.forEach(task => {
      if (task.depends_on) {
        task.depends_on.forEach(depId => {
          if (adjList[depId]) {
            adjList[depId].push(task.id);
            inDegree[task.id]++;
          }
        });
      }
    });

    // Calculate levels using BFS
    const levels = {};
    const queue = [];
    
    Object.keys(inDegree).forEach(id => {
      if (inDegree[id] === 0) {
        queue.push(id);
        levels[id] = 0;
      }
    });

    while (queue.length > 0) {
      const current = queue.shift();
      adjList[current].forEach(next => {
        inDegree[next]--;
        levels[next] = Math.max(levels[next] || 0, (levels[current] || 0) + 1);
        if (inDegree[next] === 0) {
          queue.push(next);
        }
      });
    }

    // Calculate critical path (longest path considering estimated time)
    const distances = {};
    const criticalPath = new Set();
    
    Object.keys(levels).forEach(id => distances[id] = 0);
    
    const sortedByLevel = Object.keys(levels).sort((a, b) => levels[a] - levels[b]);
    
    sortedByLevel.forEach(taskId => {
      const task = tasksWithDeps.find(t => t.id === taskId);
      if (task?.depends_on) {
        task.depends_on.forEach(depId => {
          if (distances[depId] !== undefined) {
            const depTask = tasksWithDeps.find(t => t.id === depId);
            const newDist = distances[depId] + (depTask?.estimated_minutes || 25);
            if (newDist > distances[taskId]) {
              distances[taskId] = newDist;
            }
          }
        });
      }
    });

    // Find critical path by backtracking from longest distance
    const maxDist = Math.max(...Object.values(distances));
    const endNodes = Object.keys(distances).filter(id => distances[id] === maxDist);
    
    const findCriticalPath = (nodeId, visited = new Set()) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      criticalPath.add(nodeId);
      
      const task = tasksWithDeps.find(t => t.id === nodeId);
      if (task?.depends_on) {
        task.depends_on.forEach(depId => {
          if (distances[depId] !== undefined) {
            findCriticalPath(depId, visited);
          }
        });
      }
    };
    
    endNodes.forEach(id => findCriticalPath(id));

    // Group by levels
    const maxLevel = Math.max(...Object.values(levels));
    const nodesByLevel = {};
    for (let i = 0; i <= maxLevel; i++) {
      nodesByLevel[i] = [];
    }
    
    Object.keys(levels).forEach(id => {
      nodesByLevel[levels[id]].push(id);
    });

    // Calculate positions
    const nodeWidth = 200;
    const nodeHeight = 80;
    const levelSpacing = 250;
    const nodeSpacing = 100;

    const nodes = tasksWithDeps.map(task => {
      const level = levels[task.id];
      const levelNodes = nodesByLevel[level];
      const indexInLevel = levelNodes.indexOf(task.id);
      const totalInLevel = levelNodes.length;
      
      return {
        id: task.id,
        task,
        x: level * levelSpacing,
        y: indexInLevel * (nodeHeight + nodeSpacing) - ((totalInLevel - 1) * (nodeHeight + nodeSpacing)) / 2,
        level,
        isCritical: criticalPath.has(task.id)
      };
    });

    // Create edges
    const edges = [];
    tasksWithDeps.forEach(task => {
      if (task.depends_on) {
        task.depends_on.forEach(depId => {
          const fromNode = nodes.find(n => n.id === depId);
          const toNode = nodes.find(n => n.id === task.id);
          if (fromNode && toNode) {
            edges.push({
              from: depId,
              to: task.id,
              isCritical: criticalPath.has(depId) && criticalPath.has(task.id)
            });
          }
        });
      }
    });

    return { nodes, edges, criticalPath: Array.from(criticalPath) };
  }, [tasks]);

  if (graph.nodes.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: tokens.subtle }} />
          <p style={{ color: tokens.subtle }}>
            No task dependencies to visualize. Add dependencies to tasks to see the graph.
          </p>
        </div>
      </Card>
    );
  }

  const priorityColors = {
    urgent: '#DC2626',
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981'
  };

  // Calculate SVG dimensions
  const padding = 50;
  const minX = Math.min(...graph.nodes.map(n => n.x)) - padding;
  const maxX = Math.max(...graph.nodes.map(n => n.x)) + 200 + padding;
  const minY = Math.min(...graph.nodes.map(n => n.y)) - padding;
  const maxY = Math.max(...graph.nodes.map(n => n.y)) + 80 + padding;
  
  const viewBoxWidth = maxX - minX;
  const viewBoxHeight = maxY - minY;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" style={{ color: tokens.accent }} />
          <h3 className="font-semibold" style={{ color: tokens.color }}>
            Task Dependency Graph
          </h3>
        </div>
        
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" style={{ color: '#EF4444' }} />
            <span style={{ color: tokens.subtle }}>Critical Path</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" style={{ color: '#F59E0B' }} />
            <span style={{ color: tokens.subtle }}>Blocked</span>
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto bg-gradient-to-br rounded-xl p-4"
        style={{ 
          backgroundColor: `${tokens.accent}05`,
          maxHeight: '600px'
        }}
      >
        <svg
          viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-auto"
          style={{ minHeight: '400px' }}
        >
          {/* Edges */}
          <g>
            {graph.edges.map((edge, i) => {
              const fromNode = graph.nodes.find(n => n.id === edge.from);
              const toNode = graph.nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.x + 200;
              const y1 = fromNode.y + 40;
              const x2 = toNode.x;
              const y2 = toNode.y + 40;

              const isHighlighted = hoveredNode && (edge.from === hoveredNode || edge.to === hoveredNode);

              return (
                <g key={i}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={edge.isCritical ? '#EF4444' : tokens.border}
                    strokeWidth={isHighlighted ? 3 : edge.isCritical ? 2.5 : 2}
                    strokeDasharray={edge.isCritical ? '0' : '5,5'}
                    opacity={isHighlighted ? 1 : 0.6}
                    markerEnd="url(#arrowhead)"
                  />
                </g>
              );
            })}
          </g>

          {/* Arrow marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill={tokens.border} />
            </marker>
          </defs>

          {/* Nodes */}
          <g>
            {graph.nodes.map((node) => {
              const isSelected = selectedNode === node.id;
              const isHovered = hoveredNode === node.id;
              const isBlocked = node.task.depends_on?.some(depId => {
                const dep = tasks.find(t => t.id === depId);
                return dep && dep.status !== 'done';
              });

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => {
                    setSelectedNode(isSelected ? null : node.id);
                    onTaskClick?.(node.task);
                  }}
                >
                  {/* Node background */}
                  <rect
                    width="200"
                    height="80"
                    rx="12"
                    fill={tokens.card}
                    stroke={node.isCritical ? '#EF4444' : priorityColors[node.task.priority]}
                    strokeWidth={isSelected || isHovered ? 3 : 2}
                    opacity={isHovered ? 1 : 0.95}
                    filter={isHovered ? 'url(#shadow)' : 'none'}
                  />

                  {/* Critical path indicator */}
                  {node.isCritical && (
                    <g>
                      <rect
                        x="5"
                        y="5"
                        width="30"
                        height="20"
                        rx="4"
                        fill="#FEE2E2"
                      />
                      <text x="20" y="19" fontSize="12" textAnchor="middle" fill="#DC2626">⚡</text>
                    </g>
                  )}

                  {/* Blocked indicator */}
                  {isBlocked && (
                    <g>
                      <rect
                        x="165"
                        y="5"
                        width="30"
                        height="20"
                        rx="4"
                        fill="#FEF3C7"
                      />
                      <text x="180" y="19" fontSize="12" textAnchor="middle" fill="#F59E0B">⚠</text>
                    </g>
                  )}

                  {/* Task title */}
                  <text
                    x="10"
                    y={node.isCritical ? "35" : "30"}
                    fontSize="13"
                    fontWeight="600"
                    fill={tokens.color}
                  >
                    {node.task.title.length > 20 
                      ? node.task.title.substring(0, 20) + '...' 
                      : node.task.title}
                  </text>

                  {/* Task metadata */}
                  <text
                    x="10"
                    y="52"
                    fontSize="10"
                    fill={tokens.subtle}
                  >
                    {node.task.estimated_minutes || 25}m • {node.task.priority}
                  </text>

                  {/* Due date if exists */}
                  {node.task.due_date && (
                    <text
                      x="10"
                      y="68"
                      fontSize="9"
                      fill={tokens.subtle}
                    >
                      📅 {format(new Date(node.task.due_date), 'MMM d')}
                    </text>
                  )}

                  {/* Status indicator */}
                  <circle
                    cx="190"
                    cy="72"
                    r="5"
                    fill={
                      node.task.status === 'done' ? '#10B981' :
                      node.task.status === 'in_progress' ? '#3B82F6' : '#9CA3AF'
                    }
                  />
                </g>
              );
            })}
          </g>

          {/* Shadow filter */}
          <defs>
            <filter id="shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3"/>
            </filter>
          </defs>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs" style={{ borderColor: tokens.border }}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#EF4444' }} />
          <span style={{ color: tokens.subtle }}>Critical Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2" style={{ borderColor: tokens.border, borderStyle: 'dashed' }} />
          <span style={{ color: tokens.subtle }}>Dependency</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500" />
          <span style={{ color: tokens.subtle }}>Done</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span style={{ color: tokens.subtle }}>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-400" />
          <span style={{ color: tokens.subtle }}>To Do</span>
        </div>
      </div>

      {/* Info box */}
      {graph.criticalPath.length > 0 && (
        <div 
          className="mt-4 p-3 rounded-xl flex items-start gap-2"
          style={{ backgroundColor: '#FEE2E2' }}
        >
          <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#DC2626' }} />
          <div className="text-xs">
            <p className="font-semibold mb-1" style={{ color: '#DC2626' }}>
              Critical Path Detected
            </p>
            <p style={{ color: '#991B1B' }}>
              {graph.criticalPath.length} task{graph.criticalPath.length > 1 ? 's' : ''} on the critical path. 
              Any delay in these tasks will delay the entire project.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

export default TaskDependencyGraph;