import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';
import { 
  Search, CheckSquare, Calendar, Users, Settings, Plus, 
  Hash, FolderKanban, Clock, Sparkles, Home, TrendingUp,
  MessageSquare, Award, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple fuzzy search implementation
function fuzzyMatch(text, query) {
  if (!query) return true;
  
  const searchText = text.toLowerCase();
  const searchQuery = query.toLowerCase().trim();
  
  // Direct substring match (highest priority)
  if (searchText.includes(searchQuery)) return { score: 100, matched: true };
  
  // Fuzzy match - all query chars must appear in order
  let queryIndex = 0;
  let score = 0;
  
  for (let i = 0; i < searchText.length && queryIndex < searchQuery.length; i++) {
    if (searchText[i] === searchQuery[queryIndex]) {
      score += (searchQuery.length - queryIndex) * 10;
      queryIndex++;
    }
  }
  
  if (queryIndex === searchQuery.length) {
    return { score, matched: true };
  }
  
  return { score: 0, matched: false };
}

export function CommandPalette({ open, onClose }) {
  const { tokens } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-updated_date', 100),
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: open,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    enabled: open,
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const workMode = preferences[0]?.work_mode || 'personal';

  // Define all searchable items
  const allItems = useMemo(() => {
    const items = [];

    // Navigation items
    const navItems = [
      { type: 'nav', title: 'Dashboard', icon: Home, action: () => window.location.href = createPageUrl('Dashboard') },
      { type: 'nav', title: 'Tasks', icon: CheckSquare, action: () => window.location.href = createPageUrl('Tasks') },
      { type: 'nav', title: 'Calendar', icon: Calendar, action: () => window.location.href = createPageUrl('Calendar') },
      { type: 'nav', title: 'Focus Mode', icon: Clock, action: () => window.location.href = createPageUrl('Focus') },
      { type: 'nav', title: 'Analytics', icon: BarChart3, action: () => window.location.href = createPageUrl('Analytics') },
      { type: 'nav', title: 'Insights', icon: TrendingUp, action: () => window.location.href = createPageUrl('Insights') },
      { type: 'nav', title: 'Settings', icon: Settings, action: () => window.location.href = createPageUrl('Settings') },
    ];

    if (workMode === 'team') {
      navItems.push(
        { type: 'nav', title: 'Team Dashboard', icon: Users, action: () => window.location.href = createPageUrl('TeamDashboard') },
        { type: 'nav', title: 'Teams', icon: Users, action: () => window.location.href = createPageUrl('Teams') },
        { type: 'nav', title: 'Meetings', icon: MessageSquare, action: () => window.location.href = createPageUrl('Meetings') }
      );
    }

    items.push(...navItems);

    // Quick actions
    items.push(
      { type: 'action', title: 'Create New Task', icon: Plus, subtitle: 'Add a new task', action: () => { onClose(); setTimeout(() => window.location.href = createPageUrl('Tasks'), 100); } },
      { type: 'action', title: 'Create New Project', icon: FolderKanban, subtitle: 'Start a new project', action: () => { onClose(); setTimeout(() => window.location.href = createPageUrl('TeamDashboard'), 100); } },
    );

    // Tasks
    tasks.forEach(task => {
      items.push({
        type: 'task',
        title: task.title,
        subtitle: `${task.category} • ${task.priority} priority`,
        icon: CheckSquare,
        badge: task.status,
        action: () => {
          onClose();
          setTimeout(() => window.location.href = createPageUrl('Tasks'), 100);
        }
      });
    });

    // Projects
    projects.forEach(project => {
      items.push({
        type: 'project',
        title: project.name,
        subtitle: project.description,
        icon: FolderKanban,
        color: project.color,
        action: () => {
          onClose();
          setTimeout(() => window.location.href = createPageUrl('TeamDashboard'), 100);
        }
      });
    });

    // Teams
    teams.forEach(team => {
      items.push({
        type: 'team',
        title: team.name,
        subtitle: team.description,
        icon: Users,
        emoji: team.avatar,
        action: () => {
          onClose();
          setTimeout(() => window.location.href = createPageUrl('Teams'), 100);
        }
      });
    });

    return items;
  }, [tasks, projects, teams, workMode, onClose]);

  // Filter and sort items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return allItems.slice(0, 20); // Show top 20 when no query
    }

    const results = allItems
      .map(item => {
        const titleMatch = fuzzyMatch(item.title, query);
        const subtitleMatch = item.subtitle ? fuzzyMatch(item.subtitle, query) : { score: 0, matched: false };
        
        return {
          item,
          score: Math.max(titleMatch.score, subtitleMatch.score),
          matched: titleMatch.matched || subtitleMatch.matched
        };
      })
      .filter(r => r.matched)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => r.item);

    return results;
  }, [allItems, query]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredItems, selectedIndex, onClose]);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const getTypeLabel = (type) => {
    const labels = {
      nav: '🧭 Navigate',
      action: '⚡ Action',
      task: '✓ Task',
      project: '📁 Project',
      team: '👥 Team'
    };
    return labels[type] || type;
  };

  const getBadgeColor = (status) => {
    const colors = {
      todo: '#94A3B8',
      in_progress: '#3B82F6',
      done: '#10B981'
    };
    return colors[status] || '#94A3B8';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl p-0 gap-0 overflow-hidden"
        style={{ backgroundColor: tokens.card, borderColor: tokens.border }}
        hideClose
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: tokens.border }}>
          <Search className="w-5 h-5" style={{ color: tokens.subtle }} />
          <Input
            ref={inputRef}
            placeholder="Type to search tasks, projects, or navigate..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="border-0 focus-visible:ring-0 text-base"
            style={{ backgroundColor: 'transparent', color: tokens.color }}
          />
          <kbd 
            className="px-2 py-1 text-xs rounded border"
            style={{ borderColor: tokens.border, color: tokens.subtle }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div 
          ref={listRef}
          className="max-h-[400px] overflow-y-auto"
        >
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center" style={{ color: tokens.subtle }}>
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No results found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              
              return (
                <button
                  key={`${item.type}-${index}`}
                  onClick={item.action}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-left transition-all",
                    "hover:bg-opacity-50 border-l-2"
                  )}
                  style={{
                    backgroundColor: isSelected ? `${tokens.accent}15` : 'transparent',
                    borderColor: isSelected ? tokens.accent : 'transparent'
                  }}
                >
                  {/* Icon */}
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: item.color ? `${item.color}20` : `${tokens.accent}15`,
                      color: item.color || tokens.accent
                    }}
                  >
                    {item.emoji ? (
                      <span className="text-lg">{item.emoji}</span>
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span 
                        className="font-medium truncate"
                        style={{ color: tokens.color }}
                      >
                        {item.title}
                      </span>
                      {item.badge && (
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: `${getBadgeColor(item.badge)}20`,
                            color: getBadgeColor(item.badge)
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <div className="text-xs truncate" style={{ color: tokens.subtle }}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>

                  {/* Type Badge */}
                  <div 
                    className="text-xs px-2 py-1 rounded"
                    style={{ 
                      backgroundColor: `${tokens.accent}10`,
                      color: tokens.subtle 
                    }}
                  >
                    {getTypeLabel(item.type)}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-between px-4 py-2 text-xs border-t"
          style={{ borderColor: tokens.border, color: tokens.subtle }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border" style={{ borderColor: tokens.border }}>↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border" style={{ borderColor: tokens.border }}>↵</kbd>
              Select
            </span>
          </div>
          <span>{filteredItems.length} results</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;