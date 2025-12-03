import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Input } from '../ui/input';
import { Search, Filter, SortAsc } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export function TaskFilters({
  searchQuery,
  onSearchChange,
  filterCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
}) {
  const { tokens } = useTheme();

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search 
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
          style={{ color: tokens.subtle }} 
        />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
          style={{ 
            backgroundColor: tokens.card,
            borderColor: tokens.border,
            color: tokens.color
          }}
        />
      </div>
      
      <div className="flex gap-2">
        <Select value={filterCategory} onValueChange={onCategoryChange}>
          <SelectTrigger 
            className="w-32"
            style={{ borderColor: tokens.border }}
          >
            <Filter className="w-4 h-4 mr-2" style={{ color: tokens.subtle }} />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="work">💼 Work</SelectItem>
            <SelectItem value="personal">🏠 Personal</SelectItem>
            <SelectItem value="health">💪 Health</SelectItem>
            <SelectItem value="learning">📚 Learning</SelectItem>
            <SelectItem value="errands">🛒 Errands</SelectItem>
            <SelectItem value="creative">🎨 Creative</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger 
            className="w-32"
            style={{ borderColor: tokens.border }}
          >
            <SortAsc className="w-4 h-4 mr-2" style={{ color: tokens.subtle }} />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created">Newest</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="due">Due Date</SelectItem>
            <SelectItem value="energy">Energy</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default TaskFilters;