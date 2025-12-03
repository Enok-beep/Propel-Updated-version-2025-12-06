import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { GitBranch, ZoomIn, ZoomOut, Maximize2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function MindMapView({ tasks, onTaskClick }) {
  const { tokens } = useTheme();
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState(null);
  const [initialZoom, setInitialZoom] = useState(1);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [collapsedBranches, setCollapsedBranches] = useState(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [collapsedStatuses, setCollapsedStatuses] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('none');
  const [assignedUserFilter, setAssignedUserFilter] = useState('all');
  const containerRef = React.useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const members = await base44.entities.TeamMember.list();
      return members;
    },
  });

  const priorityColors = {
    urgent: '#DC2626',
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981'
  };

  // ResizeObserver for responsive container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Build mind map structure grouped by category
  const mindMap = useMemo(() => {
    if (!tasks || tasks.length === 0) return { center: null, branches: {} };

    // Apply status filter
    let filteredTasks = statusFilter === 'all' 
      ? tasks 
      : tasks.filter(t => t.status === statusFilter);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredTasks = filteredTasks.filter(t => 
        t.title?.toLowerCase().includes(query) || 
        t.description?.toLowerCase().includes(query) ||
        t.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply assigned user filter
    if (assignedUserFilter !== 'all') {
      if (assignedUserFilter === 'me') {
        filteredTasks = filteredTasks.filter(t => 
          t.assigned_to === currentUser?.email || 
          (t.created_by === currentUser?.email && !t.assigned_to)
        );
      } else if (assignedUserFilter === 'unassigned') {
        filteredTasks = filteredTasks.filter(t => !t.assigned_to);
      } else {
        filteredTasks = filteredTasks.filter(t => t.assigned_to === assignedUserFilter);
      }
    }

    // Sort tasks based on selected option
    const sortTasks = (tasksToSort) => {
      if (sortBy === 'none') return tasksToSort;
      
      return [...tasksToSort].sort((a, b) => {
        if (sortBy === 'due_date') {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        } else if (sortBy === 'priority') {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        } else if (sortBy === 'energy') {
          const energyOrder = { high: 0, medium: 1, low: 2 };
          return energyOrder[a.energy_level] - energyOrder[b.energy_level];
        }
        return 0;
      });
    };

    // Group tasks by category
    const categories = ['work', 'personal', 'health', 'learning', 'errands', 'creative'];
    const branches = {};
    
    categories.forEach(category => {
      const categoryTasks = filteredTasks.filter(t => t.category === category);
      branches[category] = sortTasks(categoryTasks);
    });

    return {
      center: { label: 'My Tasks', total: filteredTasks.length },
      branches
    };
  }, [tasks, statusFilter, searchQuery, assignedUserFilter, sortBy, currentUser]);

  const categoryConfig = {
    work: { color: '#3B82F6', icon: '💼', angle: 0 },
    personal: { color: '#8B5CF6', icon: '👤', angle: 60 },
    health: { color: '#10B981', icon: '❤️', angle: 120 },
    learning: { color: '#F59E0B', icon: '📚', angle: 180 },
    errands: { color: '#EC4899', icon: '🛒', angle: 240 },
    creative: { color: '#06B6D4', icon: '🎨', angle: 300 },
  };

  // Dynamic scaling based on zoom level and container size
  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;
  const centerRadius = Math.max(60, Math.min(100, 80 * zoom));
  const branchDistance = Math.max(180, Math.min(320, 250 * zoom));
  const nodeRadius = Math.max(35, Math.min(65, 50 * zoom));
  const taskNodeDistance = 100; // Distance from branch to task nodes

  // Toggle branch collapse/expand
  const toggleBranch = (category) => {
    setCollapsedBranches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Pinch zoom helper
  const getDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Smart auto-fit function - calculates optimal zoom and pan
  const handleAutoFit = () => {
    const visibleBranches = branchPositions.filter(b => !collapsedBranches.has(b.category) && b.tasks.length > 0);
    
    if (visibleBranches.length === 0) {
      setZoom(1);
      setPan({ x: -120, y: -200 });
      return;
    }

    // Calculate bounding box of all visible nodes
    let minX = centerX, maxX = centerX, minY = centerY, maxY = centerY;
    
    visibleBranches.forEach(branch => {
      minX = Math.min(minX, branch.x - nodeRadius - 100);
      maxX = Math.max(maxX, branch.x + nodeRadius + 100);
      minY = Math.min(minY, branch.y - nodeRadius - 100);
      maxY = Math.max(maxY, branch.y + nodeRadius + 100);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const padding = 100;

    // Calculate optimal zoom to fit content
    const zoomX = (containerSize.width - padding * 2) / contentWidth;
    const zoomY = (containerSize.height - padding * 2) / contentHeight;
    const optimalZoom = Math.min(zoomX, zoomY, 2);

    // Center the content with slight offset adjustments
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    const panX = (containerSize.width / 2 - contentCenterX * optimalZoom) - 120;
    const panY = (containerSize.height / 2 - contentCenterY * optimalZoom) - 200;

    setZoom(Math.max(0.3, optimalZoom));
    setPan({ x: panX, y: panY });
  };

  // Mouse handlers
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click only
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Reset to center view with full visibility
  const resetToCenter = () => {
    const visibleBranches = branchPositions.filter(b => !collapsedBranches.has(b.category) && b.tasks.length > 0);
    
    if (visibleBranches.length === 0) {
      setZoom(1);
      setPan({ 
        x: (containerSize.width / 2) - (centerX) - 120,
        y: (containerSize.height / 2) - (centerY) - 200
      });
      return;
    }

    // Calculate bounding box of all visible nodes
    let minX = centerX, maxX = centerX, minY = centerY, maxY = centerY;
    
    visibleBranches.forEach(branch => {
      minX = Math.min(minX, branch.x - nodeRadius - 100);
      maxX = Math.max(maxX, branch.x + nodeRadius + 100);
      minY = Math.min(minY, branch.y - nodeRadius - 100);
      maxY = Math.max(maxY, branch.y + nodeRadius + 100);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const padding = 100;

    // Calculate optimal zoom to fit content
    const zoomX = (containerSize.width - padding * 2) / contentWidth;
    const zoomY = (containerSize.height - padding * 2) / contentHeight;
    const optimalZoom = Math.min(zoomX, zoomY, 2);

    // Center the content with slight offset adjustments
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    const panX = (containerSize.width / 2 - contentCenterX * optimalZoom) - 120;
    const panY = (containerSize.height / 2 - contentCenterY * optimalZoom) - 200;

    setZoom(Math.max(0.3, optimalZoom));
    setPan({ x: panX, y: panY });
  };

  // Touch handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch gesture
      const distance = getDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialZoom(zoom);
      setIsPanning(false);
    } else if (e.touches.length === 1) {
      // Double-tap detection
      const now = Date.now();
      if (now - lastTapTime < 300) {
        // Double tap - reset to center
        resetToCenter();
        setLastTapTime(0);
      } else {
        setLastTapTime(now);
        // Pan gesture
        setIsPanning(true);
        setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    
    if (e.touches.length === 2 && initialPinchDistance) {
      // Pinch zoom around midpoint with damping for smoother control
      const container = containerRef.current.getBoundingClientRect();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - container.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - container.top;
      
      const distance = getDistance(e.touches);
      const scale = distance / initialPinchDistance;
      // Apply damping factor for smoother zoom
      const dampedScale = 1 + (scale - 1) * 0.6;
      const newZoom = Math.max(0.3, Math.min(3, initialZoom * dampedScale));
      
      // Adjust pan to zoom around the pinch center
      const zoomDelta = newZoom / zoom;
      setPan(prev => ({
        x: midX - (midX - prev.x) * zoomDelta,
        y: midY - (midY - prev.y) * zoomDelta
      }));
      
      setZoom(newZoom);
    } else if (e.touches.length === 1 && isPanning) {
      // Pan
      const deltaX = e.touches[0].clientX - lastPanPoint.x;
      const deltaY = e.touches[0].clientY - lastPanPoint.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = () => {
    setInitialPinchDistance(null);
    setIsPanning(false);
  };

  // Mouse wheel zoom around cursor
  const handleWheel = (e) => {
    e.preventDefault();
    
    const container = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - container.left;
    const mouseY = e.clientY - container.top;
    
    // Reduced sensitivity for smoother zoom
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newZoom = Math.max(0.3, Math.min(3, zoom + delta));
    
    // Zoom around cursor position
    const zoomDelta = newZoom / zoom;
    setPan(prev => ({
      x: mouseX - (mouseX - prev.x) * zoomDelta,
      y: mouseY - (mouseY - prev.y) * zoomDelta
    }));
    
    setZoom(newZoom);
  };

  // Calculate branch positions
  const branchPositions = useMemo(() => {
    return Object.keys(categoryConfig).map(category => {
      const config = categoryConfig[category];
      const radian = (config.angle * Math.PI) / 180;
      const x = centerX + branchDistance * Math.cos(radian);
      const y = centerY + branchDistance * Math.sin(radian);
      
      // Filter tasks by collapsed statuses
      const categoryTasks = mindMap.branches[category] || [];
      const visibleTasks = collapsedStatuses.size === 0 
        ? categoryTasks 
        : categoryTasks.filter(t => !collapsedStatuses.has(t.status));
      
      return {
        category,
        x,
        y,
        config,
        tasks: visibleTasks,
        isCollapsed: collapsedBranches.has(category)
      };
    });
  }, [mindMap, collapsedBranches, collapsedStatuses, centerX, centerY, branchDistance]);

  // Auto-center on mount and when content changes
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      // Center the SVG content in the viewport
      const timer = setTimeout(() => {
        resetToCenter();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [tasks?.length, containerSize.width, containerSize.height]);

  // Listen for fullscreen changes and reset view
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      // Reset view when entering or exiting fullscreen
      setTimeout(() => {
        resetToCenter();
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Register touch event listener with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => container.removeEventListener('touchmove', handleTouchMove);
  }, [isPanning, initialPinchDistance, lastPanPoint, zoom, pan]);

  // Calculate dynamic viewBox based on actual content
  const calculateViewBox = useMemo(() => {
    let minX = centerX - centerRadius;
    let maxX = centerX + centerRadius;
    let minY = centerY - centerRadius;
    let maxY = centerY + centerRadius;

    branchPositions.forEach(branch => {
      // Include branch node
      minX = Math.min(minX, branch.x - nodeRadius);
      maxX = Math.max(maxX, branch.x + nodeRadius);
      minY = Math.min(minY, branch.y - nodeRadius);
      maxY = Math.max(maxY, branch.y + nodeRadius);

      // Include task nodes if branch is expanded
      if (!branch.isCollapsed && branch.tasks.length > 0) {
        branch.tasks.slice(0, 5).forEach((task, i) => {
          const taskAngle = (i * 72) - 90;
          const taskRad = (taskAngle * Math.PI) / 180;
          const tx = branch.x + taskNodeDistance * Math.cos(taskRad);
          const ty = branch.y + taskNodeDistance * Math.sin(taskRad);
          
          minX = Math.min(minX, tx - 25);
          maxX = Math.max(maxX, tx + 25);
          minY = Math.min(minY, ty - 25);
          maxY = Math.max(maxY, ty + 25);
        });
      }
    });

    // Add padding (30% of content size)
    const padding = Math.max(200, Math.max(maxX - minX, maxY - minY) * 0.3);
    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + (padding * 2),
      height: (maxY - minY) + (padding * 2)
    };
  }, [branchPositions, collapsedBranches, centerX, centerY, centerRadius, nodeRadius]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  if (mindMap.center?.total === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: tokens.subtle }} />
          <p style={{ color: tokens.subtle }}>
            No active tasks. Add tasks to see the mind map.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
        <div className="flex flex-col gap-3 flex-1 w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <GitBranch className="w-5 h-5" style={{ color: tokens.accent }} />
            <h3 className="font-semibold" style={{ color: tokens.color }}>
              Mind Map
            </h3>
          </div>

          {/* Search and Filters Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: tokens.subtle }} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-1.5 text-xs rounded-lg transition-colors"
                style={{ 
                  borderColor: tokens.border, 
                  color: tokens.color, 
                  border: `1px solid ${tokens.border}`, 
                  backgroundColor: tokens.card 
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                  style={{ color: tokens.subtle }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ borderColor: tokens.border, color: tokens.color, border: `1px solid ${tokens.border}`, backgroundColor: tokens.card }}
            >
              <option value="none">No Sort</option>
              <option value="due_date">Sort by Due Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="energy">Sort by Energy</option>
            </select>

            {/* Assigned User Filter */}
            <select
              value={assignedUserFilter}
              onChange={(e) => setAssignedUserFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ borderColor: tokens.border, color: tokens.color, border: `1px solid ${tokens.border}`, backgroundColor: tokens.card }}
            >
              <option value="all">All Users</option>
              <option value="me">My Tasks</option>
              <option value="unassigned">Unassigned</option>
              {[...new Set(teamMembers.map(m => m.user_email))].map(email => (
                <option key={email} value={email}>{email.split('@')[0]}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ borderColor: tokens.border, color: tokens.color, border: `1px solid ${tokens.border}`, backgroundColor: tokens.card }}
          >
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <div className="h-4 w-px" style={{ backgroundColor: tokens.border }} />
          <button
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            onClick={() => setCollapsedBranches(new Set())}
            style={{ borderColor: tokens.border, color: tokens.color, border: `1px solid ${tokens.border}`, backgroundColor: tokens.card }}
            title="Expand all categories"
          >
            Expand All
          </button>
          <button
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            onClick={() => setCollapsedBranches(new Set(Object.keys(categoryConfig)))}
            style={{ borderColor: tokens.border, color: tokens.color, border: `1px solid ${tokens.border}`, backgroundColor: tokens.card }}
            title="Collapse all categories"
          >
            Collapse All
          </button>
          <div className="h-4 w-px" style={{ backgroundColor: tokens.border }} />
          <button
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${collapsedStatuses.has('done') ? 'opacity-50' : ''}`}
            onClick={() => {
              const newSet = new Set(collapsedStatuses);
              if (newSet.has('done')) newSet.delete('done');
              else newSet.add('done');
              setCollapsedStatuses(newSet);
            }}
            style={{ borderColor: tokens.border, color: tokens.color, border: `1px solid ${tokens.border}`, backgroundColor: tokens.card }}
            title="Toggle done tasks"
          >
            {collapsedStatuses.has('done') ? 'Show' : 'Hide'} Done
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${collapsedStatuses.has('todo') ? 'opacity-50' : ''}`}
            onClick={() => {
              const newSet = new Set(collapsedStatuses);
              if (newSet.has('todo')) newSet.delete('todo');
              else newSet.add('todo');
              setCollapsedStatuses(newSet);
            }}
            style={{ borderColor: tokens.border, color: tokens.color, border: `1px solid ${tokens.border}`, backgroundColor: tokens.card }}
            title="Toggle todo tasks"
          >
            {collapsedStatuses.has('todo') ? 'Show' : 'Hide'} To Do
          </button>
          <div className="h-4 w-px" style={{ backgroundColor: tokens.border }} />
          <button
            className="p-1.5 rounded-lg transition-colors"
            onClick={() => setZoom(Math.max(0.3, zoom - 0.15))}
            style={{ borderColor: tokens.border, color: tokens.color, border: `1px solid ${tokens.border}`, backgroundColor: tokens.card }}
          >
            <ZoomOut className="w-4 h-4" style={{ color: tokens.color }} />
          </button>
          <span className="text-xs font-medium px-2" style={{ color: tokens.subtle }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="p-1.5 rounded-lg transition-colors"
            onClick={() => setZoom(Math.min(3, zoom + 0.15))}
            style={{ borderColor: tokens.border, color: tokens.color, border: `1px solid ${tokens.border}`, backgroundColor: tokens.card }}
          >
            <ZoomIn className="w-4 h-4" style={{ color: tokens.color }} />
          </button>
          <button
            className="p-1.5 rounded-lg transition-colors"
            onClick={handleAutoFit}
            style={{ borderColor: tokens.border, color: tokens.color, border: `1px solid ${tokens.border}`, backgroundColor: tokens.card }}
            title="Auto-fit all visible nodes"
          >
            <Maximize2 className="w-4 h-4" style={{ color: tokens.color }} />
          </button>
          <button
            className="p-1.5 rounded-lg transition-colors"
            onClick={toggleFullscreen}
            style={{ borderColor: tokens.border, color: tokens.color, border: `1px solid ${tokens.border}`, backgroundColor: tokens.card }}
            title="Toggle fullscreen"
          >
            <span style={{ color: tokens.color }}>⛶</span>
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative overflow-hidden rounded-xl touch-none select-none transition-all duration-300"
        style={{ 
          backgroundColor: `${tokens.accent}05`,
          height: isFullscreen ? '100vh' : '600px',
          width: isFullscreen ? '100vw' : '100%',
          cursor: isPanning ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onDoubleClick={resetToCenter}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            transition: isPanning || initialPinchDistance ? 'none' : 'transform 0.2s ease-out',
            width: '100%',
            height: '100%'
          }}
        >
          <svg
            viewBox={`${calculateViewBox.x} ${calculateViewBox.y} ${calculateViewBox.width} ${calculateViewBox.height}`}
            className="w-full h-full"
            style={{ minWidth: `${calculateViewBox.width}px`, minHeight: `${calculateViewBox.height}px` }}
          >
          {/* Connection lines from center to branches */}
          {branchPositions.map(branch => (
            !branch.isCollapsed && branch.tasks.length > 0 && (
              <line
                key={branch.category}
                x1={centerX}
                y1={centerY}
                x2={branch.x}
                y2={branch.y}
                stroke={branch.config.color}
                strokeWidth="3"
                opacity="0.3"
                strokeDasharray="5,5"
                className="transition-all duration-300"
              />
            )
          ))}

          {/* Branch nodes */}
          {branchPositions.map(branch => {
            const taskCount = branch.tasks.length;
            if (taskCount === 0) return null;

            return (
              <g 
                key={branch.category}
                className="transition-all duration-300"
                style={{ opacity: branch.isCollapsed ? 0.4 : 1 }}
              >
                {/* Branch circle */}
                <circle
                 cx={branch.x}
                 cy={branch.y}
                 r={nodeRadius}
                 fill={tokens.card}
                 stroke={branch.config.color}
                 strokeWidth="4"
                 className="transition-all hover:stroke-[6] cursor-pointer"
                 style={{ 
                   filter: selectedNode === branch.category ? 'drop-shadow(0 0 8px currentColor)' : 'none',
                   transform: branch.isCollapsed ? 'scale(0.8)' : 'scale(1)',
                   transformOrigin: 'center'
                 }}
                 onClick={(e) => {
                   e.stopPropagation();
                   toggleBranch(branch.category);
                 }}
                />
                
                {/* Icon */}
                <text
                  x={branch.x}
                  y={branch.y - 5}
                  fontSize="24"
                  textAnchor="middle"
                >
                  {branch.config.icon}
                </text>

                {/* Count badge */}
                <circle
                  cx={branch.x + nodeRadius - 15}
                  cy={branch.y - nodeRadius + 15}
                  r="18"
                  fill={branch.config.color}
                />
                <text
                  x={branch.x + nodeRadius - 15}
                  y={branch.y - nodeRadius + 20}
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  fill="white"
                >
                  {taskCount}
                </text>

                {/* Category label */}
                <text
                  x={branch.x}
                  y={branch.y + nodeRadius + 20}
                  fontSize="13"
                  fontWeight="600"
                  textAnchor="middle"
                  fill={tokens.color}
                >
                  {branch.category}
                </text>

                {/* Collapse/Expand indicator */}
                {!branch.isCollapsed && branch.tasks.length > 0 && (
                  <text
                    x={branch.x}
                    y={branch.y + nodeRadius + 35}
                    fontSize="10"
                    textAnchor="middle"
                    fill={tokens.subtle}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBranch(branch.category);
                    }}
                  >
                    Click to collapse
                  </text>
                )}

                {branch.isCollapsed && (
                  <text
                    x={branch.x}
                    y={branch.y + nodeRadius + 35}
                    fontSize="10"
                    textAnchor="middle"
                    fill={tokens.accent}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBranch(branch.category);
                    }}
                  >
                    Click to expand
                  </text>
                )}

                {/* Task nodes around branch */}
                {!branch.isCollapsed && branch.tasks.slice(0, 5).map((task, i) => {
                  const taskAngle = (i * 72) - 90; // 360/5 = 72 degrees
                  const taskRad = (taskAngle * Math.PI) / 180;
                  const tx = branch.x + taskNodeDistance * Math.cos(taskRad);
                  const ty = branch.y + taskNodeDistance * Math.sin(taskRad);

                  const priorityColors = {
                    urgent: '#DC2626',
                    high: '#EF4444',
                    medium: '#F59E0B',
                    low: '#10B981'
                  };

                  return (
                    <g key={task.id}>
                      {/* Connection to branch */}
                      <line
                        x1={branch.x}
                        y1={branch.y}
                        x2={tx}
                        y2={ty}
                        stroke={branch.config.color}
                        strokeWidth="2"
                        opacity="0.2"
                      />
                      
                      {/* Task circle - filled with priority color */}
                      <circle
                       cx={tx}
                       cy={ty}
                       r="25"
                       fill={priorityColors[task.priority]}
                       fillOpacity="0.2"
                       stroke={priorityColors[task.priority]}
                       strokeWidth="3"
                       className="transition-all hover:r-[28] hover:stroke-[4]"
                       style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                       onClick={(e) => {
                         e.stopPropagation();
                         onTaskClick?.(task);
                       }}
                      />

                      {/* Priority indicator with icon */}
                      <circle
                        cx={tx}
                        cy={ty}
                        r="10"
                        fill={priorityColors[task.priority]}
                      />
                      <text
                        x={tx}
                        y={ty + 4}
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        fill="white"
                      >
                        {task.priority === 'urgent' ? '!' : task.priority === 'high' ? 'H' : task.priority === 'medium' ? 'M' : 'L'}
                      </text>

                      {/* Task title tooltip (on hover) */}
                      <title>{task.title}</title>
                    </g>
                  );
                })}

                {/* "More" indicator if more than 5 tasks */}
                {branch.tasks.length > 5 && (
                  <text
                    x={branch.x}
                    y={branch.y + 15}
                    fontSize="10"
                    textAnchor="middle"
                    fill={tokens.subtle}
                  >
                    +{branch.tasks.length - 5} more
                  </text>
                )}
              </g>
            );
          })}

          {/* Center node */}
          <g style={{ cursor: 'default' }}>
            <circle
              cx={centerX}
              cy={centerY}
              r={centerRadius}
              fill={tokens.card}
              stroke={tokens.accent}
              strokeWidth="5"
              style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}
            />
            
            <text
              x={centerX}
              y={centerY - 10}
              fontSize="16"
              fontWeight="bold"
              textAnchor="middle"
              fill={tokens.color}
            >
              {mindMap.center.label}
            </text>
            
            <text
              x={centerX}
              y={centerY + 15}
              fontSize="24"
              fontWeight="bold"
              textAnchor="middle"
              fill={tokens.accent}
            >
              {mindMap.center.total}
            </text>
            
            <text
              x={centerX}
              y={centerY + 32}
              fontSize="11"
              textAnchor="middle"
              fill={tokens.subtle}
            >
              active tasks
            </text>
          </g>
          </svg>
        </div>

        {/* Controls hint */}
        <div 
          className="absolute bottom-4 right-4 px-3 py-2 rounded-lg text-xs pointer-events-none space-y-1"
          style={{ 
            backgroundColor: tokens.card,
            color: tokens.subtle,
            border: `1px solid ${tokens.border}`,
            maxWidth: '200px'
          }}
        >
          <div>🖱️ Drag to pan • Scroll to zoom</div>
          <div>👆 Pinch to zoom • Double-tap to reset</div>
          <div className="font-semibold" style={{ color: tokens.accent }}>
            Zoom: {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Scale indicators */}
        <div 
          className="absolute top-4 left-4 px-3 py-2 rounded-lg text-xs font-medium pointer-events-none"
          style={{ 
            backgroundColor: tokens.card,
            color: tokens.accent,
            border: `1px solid ${tokens.border}`
          }}
        >
          📊 Scale: {zoom < 0.5 ? 'Overview' : zoom > 1.5 ? 'Detailed' : 'Normal'}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: tokens.border }}>
        <div>
          <div className="text-xs font-semibold mb-2" style={{ color: tokens.color }}>Categories</div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {Object.entries(categoryConfig).map(([category, config]) => (
              <div key={category} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border-2"
                  style={{ borderColor: config.color }}
                />
                <span style={{ color: tokens.subtle }}>
                  {config.icon} {category}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold mb-2" style={{ color: tokens.color }}>Priority Levels</div>
          <div className="grid grid-cols-4 gap-3 text-xs">
            {Object.entries(priorityColors).map(([priority, color]) => (
              <div key={priority} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span style={{ color: tokens.subtle }}>
                  {priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default MindMapView;