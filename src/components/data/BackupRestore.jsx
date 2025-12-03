import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '../ui/button';
import { Download, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Backup & Restore Component
 * Export/import all user data
 */

export function BackupRestore() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const exportData = async () => {
    try {
      toast.loading('Exporting data...');

      // Fetch all user data
      const [tasks, preferences, stats, notifications] = await Promise.all([
        base44.entities.Task.list(),
        base44.entities.UserPreferences.list(),
        base44.entities.UserStats.list(),
        base44.entities.Notification.filter({ user_email: user.email }),
      ]);

      const backup = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        user_email: user.email,
        data: {
          tasks,
          preferences,
          stats,
          notifications,
        },
      };

      // Create download
      const blob = new Blob([JSON.stringify(backup, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `propel-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Data exported successfully');
    } catch (error) {
      toast.dismiss();
      toast.error('Export failed: ' + error.message);
    }
  };

  const importData = async (file) => {
    try {
      setImporting(true);
      setImportProgress(0);

      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup file format');
      }

      toast.loading('Importing data...');

      const { tasks, preferences, stats } = backup.data;
      const totalItems = (tasks?.length || 0) + (preferences?.length || 0) + (stats?.length || 0);
      let imported = 0;

      // Import tasks
      if (tasks?.length) {
        for (const task of tasks) {
          const { id, created_date, updated_date, ...taskData } = task;
          await base44.entities.Task.create(taskData);
          imported++;
          setImportProgress(Math.round((imported / totalItems) * 100));
        }
      }

      // Import preferences
      if (preferences?.length) {
        const pref = preferences[0];
        const { id, ...prefData } = pref;
        const existing = await base44.entities.UserPreferences.list();
        if (existing.length > 0) {
          await base44.entities.UserPreferences.update(existing[0].id, prefData);
        } else {
          await base44.entities.UserPreferences.create(prefData);
        }
        imported++;
        setImportProgress(Math.round((imported / totalItems) * 100));
      }

      // Import stats
      if (stats?.length) {
        const stat = stats[0];
        const { id, ...statData } = stat;
        const existing = await base44.entities.UserStats.filter({ 
          user_email: user.email 
        });
        if (existing.length > 0) {
          await base44.entities.UserStats.update(existing[0].id, statData);
        } else {
          await base44.entities.UserStats.create(statData);
        }
        imported++;
        setImportProgress(Math.round((imported / totalItems) * 100));
      }

      // Invalidate cache
      queryClient.invalidateQueries();

      toast.dismiss();
      toast.success(`Imported ${imported} items successfully`);
      setImportProgress(0);
    } catch (error) {
      toast.dismiss();
      toast.error('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (confirm('This will import data and may overwrite existing items. Continue?')) {
        importData(file);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Export */}
      <div 
        className="p-6 rounded-xl border"
        style={{ 
          backgroundColor: tokens.card,
          borderColor: tokens.border 
        }}
      >
        <div className="flex items-start gap-4">
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${tokens.accent}15` }}
          >
            <Download className="w-6 h-6" style={{ color: tokens.accent }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2" style={{ color: tokens.color }}>
              Export Data
            </h3>
            <p className="text-sm mb-4" style={{ color: tokens.subtle }}>
              Download all your tasks, preferences, and stats as a JSON file.
            </p>
            <Button onClick={exportData}>
              <Download className="w-4 h-4 mr-2" />
              Export Backup
            </Button>
          </div>
        </div>
      </div>

      {/* Import */}
      <div 
        className="p-6 rounded-xl border"
        style={{ 
          backgroundColor: tokens.card,
          borderColor: tokens.border 
        }}
      >
        <div className="flex items-start gap-4">
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${tokens.accent}15` }}
          >
            <Upload className="w-6 h-6" style={{ color: tokens.accent }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2" style={{ color: tokens.color }}>
              Import Data
            </h3>
            <p className="text-sm mb-4" style={{ color: tokens.subtle }}>
              Restore data from a backup file. This may overwrite existing data.
            </p>
            
            {importing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm" style={{ color: tokens.color }}>
                    Importing... {importProgress}%
                  </span>
                </div>
                <div 
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: `${tokens.accent}20` }}
                >
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${importProgress}%`,
                      backgroundColor: tokens.accent 
                    }}
                  />
                </div>
              </div>
            ) : (
              <label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline" onClick={() => document.querySelector('input[type="file"]').click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Select Backup File
                </Button>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Warning */}
      <div 
        className="p-4 rounded-lg border flex items-start gap-3"
        style={{ 
          backgroundColor: '#FFF7ED',
          borderColor: '#FB923C' 
        }}
      >
        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
        <div className="text-sm text-orange-900">
          <strong>Important:</strong> Backups include tasks, preferences, and stats. 
          Importing will create new items and may result in duplicates. 
          Always keep your backup files secure as they contain your personal data.
        </div>
      </div>
    </div>
  );
}

export default BackupRestore;