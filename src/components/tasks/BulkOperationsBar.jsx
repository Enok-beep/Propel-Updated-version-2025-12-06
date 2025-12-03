import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '../ui/button';
import { 
  Check, 
  Trash2, 
  Tag, 
  Calendar, 
  Users, 
  X,
  MoreHorizontal 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

/**
 * Bulk Operations Bar
 * Appears when tasks are selected
 */

export function BulkOperationsBar({ 
  selectedCount, 
  onClearSelection,
  onMarkDone,
  onMarkTodo,
  onDelete,
  onSetPriority,
  onSetCategory,
  onSetDueDate,
  onAssign,
}) {
  const { tokens } = useTheme();

  if (selectedCount === 0) return null;

  return (
    <div 
      className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 animate-in slide-in-from-bottom"
      style={{ 
        backgroundColor: tokens.card,
        borderColor: tokens.border 
      }}
    >
      {/* Count */}
      <div className="flex items-center gap-2">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
          style={{ 
            backgroundColor: tokens.accent,
            color: 'white' 
          }}
        >
          {selectedCount}
        </div>
        <span className="font-semibold" style={{ color: tokens.color }}>
          selected
        </span>
      </div>

      <div className="h-6 w-px" style={{ backgroundColor: tokens.border }} />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onMarkDone}
          className="flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Mark Done
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={onMarkTodo}
          className="flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Mark Todo
        </Button>

        {/* More Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSetPriority('high')}>
              <Tag className="w-4 h-4 mr-2" />
              Set High Priority
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetPriority('medium')}>
              <Tag className="w-4 h-4 mr-2" />
              Set Medium Priority
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetPriority('low')}>
              <Tag className="w-4 h-4 mr-2" />
              Set Low Priority
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetCategory('work')}>
              <Tag className="w-4 h-4 mr-2" />
              Set Category: Work
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetCategory('personal')}>
              <Tag className="w-4 h-4 mr-2" />
              Set Category: Personal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSetDueDate}>
              <Calendar className="w-4 h-4 mr-2" />
              Set Due Date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAssign}>
              <Users className="w-4 h-4 mr-2" />
              Assign To...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="outline"
          onClick={onDelete}
          className="flex items-center gap-2 text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>

      <div className="h-6 w-px" style={{ backgroundColor: tokens.border }} />

      {/* Clear */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onClearSelection}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default BulkOperationsBar;