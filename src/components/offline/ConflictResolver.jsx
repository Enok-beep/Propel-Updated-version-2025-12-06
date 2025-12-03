import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { format } from 'date-fns';

/**
 * Conflict Resolution UI
 * Handles conflicts when offline edits clash with server state
 */

export function ConflictResolver({ conflicts, onResolve, onCancel }) {
  const { tokens } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolutions, setResolutions] = useState({});

  if (!conflicts || conflicts.length === 0) return null;

  const conflict = conflicts[currentIndex];
  const isLastConflict = currentIndex === conflicts.length - 1;

  const handleResolve = (resolution) => {
    const newResolutions = {
      ...resolutions,
      [conflict.id]: resolution,
    };
    setResolutions(newResolutions);

    if (isLastConflict) {
      onResolve(newResolutions);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const getDiff = (local, server, field) => {
    if (local[field] === server[field]) return null;
    return { local: local[field], server: server[field] };
  };

  const changedFields = Object.keys(conflict.local).filter(
    key => conflict.local[key] !== conflict.server[key]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-2xl mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: tokens.card }}
      >
        {/* Header */}
        <div 
          className="p-6 border-b flex items-center gap-3"
          style={{ borderColor: tokens.border }}
        >
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          <div className="flex-1">
            <h2 className="text-xl font-bold" style={{ color: tokens.color }}>
              Resolve Conflict
            </h2>
            <p className="text-sm" style={{ color: tokens.subtle }}>
              Conflict {currentIndex + 1} of {conflicts.length}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Task Info */}
          <div>
            <h3 className="font-semibold mb-2" style={{ color: tokens.color }}>
              {conflict.local.title || conflict.server.title}
            </h3>
            <p className="text-sm" style={{ color: tokens.subtle }}>
              This task was edited offline and on another device. Choose which version to keep.
            </p>
          </div>

          {/* Changed Fields */}
          <div className="space-y-4">
            {changedFields.map(field => {
              const diff = getDiff(conflict.local, conflict.server, field);
              if (!diff) return null;

              return (
                <div 
                  key={field}
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: `${tokens.accent}05`,
                    borderColor: tokens.border 
                  }}
                >
                  <div className="text-sm font-semibold mb-3" style={{ color: tokens.color }}>
                    {field.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Local Version */}
                    <div>
                      <div className="text-xs font-semibold mb-2 text-blue-600">
                        Your Offline Edit
                      </div>
                      <div 
                        className="p-3 rounded border"
                        style={{ 
                          backgroundColor: tokens.bg,
                          borderColor: tokens.border 
                        }}
                      >
                        <div className="text-sm" style={{ color: tokens.color }}>
                          {String(diff.local || 'Empty')}
                        </div>
                        <div className="text-xs mt-2" style={{ color: tokens.subtle }}>
                          {conflict.local.updated_date && format(new Date(conflict.local.updated_date), 'PPp')}
                        </div>
                      </div>
                    </div>

                    {/* Server Version */}
                    <div>
                      <div className="text-xs font-semibold mb-2 text-green-600">
                        Server Version
                      </div>
                      <div 
                        className="p-3 rounded border"
                        style={{ 
                          backgroundColor: tokens.bg,
                          borderColor: tokens.border 
                        }}
                      >
                        <div className="text-sm" style={{ color: tokens.color }}>
                          {String(diff.server || 'Empty')}
                        </div>
                        <div className="text-xs mt-2" style={{ color: tokens.subtle }}>
                          {conflict.server.updated_date && format(new Date(conflict.server.updated_date), 'PPp')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div 
          className="p-6 border-t flex items-center justify-between"
          style={{ borderColor: tokens.border }}
        >
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleResolve('server')}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Keep Server Version
            </Button>
            <Button
              onClick={() => handleResolve('local')}
              className="flex items-center gap-2"
              style={{ 
                backgroundColor: tokens.accent,
                color: 'white' 
              }}
            >
              <Check className="w-4 h-4" />
              Keep My Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConflictResolver;