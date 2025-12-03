import React, { useMemo, useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '../ui-custom/Card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { GanttChart } from '../projects/GanttChart';
import { ProjectQA } from './ProjectQA';
import { TemplateManager } from '../projects/TemplateManager';
import { Plus, FolderKanban, TrendingUp, Users, CheckCircle2, Clock, Calendar as CalendarIcon, FileText, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ProjectDashboard({ teamId, userRole }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'gantt'
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const canManageProjects = ['owner', 'admin'].includes(userRole);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', teamId],
    queryFn: () => base44.entities.Project.filter({ team_id: teamId }),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data) => {
      const project = await base44.entities.Project.create(data);
      
      // If using template, create default tasks
      if (data.template) {
        const template = data.template;
        const startDate = new Date();
        
        // Create tasks from template
        const taskPromises = (template.default_tasks || []).map(async (taskTemplate) => {
          const dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + (taskTemplate.days_offset || 0));
          
          return base44.entities.Task.create({
            title: taskTemplate.title,
            description: taskTemplate.description || '',
            priority: taskTemplate.priority || 'medium',
            category: taskTemplate.category || 'work',
            estimated_minutes: taskTemplate.estimated_minutes || 25,
            due_date: dueDate.toISOString(),
            team_id: data.team_id,
            project_id: project.id,
            assigned_to: taskTemplate.assigned_to_role ? data.owner_email : null
          });
        });
        
        await Promise.all(taskPromises);
        
        // Update template use count
        await base44.entities.ProjectTemplate.update(template.id, {
          use_count: (template.use_count || 0) + 1
        });
      }
      
      // Notify team members
      const teamMembers = await base44.entities.TeamMember.filter({ team_id: data.team_id, status: 'active' });
      const memberEmails = teamMembers.map(m => m.user_email);
      
      if (memberEmails.length > 0) {
        const { notifyProjectMilestone } = await import('../notifications/NotificationHelper');
        await notifyProjectMilestone(
          data.name,
          memberEmails,
          'New project created',
          data.team_id
        );
      }
      
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowProjectForm(false);
      setSelectedTemplate(null);
    },
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: async ({ project, templateData }) => {
      const projectTasks = allTasks.filter(t => t.project_id === project.id);
      
      const defaultTasks = projectTasks.map(task => ({
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        estimated_minutes: task.estimated_minutes,
        days_offset: 0,
        assigned_to_role: task.assigned_to ? 'owner' : null
      }));
      
      return base44.entities.ProjectTemplate.create({
        name: templateData.name,
        description: templateData.description,
        team_id: project.team_id,
        color: project.color,
        default_tasks: defaultTasks,
        default_milestones: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTemplates'] });
    },
  });

  const getProjectMetrics = (project) => {
    const projectTasks = allTasks.filter(t => t.team_id === teamId);
    
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.status === 'done').length;
    const inProgress = projectTasks.filter(t => t.status === 'in_progress').length;
    const overdue = projectTasks.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    ).length;

    return { total, completed, inProgress, overdue, progress: total > 0 ? (completed / total) * 100 : 0 };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5" style={{ color: tokens.accent }} />
          <h3 className="font-semibold text-lg" style={{ color: tokens.color }}>
            Projects
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border" style={{ borderColor: tokens.border }}>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "px-3 py-1.5 text-xs rounded-l-lg transition-colors",
                viewMode === 'grid' ? "text-white" : ""
              )}
              style={{ 
                backgroundColor: viewMode === 'grid' ? tokens.accent : 'transparent',
                color: viewMode === 'grid' ? 'white' : tokens.subtle
              }}
            >
              <FolderKanban className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={cn(
                "px-3 py-1.5 text-xs rounded-r-lg transition-colors",
                viewMode === 'gantt' ? "text-white" : ""
              )}
              style={{ 
                backgroundColor: viewMode === 'gantt' ? tokens.accent : 'transparent',
                color: viewMode === 'gantt' ? 'white' : tokens.subtle
              }}
            >
              <CalendarIcon className="w-3 h-3" />
            </button>
          </div>

          {canManageProjects && (
            <>
              <Button
                onClick={() => setShowTemplateManager(true)}
                size="sm"
                variant="outline"
                style={{ borderColor: tokens.border }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Templates
              </Button>
              <Button
                onClick={() => setShowProjectForm(true)}
                size="sm"
                style={{ backgroundColor: tokens.accent }}
                className="text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </>
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: tokens.subtle }} />
            <p style={{ color: tokens.subtle }}>
              No projects yet. {canManageProjects ? 'Create one to get started!' : 'Ask an admin to create one.'}
            </p>
          </div>
        </Card>
      ) : viewMode === 'gantt' ? (
        <div className="space-y-4">
          <Card>
            <GanttChart 
              tasks={allTasks.filter(t => t.team_id === teamId)} 
              onTaskClick={(task) => {
                const event = new CustomEvent('openTaskDetail', { detail: task });
                window.dispatchEvent(event);
              }}
            />
          </Card>
          
          {selectedProject && (
            <ProjectQA projectId={selectedProject} teamId={teamId} />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(project => {
            const metrics = getProjectMetrics(project);
            
            return (
              <Card 
                key={project.id}
                className="cursor-pointer hover:shadow-lg transition-all"
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${project.color}20` }}
                  >
                    <FolderKanban className="w-5 h-5" style={{ color: project.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate" style={{ color: tokens.color }}>
                      {project.name}
                    </h4>
                    {project.description && (
                      <p className="text-xs line-clamp-2 mt-1" style={{ color: tokens.subtle }}>
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span style={{ color: tokens.subtle }}>Progress</span>
                    <span style={{ color: tokens.color }}>{Math.round(metrics.progress)}%</span>
                  </div>
                  <div 
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: `${tokens.accent}15` }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${metrics.progress}%`,
                        backgroundColor: tokens.accent
                      }}
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" style={{ color: '#10B981' }} />
                    <span style={{ color: tokens.subtle }}>{metrics.completed}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" style={{ color: '#3B82F6' }} />
                    <span style={{ color: tokens.subtle }}>{metrics.inProgress}</span>
                  </div>
                  {metrics.overdue > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" style={{ color: '#EF4444' }} />
                      <span style={{ color: '#EF4444' }}>{metrics.overdue}</span>
                    </div>
                  )}
                </div>

                {/* Status Badge and Actions */}
                <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: tokens.border }}>
                  <span 
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ 
                      backgroundColor: `${tokens.accent}15`,
                      color: tokens.accent 
                    }}
                  >
                    {project.status}
                  </span>
                  <div className="flex items-center gap-2">
                    {project.members?.length > 0 && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: tokens.subtle }}>
                        <Users className="w-3 h-3" />
                        {project.members.length}
                      </div>
                    )}
                    {canManageProjects && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const templateName = prompt(`Save "${project.name}" as template. Enter template name:`, `${project.name} Template`);
                          if (templateName) {
                            saveAsTemplateMutation.mutate({
                              project,
                              templateData: { name: templateName, description: project.description }
                            });
                          }
                        }}
                        className="h-6 px-2"
                        style={{ color: tokens.subtle }}
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Template Manager */}
      {canManageProjects && (
        <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
          <DialogContent 
            className="max-w-3xl"
            style={{ backgroundColor: tokens.card, borderColor: tokens.border }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: tokens.color }}>Project Templates</DialogTitle>
            </DialogHeader>
            <TemplateManager
              teamId={teamId}
              onSelectTemplate={(template) => {
                setSelectedTemplate(template);
                setShowTemplateManager(false);
                setShowProjectForm(true);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Project Form */}
      {canManageProjects && (
        <Dialog open={showProjectForm} onOpenChange={setShowProjectForm}>
          <DialogContent style={{ backgroundColor: tokens.card, borderColor: tokens.border }}>
            <DialogHeader>
              <DialogTitle style={{ color: tokens.color }}>
                {selectedTemplate ? `Create from "${selectedTemplate.name}"` : 'Create New Project'}
              </DialogTitle>
            </DialogHeader>
            <ProjectForm
              teamId={teamId}
              template={selectedTemplate}
              onSubmit={(data) => createProjectMutation.mutate(data)}
              onCancel={() => {
                setShowProjectForm(false);
                setSelectedTemplate(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ProjectForm({ teamId, template, onSubmit, onCancel }) {
  const { tokens } = useTheme();
  const [formData, setFormData] = useState({
    name: template?.name?.replace(' Template', '') || '',
    description: template?.description || '',
    team_id: teamId,
    status: 'active',
    color: template?.color || '#3B82F6'
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ 
      ...formData, 
      owner_email: user.email,
      template: template 
    });
  };

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {template && (
        <div 
          className="p-3 rounded-lg flex items-start gap-2"
          style={{ backgroundColor: `${tokens.accent}10` }}
        >
          <FileText className="w-4 h-4 mt-0.5" style={{ color: tokens.accent }} />
          <div className="text-sm">
            <div className="font-medium" style={{ color: tokens.color }}>
              Using Template: {template.name}
            </div>
            <div className="text-xs mt-1" style={{ color: tokens.subtle }}>
              {template.default_tasks?.length || 0} tasks will be created automatically
            </div>
          </div>
        </div>
      )}
      
      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
          Project Name
        </label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Website Redesign"
          required
          style={{ borderColor: tokens.border }}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
          Description
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief project description..."
          style={{ borderColor: tokens.border }}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
          Color
        </label>
        <div className="flex gap-2">
          {colors.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={cn(
                "w-8 h-8 rounded-full transition-all",
                formData.color === color && "ring-2 ring-offset-2"
              )}
              style={{ backgroundColor: color, ringColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit"
          style={{ backgroundColor: tokens.accent }}
          className="text-white"
        >
          Create Project
        </Button>
      </div>
    </form>
  );
}

export default ProjectDashboard;