import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { TaskCard } from './TaskCard';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Inbox } from 'lucide-react';

export function TaskList({ 
  tasks, 
  onToggleStatus, 
  onEdit, 
  onDelete, 
  onStartPomodoro,
  onTaskClick,
  onReorder,
  recommendedTaskId,
  emptyMessage = "No tasks yet"
}) {
  const { tokens } = useTheme();

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    
    onReorder?.(result.source.index, result.destination.index);
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div 
        className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed"
        style={{ borderColor: tokens.border }}
      >
        <Inbox className="w-12 h-12 mb-4" style={{ color: tokens.subtle }} />
        <p className="text-lg font-medium" style={{ color: tokens.subtle }}>
          {emptyMessage}
        </p>
        <p className="text-sm mt-1" style={{ color: tokens.subtle }}>
          Add a task to get started
        </p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="tasks">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-3"
          >
            {tasks.map((task, index) => (
              <Draggable 
                key={task.id} 
                draggableId={task.id} 
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <TaskCard
                      task={task}
                      onToggleStatus={onToggleStatus}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStartPomodoro={onStartPomodoro}
                      onClick={onTaskClick}
                      isRecommended={task.id === recommendedTaskId}
                      isDragging={snapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export default TaskList;