import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui-custom/Card';
import { FileText, Plus, Trash2, Copy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TemplateManager({ teamId, onSelectTemplate }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['projectTemplates', teamId],
    queryFn: () => base44.entities.ProjectTemplate.filter({ team_id: teamId }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTemplates'] });
    },
  });

  const handleDelete = (template) => {
    if (confirm(`Delete template "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: tokens.color }}>
          Project Templates
        </h3>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setShowCreateDialog(true);
          }}
          size="sm"
          style={{ backgroundColor: tokens.accent }}
          className="text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {isLoading ? (
        <p style={{ color: tokens.subtle }}>Loading templates...</p>
      ) : templates.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" style={{ color: tokens.subtle }} />
            <p style={{ color: tokens.subtle }}>No templates yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowCreateDialog(true)}
              style={{ borderColor: tokens.border }}
            >
              Create your first template
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: template.color }}
                    />
                    <h4 className="font-medium" style={{ color: tokens.color }}>
                      {template.name}
                    </h4>
                  </div>
                  {template.description && (
                    <p className="text-sm mt-1" style={{ color: tokens.subtle }}>
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: tokens.subtle }}>
                    <span>{template.default_tasks?.length || 0} tasks</span>
                    <span>{template.default_milestones?.length || 0} milestones</span>
                    <span>Used {template.use_count || 0} times</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectTemplate?.(template)}
                    style={{ color: tokens.accent }}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Use
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowCreateDialog(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template)}
                    className="text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent style={{ backgroundColor: tokens.card }}>
          <DialogHeader>
            <DialogTitle style={{ color: tokens.color }}>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editingTemplate}
            teamId={teamId}
            onClose={() => {
              setShowCreateDialog(false);
              setEditingTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateForm({ template, teamId, onClose }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [color, setColor] = useState(template?.color || '#3B82F6');
  const [tasks, setTasks] = useState(template?.default_tasks || []);
  const [milestones, setMilestones] = useState(template?.default_milestones || []);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (template) {
        return base44.entities.ProjectTemplate.update(template.id, data);
      }
      return base44.entities.ProjectTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTemplates'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      name,
      description,
      color,
      team_id: teamId,
      default_tasks: tasks,
      default_milestones: milestones,
    });
  };

  const addTask = () => {
    setTasks([...tasks, {
      title: '',
      description: '',
      priority: 'medium',
      category: 'work',
      estimated_minutes: 25,
      days_offset: 0,
      assigned_to_role: null
    }]);
  };

  const removeTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index, field, value) => {
    const updated = [...tasks];
    updated[index][field] = value;
    setTasks(updated);
  };

  const addMilestone = () => {
    setMilestones([...milestones, { title: '', days_offset: 0 }]);
  };

  const removeMilestone = (index) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: tokens.color }}>
          Template Name
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Product Launch, Sprint Template"
          required
          style={{ borderColor: tokens.border }}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: tokens.color }}>
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this template for?"
          style={{ borderColor: tokens.border }}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: tokens.color }}>
          Color
        </label>
        <div className="flex gap-2">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                "w-8 h-8 rounded-lg transition-all",
                color === c && "ring-2 ring-offset-2"
              )}
              style={{ backgroundColor: c, ringColor: tokens.accent }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium" style={{ color: tokens.color }}>
            Default Tasks
          </label>
          <Button type="button" variant="outline" size="sm" onClick={addTask}>
            <Plus className="w-3 h-3 mr-1" />
            Add Task
          </Button>
        </div>
        <div className="space-y-2">
          {tasks.map((task, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border space-y-2"
              style={{ borderColor: tokens.border }}
            >
              <div className="flex items-start gap-2">
                <Input
                  value={task.title}
                  onChange={(e) => updateTask(index, 'title', e.target.value)}
                  placeholder="Task title"
                  className="flex-1"
                  style={{ borderColor: tokens.border }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTask(index)}
                  className="text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Input
                  type="number"
                  value={task.days_offset}
                  onChange={(e) => updateTask(index, 'days_offset', Number(e.target.value))}
                  placeholder="Days from start"
                  style={{ borderColor: tokens.border }}
                />
                <select
                  value={task.priority}
                  onChange={(e) => updateTask(index, 'priority', e.target.value)}
                  className="px-2 py-1 rounded border"
                  style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium" style={{ color: tokens.color }}>
            Milestones
          </label>
          <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
            <Plus className="w-3 h-3 mr-1" />
            Add Milestone
          </Button>
        </div>
        <div className="space-y-2">
          {milestones.map((milestone, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg border"
              style={{ borderColor: tokens.border }}
            >
              <Input
                value={milestone.title}
                onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                placeholder="Milestone name"
                className="flex-1"
                style={{ borderColor: tokens.border }}
              />
              <Input
                type="number"
                value={milestone.days_offset}
                onChange={(e) => updateMilestone(index, 'days_offset', Number(e.target.value))}
                placeholder="Days"
                className="w-20"
                style={{ borderColor: tokens.border }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeMilestone(index)}
                className="text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!name.trim() || saveMutation.isPending}
          style={{ backgroundColor: tokens.accent }}
          className="text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {template ? 'Update' : 'Create'} Template
        </Button>
      </div>
    </form>
  );
}

export default TemplateManager;