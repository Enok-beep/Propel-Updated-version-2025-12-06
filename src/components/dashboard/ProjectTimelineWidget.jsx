import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { Briefcase, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function ProjectTimelineWidget({ projects = [] }) {
  const { tokens } = useTheme();

  const activeProjects = projects
    .filter(p => p.status === 'active' || p.status === 'planning')
    .slice(0, 4);

  const getStatusColor = (status) => {
    const colors = {
      planning: '#3B82F6',
      active: tokens.accent,
      on_hold: '#F59E0B',
      completed: '#10B981'
    };
    return colors[status] || tokens.accent;
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="w-5 h-5" style={{ color: tokens.accent }} />
        <h3 className="font-semibold" style={{ color: tokens.color }}>
          Active Projects
        </h3>
      </div>

      <div className="space-y-3">
        {activeProjects.map(project => (
          <div 
            key={project.id}
            className="p-3 rounded-lg border"
            style={{ borderColor: tokens.border }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: project.color || getStatusColor(project.status) }}
                />
                <span className="font-medium text-sm" style={{ color: tokens.color }}>
                  {project.name}
                </span>
              </div>
              <span 
                className="text-xs px-2 py-1 rounded-full"
                style={{ 
                  backgroundColor: `${getStatusColor(project.status)}20`,
                  color: getStatusColor(project.status)
                }}
              >
                {project.status}
              </span>
            </div>
            
            {project.end_date && (
              <div className="flex items-center gap-1 text-xs" style={{ color: tokens.subtle }}>
                <Calendar className="w-3 h-3" />
                Due {format(new Date(project.end_date), 'MMM d, yyyy')}
              </div>
            )}
          </div>
        ))}

        {activeProjects.length === 0 && (
          <div className="text-center py-4" style={{ color: tokens.subtle }}>
            No active projects
          </div>
        )}
      </div>
    </Card>
  );
}