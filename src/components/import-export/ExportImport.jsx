import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui-custom/Card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAnalytics, EVENTS } from '../analytics/AnalyticsProvider';
import { Download, Upload, FileJson, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ExportImport() {
  const { tokens } = useTheme();
  const { trackEvent } = useAnalytics();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const { data: stats = [] } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => base44.entities.UserStats.list(),
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => base44.entities.QuickReminder.list(),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const importMutation = useMutation({
    mutationFn: async (data) => {
      const results = { success: [], errors: [] };
      
      // Import tasks
      if (data.tasks) {
        for (const task of data.tasks) {
          try {
            const { id, created_date, updated_date, created_by, ...taskData } = task;
            await base44.entities.Task.create(taskData);
            results.success.push(`Task: ${task.title}`);
          } catch (error) {
            results.errors.push(`Task "${task.title}": ${error.message}`);
          }
        }
      }

      // Import reminders
      if (data.reminders) {
        for (const reminder of data.reminders) {
          try {
            const { id, created_date, updated_date, created_by, ...reminderData } = reminder;
            await base44.entities.QuickReminder.create(reminderData);
            results.success.push(`Reminder: ${reminder.title}`);
          } catch (error) {
            results.errors.push(`Reminder "${reminder.title}": ${error.message}`);
          }
        }
      }

      // Import contacts
      if (data.contacts) {
        for (const contact of data.contacts) {
          try {
            const { id, created_date, updated_date, created_by, ...contactData } = contact;
            await base44.entities.Contact.create(contactData);
            results.success.push(`Contact: ${contact.name}`);
          } catch (error) {
            results.errors.push(`Contact "${contact.name}": ${error.message}`);
          }
        }
      }

      return results;
    },
    onSuccess: (results) => {
      trackEvent(EVENTS.IMPORT_DATA, {
        success_count: results.success.length,
        error_count: results.errors.length,
      });
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setImportResults(results);
      setIsImporting(false);
      
      if (results.errors.length === 0) {
        toast.success(`Successfully imported ${results.success.length} items`);
      } else {
        toast.warning(`Imported ${results.success.length} items with ${results.errors.length} errors`);
      }
    },
    onError: (error) => {
      setIsImporting(false);
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const exportJSON = () => {
    setIsExporting(true);
    trackEvent(EVENTS.EXPORT_DATA, { format: 'json', item_count: tasks.length });
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      tasks: tasks.map(task => ({ ...task })),
      preferences: preferences.length > 0 ? preferences[0] : null,
      stats: stats.length > 0 ? stats[0] : null,
      reminders: reminders.map(r => ({ ...r })),
      contacts: contacts.map(c => ({ ...c })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propel-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setIsExporting(false);
    toast.success('Data exported successfully');
  };

  const exportCSV = () => {
    setIsExporting(true);
    trackEvent(EVENTS.EXPORT_DATA, { format: 'csv', item_count: tasks.length });
    
    const headers = [
      'Title', 'Description', 'Status', 'Priority', 'Category', 
      'Due Date', 'Estimated Minutes', 'Energy Level', 'Tags', 
      'Location', 'Created Date', 'Created By'
    ];
    
    const rows = tasks.map(task => [
      task.title || '',
      task.description || '',
      task.status || '',
      task.priority || '',
      task.category || '',
      task.due_date || '',
      task.estimated_minutes || '',
      task.energy_level || '',
      (task.tags || []).join(';'),
      task.location || '',
      task.created_date || '',
      task.created_by || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propel-tasks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setIsExporting(false);
    toast.success('Tasks exported to CSV');
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        let data;

        if (file.name.endsWith('.json')) {
          data = JSON.parse(content);
          
          // Validate structure
          if (!data.version || !data.tasks) {
            throw new Error('Invalid backup file format');
          }
          
          importMutation.mutate(data);
        } else if (file.name.endsWith('.csv')) {
          // Parse CSV
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          const tasks = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
              const task = {};
              
              headers.forEach((header, i) => {
                const value = (values[i] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"');
                
                if (header === 'Title') task.title = value;
                if (header === 'Description') task.description = value;
                if (header === 'Status') task.status = value || 'todo';
                if (header === 'Priority') task.priority = value || 'medium';
                if (header === 'Category') task.category = value || 'personal';
                if (header === 'Due Date' && value) task.due_date = value;
                if (header === 'Estimated Minutes' && value) task.estimated_minutes = Number(value) || 25;
                if (header === 'Energy Level') task.energy_level = value || 'medium';
                if (header === 'Tags' && value) task.tags = value.split(';').filter(Boolean);
                if (header === 'Location' && value) task.location = value;
              });
              
              return task;
            });
          
          importMutation.mutate({ tasks });
        } else {
          throw new Error('Unsupported file format. Use .json or .csv');
        }
      } catch (error) {
        setIsImporting(false);
        toast.error(`Import failed: ${error.message}`);
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-2" style={{ color: tokens.color }}>
            📤 Export Data
          </h3>
          <p className="text-sm mb-4" style={{ color: tokens.subtle }}>
            Download your tasks, reminders, and contacts as a backup
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={exportJSON}
              disabled={isExporting}
              className="flex items-center gap-2"
              style={{ backgroundColor: tokens.accent }}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileJson className="w-4 h-4" />
              )}
              Export JSON (Full Backup)
            </Button>
            
            <Button
              onClick={exportCSV}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
              style={{ borderColor: tokens.border }}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Export CSV (Tasks Only)
            </Button>
          </div>
          
          <div className="mt-4 text-xs" style={{ color: tokens.subtle }}>
            <p>• JSON includes all data (tasks, reminders, contacts, settings)</p>
            <p>• CSV includes only tasks for spreadsheet use</p>
          </div>
        </div>
      </Card>

      {/* Import Section */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-2" style={{ color: tokens.color }}>
            📥 Import Data
          </h3>
          <p className="text-sm mb-4" style={{ color: tokens.subtle }}>
            Restore from a backup or import tasks from CSV
          </p>
          
          <label>
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isImporting}
            />
            <Button
              as="span"
              disabled={isImporting}
              className="flex items-center gap-2 cursor-pointer"
              style={{ backgroundColor: tokens.accent }}
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isImporting ? 'Importing...' : 'Choose File to Import'}
            </Button>
          </label>
          
          <div className="mt-4 text-xs" style={{ color: tokens.subtle }}>
            <p>⚠️ Importing will create new items, not replace existing ones</p>
            <p>• Supported formats: .json (full backup), .csv (tasks only)</p>
          </div>
        </div>
      </Card>

      {/* Import Results */}
      {importResults && (
        <Card variant="accent">
          <div className="p-6">
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: tokens.color }}>
              {importResults.errors.length === 0 ? (
                <>
                  <Check className="w-5 h-5 text-green-500" />
                  Import Successful
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  Import Completed with Warnings
                </>
              )}
            </h4>
            
            {importResults.success.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-green-600 mb-1">
                  ✓ Successfully imported {importResults.success.length} items
                </p>
                {importResults.success.slice(0, 5).map((item, i) => (
                  <p key={i} className="text-xs ml-4" style={{ color: tokens.subtle }}>
                    • {item}
                  </p>
                ))}
                {importResults.success.length > 5 && (
                  <p className="text-xs ml-4" style={{ color: tokens.subtle }}>
                    ... and {importResults.success.length - 5} more
                  </p>
                )}
              </div>
            )}
            
            {importResults.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-600 mb-1">
                  ✗ {importResults.errors.length} items failed
                </p>
                {importResults.errors.slice(0, 5).map((error, i) => (
                  <p key={i} className="text-xs ml-4" style={{ color: tokens.subtle }}>
                    • {error}
                  </p>
                ))}
                {importResults.errors.length > 5 && (
                  <p className="text-xs ml-4" style={{ color: tokens.subtle }}>
                    ... and {importResults.errors.length - 5} more errors
                  </p>
                )}
              </div>
            )}
            
            <Button
              onClick={() => setImportResults(null)}
              variant="outline"
              size="sm"
              className="mt-3"
              style={{ borderColor: tokens.border }}
            >
              Dismiss
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default ExportImport;