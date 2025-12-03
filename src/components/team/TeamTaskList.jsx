import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskDetailSheet } from '../calendar/TaskDetailSheet';
import { TaskForm } from '../tasks/TaskForm';
import { TaskDependencyGraph } from '../tasks/TaskDependencyGraph';
import { Clock, User, MessageSquare, Plus, Filter, GitBranch } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TeamTaskList({ teamId, teamMembers, userRole }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDependencyGraph, setShowDependencyGraph] = useState(false);

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-updated_date', 100),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['taskComments'],
    queryFn: () => base44.entities.TaskComment.list(),
  });

  const teamTasks = allTasks.filter(t => t.team_id === teamId);

  const filteredTasks = teamTasks.filter(task => {
    if (filterAssignee !== 'all' && task.assigned_to !== filterAssignee) return false;
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    return true;
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data, previousTask }) => {
      await base44.entities.Task.update(id, data);
      
      // Notify on status change or assignment change
      if (previousTask && user) {
        const { notifyTaskStatusChange, notifyTaskAssigned, notifyWatchers } = await import('../notifications/NotificationHelper');
        
        // Status change notification
        if (data.status && data.status !== previousTask.status) {
          if (data.assigned_to && data.assigned_to !== user.email) {
            await notifyTaskStatusChange(
              previousTask.title,
              data.assigned_to,
              data.status,
              user.full_name || user.email,
              id
            );
          }
          
          // Notify watchers
          if (previousTask.watchers?.length > 0) {
            const watchers = previousTask.watchers.filter(w => w !== user.email);
            if (watchers.length > 0) {
              await notifyWatchers(
                previousTask.title,
                watchers,
                `changed status to ${data.status}`,
                user.full_name || user.email,
                id
              );
            }
          }
        }
        
        // Assignment change notification
        if (data.assigned_to && data.assigned_to !== previousTask.assigned_to && data.assigned_to !== user.email) {
          await notifyTaskAssigned(
            previousTask.title,
            data.assigned_to,
            user.full_name || user.email,
            id
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTask(null);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create({ ...data, team_id: teamId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowTaskForm(false);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTask(null);
    },
  });

  const handleCompleteTask = (task) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { 
        status: task.status === 'done' ? 'todo' : 'done',
        completed_at: task.status === 'done' ? null : new Date().toISOString()
      },
      previousTask: task
    });
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setSelectedTask(null);
    setShowTaskForm(true);
  };

  const handleDeleteTask = (task) => {
    if (confirm('Delete this task?')) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const handleQuickAssign = (taskId, assignee) => {
    const task = allTasks.find(t => t.id === taskId);
    updateTaskMutation.mutate({
      id: taskId,
      data: { assigned_to: assignee || null },
      previousTask: task
    });
  };

  const getTaskCommentCount = (taskId) => {
    return comments.filter(c => c.task_id === taskId).length;
  };

  const priorityColors = {
    urgent: '#DC2626',
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981'
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={() => { setEditingTask(null); setShowTaskForm(true); }}
          style={{ backgroundColor: tokens.accent }}
          className="text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Team Task
        </Button>

        <Button
          onClick={() => setShowDependencyGraph(!showDependencyGraph)}
          variant="outline"
          style={{ borderColor: tokens.border }}
        >
          <GitBranch className="w-4 h-4 mr-2" />
          {showDependencyGraph ? 'Hide' : 'Show'} Graph
        </Button>

        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-4 h-4" style={{ color: tokens.subtle }} />
          
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-40" style={{ borderColor: tokens.border }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamMembers.map(member => (
                <SelectItem key={member.user_email} value={member.user_email}>
                  {member.user_email.split('@')[0]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32" style={{ borderColor: tokens.border }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dependency Graph */}
      {showDependencyGraph && (
        <div className="mb-6">
          <TaskDependencyGraph 
            tasks={teamTasks} 
            onTaskClick={(task) => setSelectedTask(task)}
          />
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div 
            className="text-center py-12 rounded-2xl border"
            style={{ borderColor: tokens.border }}
          >
            <p style={{ color: tokens.subtle }}>
              {filterAssignee !== 'all' || filterStatus !== 'all' 
                ? 'No tasks match the filters' 
                : 'No team tasks yet. Create one to get started!'}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const commentCount = getTaskCommentCount(task.id);
            
            return (
              <div
                key={task.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer",
                  task.status === 'done' && "opacity-60"
                )}
                style={{ 
                  backgroundColor: tokens.card,
                  borderColor: tokens.border
                }}
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start gap-3">
                  {/* Priority Indicator */}
                  <div 
                    className="w-1 h-16 rounded-full flex-shrink-0"
                    style={{ backgroundColor: priorityColors[task.priority] }}
                  />
                  
                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <h3 
                      className={cn(
                        "font-semibold mb-1",
                        task.status === 'done' && "line-through"
                      )}
                      style={{ color: tokens.color }}
                    >
                      {task.title}
                    </h3>
                    
                    {task.description && (
                      <p className="text-sm mb-2 line-clamp-1" style={{ color: tokens.subtle }}>
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: tokens.subtle }}>
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(task.due_date), 'MMM d, h:mm a')}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {task.assigned_to ? task.assigned_to.split('@')[0] : 'Unassigned'}
                      </div>
                      
                      {commentCount > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {commentCount}
                        </div>
                      )}

                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${tokens.accent}15`,
                          color: tokens.accent 
                        }}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Quick Assign */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select 
                      value={task.assigned_to || 'unassigned'} 
                      onValueChange={(val) => handleQuickAssign(task.id, val === 'unassigned' ? null : val)}
                    >
                      <SelectTrigger className="w-32 h-8" style={{ borderColor: tokens.border }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {teamMembers.map(member => (
                          <SelectItem key={member.user_email} value={member.user_email}>
                            {member.user_email.split('@')[0]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Detail Sheet */}
      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onComplete={handleCompleteTask}
        />
      )}

      {/* Task Form Dialog */}
      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent 
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{ backgroundColor: tokens.card, borderColor: tokens.border }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: tokens.color }}>
              {editingTask ? 'Edit Team Task' : 'New Team Task'}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            onSubmit={(data) => {
              if (editingTask) {
                updateTaskMutation.mutate({ id: editingTask.id, data, previousTask: editingTask });
              } else {
                createTaskMutation.mutate(data);
              }
              setShowTaskForm(false);
            }}
            onCancel={() => setShowTaskForm(false)}
            isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TeamTaskList;