import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { cn } from '@/lib/utils';

export function Skeleton({ className, style, ...props }) {
  const { tokens } = useTheme();
  
  return (
    <div
      className={cn("animate-pulse rounded-lg", className)}
      style={{
        backgroundColor: `${tokens.border}40`,
        ...style
      }}
      {...props}
    />
  );
}

export function TaskCardSkeleton() {
  const { tokens } = useTheme();
  
  return (
    <div 
      className="p-4 rounded-xl border"
      style={{ 
        backgroundColor: tokens.card,
        borderColor: tokens.border 
      }}
    >
      <div className="flex items-start gap-3">
        <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  const { tokens } = useTheme();
  
  return (
    <div 
      className="p-6 rounded-xl border text-center"
      style={{ 
        backgroundColor: tokens.card,
        borderColor: tokens.border 
      }}
    >
      <Skeleton className="w-8 h-8 mx-auto mb-2 rounded-full" />
      <Skeleton className="h-8 w-16 mx-auto mb-2" />
      <Skeleton className="h-4 w-24 mx-auto" />
    </div>
  );
}

export function WidgetSkeleton() {
  const { tokens } = useTheme();
  
  return (
    <div 
      className="p-6 rounded-xl border"
      style={{ 
        backgroundColor: tokens.card,
        borderColor: tokens.border 
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-5 h-5 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  const { tokens } = useTheme();
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  const { tokens } = useTheme();
  
  return (
    <div 
      className="rounded-xl border overflow-hidden"
      style={{ 
        backgroundColor: tokens.card,
        borderColor: tokens.border 
      }}
    >
      {/* Header */}
      <div 
        className="flex gap-4 p-4 border-b"
        style={{ borderColor: tokens.border }}
      >
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i}
          className="flex gap-4 p-4 border-b last:border-b-0"
          style={{ borderColor: tokens.border }}
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  const { tokens } = useTheme();
  
  return (
    <div 
      className="p-6 rounded-xl border"
      style={{ 
        backgroundColor: tokens.card,
        borderColor: tokens.border 
      }}
    >
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="flex items-end gap-2 h-48">
        <Skeleton className="flex-1 h-32" />
        <Skeleton className="flex-1 h-40" />
        <Skeleton className="flex-1 h-36" />
        <Skeleton className="flex-1 h-44" />
        <Skeleton className="flex-1 h-28" />
        <Skeleton className="flex-1 h-38" />
        <Skeleton className="flex-1 h-42" />
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeaderSkeleton />
      
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      
      {/* Widgets */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <WidgetSkeleton />
        <WidgetSkeleton />
      </div>
      
      {/* Task List */}
      <ListSkeleton items={3} />
    </div>
  );
}