-- ============================================
-- PROPEL DATABASE MIGRATION SCRIPT (FINAL)
-- Purpose: Align existing schema with frontend expectations
-- Date: December 3, 2025
-- FIX: Handle trigger functions that reference old ENUM types
-- ============================================

-- IMPORTANT: Run this in Supabase SQL Editor
-- This script will:
-- 1. Update task_status ENUM: 'pending' → 'todo', 'completed' → 'done'
-- 2. Convert priority from integer (1-4) to text ('low', 'medium', 'high', 'urgent')
-- 3. Preserve all your existing 16 tasks
-- 4. Keep all other tables and data intact
-- 5. Handle dependent views AND trigger functions

-- ============================================
-- STEP 0: CHECK FOR DEPENDENT OBJECTS
-- ============================================

DO $$
DECLARE
  view_record RECORD;
  trigger_record RECORD;
BEGIN
  RAISE NOTICE 'Checking for dependent objects...';

  -- Check views
  FOR view_record IN
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
  LOOP
    RAISE NOTICE '  Found view: %', view_record.table_name;
  END LOOP;

  -- Check triggers
  FOR trigger_record IN
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND event_object_table = 'tasks'
  LOOP
    RAISE NOTICE '  Found trigger: % on table %', trigger_record.trigger_name, trigger_record.event_object_table;
  END LOOP;
END $$;

-- ============================================
-- STEP 1: BACKUP YOUR DATA (SAFETY FIRST!)
-- ============================================

CREATE TABLE IF NOT EXISTS tasks_backup_20251203 AS
SELECT * FROM tasks;

DO $$
DECLARE
  view_def TEXT;
  backup_count INTEGER;
  original_count INTEGER;
BEGIN
  -- Check for task_stats view
  SELECT definition INTO view_def
  FROM pg_views
  WHERE schemaname = 'public' AND viewname = 'task_stats';

  IF view_def IS NOT NULL THEN
    RAISE NOTICE 'Found task_stats view - will recreate after migration';
  END IF;

  -- Verify backup worked
  SELECT COUNT(*) INTO backup_count FROM tasks_backup_20251203;
  SELECT COUNT(*) INTO original_count FROM tasks;

  IF backup_count != original_count THEN
    RAISE EXCEPTION 'Backup failed! Counts do not match. Original: %, Backup: %', original_count, backup_count;
  END IF;

  RAISE NOTICE '✅ Backup successful: % tasks backed up', backup_count;
END $$;

-- ============================================
-- STEP 2: DROP DEPENDENT OBJECTS TEMPORARILY
-- ============================================

-- Drop views
DROP VIEW IF EXISTS task_stats CASCADE;

-- Drop trigger functions that reference task_status ENUM
DROP FUNCTION IF EXISTS handle_task_update() CASCADE;

DO $$
BEGIN
  RAISE NOTICE 'Dropped dependent views and triggers (will recreate after migration)';
END $$;

-- ============================================
-- STEP 3: UPDATE TASK STATUS ENUM
-- ============================================

-- Add temporary column for new status
ALTER TABLE tasks ADD COLUMN status_new text;

-- Map old status to new status
UPDATE tasks SET status_new =
  CASE status::text
    WHEN 'pending' THEN 'todo'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'completed' THEN 'done'
    WHEN 'archived' THEN 'archived'
    ELSE 'todo'
  END;

-- Drop old status column
ALTER TABLE tasks DROP COLUMN status CASCADE;

-- Rename new column to status
ALTER TABLE tasks RENAME COLUMN status_new TO status;

-- Set default and constraint
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'todo';
ALTER TABLE tasks ALTER COLUMN status SET NOT NULL;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'done', 'archived'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status_new ON tasks(status);

DO $$
DECLARE
  todo_count INTEGER;
  in_progress_count INTEGER;
  done_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO todo_count FROM tasks WHERE status = 'todo';
  SELECT COUNT(*) INTO in_progress_count FROM tasks WHERE status = 'in_progress';
  SELECT COUNT(*) INTO done_count FROM tasks WHERE status = 'done';

  RAISE NOTICE '✅ Status migration complete:';
  RAISE NOTICE '  - todo: %', todo_count;
  RAISE NOTICE '  - in_progress: %', in_progress_count;
  RAISE NOTICE '  - done: %', done_count;
END $$;

-- ============================================
-- STEP 4: UPDATE PRIORITY FROM INTEGER TO TEXT
-- ============================================

-- Add temporary column for new priority
ALTER TABLE tasks ADD COLUMN priority_new text;

-- Map integer priority to text priority
UPDATE tasks SET priority_new =
  CASE priority
    WHEN 1 THEN 'low'
    WHEN 2 THEN 'medium'
    WHEN 3 THEN 'high'
    WHEN 4 THEN 'urgent'
    WHEN 5 THEN 'urgent'
    ELSE 'medium'
  END;

-- Drop old priority column
ALTER TABLE tasks DROP COLUMN priority CASCADE;

-- Rename new column to priority
ALTER TABLE tasks RENAME COLUMN priority_new TO priority;

-- Set default and constraint
ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'medium';
ALTER TABLE tasks ALTER COLUMN priority SET NOT NULL;
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

DO $$
DECLARE
  low_count INTEGER;
  medium_count INTEGER;
  high_count INTEGER;
  urgent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO low_count FROM tasks WHERE priority = 'low';
  SELECT COUNT(*) INTO medium_count FROM tasks WHERE priority = 'medium';
  SELECT COUNT(*) INTO high_count FROM tasks WHERE priority = 'high';
  SELECT COUNT(*) INTO urgent_count FROM tasks WHERE priority = 'urgent';

  RAISE NOTICE '✅ Priority migration complete:';
  RAISE NOTICE '  - low: %', low_count;
  RAISE NOTICE '  - medium: %', medium_count;
  RAISE NOTICE '  - high: %', high_count;
  RAISE NOTICE '  - urgent: %', urgent_count;
END $$;

-- ============================================
-- STEP 5: RECREATE TASK_STATS VIEW
-- ============================================

CREATE OR REPLACE VIEW task_stats AS
SELECT
  user_id,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'todo') as todo_count,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
  COUNT(*) FILTER (WHERE status = 'done') as done_count,
  COUNT(*) FILTER (WHERE status = 'archived') as archived_count,
  COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
  COUNT(*) FILTER (WHERE priority = 'high') as high_count,
  COUNT(*) FILTER (WHERE priority = 'medium') as medium_count,
  COUNT(*) FILTER (WHERE priority = 'low') as low_count
FROM tasks
GROUP BY user_id;

DO $$
BEGIN
  RAISE NOTICE '✅ Recreated task_stats view with updated schema';
END $$;

-- ============================================
-- STEP 6: RECREATE TRIGGER FUNCTION (IF NEEDED)
-- ============================================

-- Recreate handle_task_update function with new text-based status
CREATE OR REPLACE FUNCTION handle_task_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completed_at timestamp when status changes to 'done'
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'done' THEN
    NEW.completed_at = NULL;
  END IF;

  -- Update updated_at timestamp
  NEW.updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS task_update_trigger ON tasks;
CREATE TRIGGER task_update_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION handle_task_update();

DO $$
BEGIN
  RAISE NOTICE '✅ Recreated handle_task_update trigger with updated schema';
END $$;

-- ============================================
-- STEP 7: DROP OLD ENUM TYPES (CLEANUP)
-- ============================================

DROP TYPE IF EXISTS task_status CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✅ Dropped old task_status ENUM type';
END $$;

-- ============================================
-- STEP 8: VERIFY ALL DATA INTACT
-- ============================================

DO $$
DECLARE
  task_count INTEGER;
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO task_count FROM tasks;
  SELECT COUNT(*) INTO backup_count FROM tasks_backup_20251203;

  IF task_count != backup_count THEN
    RAISE EXCEPTION 'ERROR: Task count mismatch! Original: %, Current: %', backup_count, task_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '🎉 MIGRATION SUCCESSFUL!';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ All % tasks preserved', task_count;
  RAISE NOTICE '✅ Status updated: pending→todo, completed→done';
  RAISE NOTICE '✅ Priority updated: integers→strings';
  RAISE NOTICE '✅ task_stats view recreated';
  RAISE NOTICE '✅ handle_task_update trigger recreated';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Backup table created: tasks_backup_20251203';
  RAISE NOTICE '   You can drop it later with: DROP TABLE tasks_backup_20251203;';
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 9: CHECK RLS STATUS
-- ============================================

DO $$
BEGIN
  IF NOT (SELECT rowsecurity FROM pg_tables WHERE tablename = 'tasks' AND schemaname = 'public') THEN
    RAISE NOTICE '⚠️  RLS is NOT enabled on tasks table. Run the RLS setup script next.';
  ELSE
    RAISE NOTICE '✅ RLS is already enabled on tasks table.';
  END IF;
END $$;

-- ============================================
-- FINAL STATUS CHECK
-- ============================================

SELECT
  'Final Status Distribution' as info,
  status,
  COUNT(*) as count
FROM tasks
GROUP BY status
ORDER BY count DESC;

SELECT
  'Final Priority Distribution' as info,
  priority,
  COUNT(*) as count
FROM tasks
GROUP BY priority
ORDER BY count DESC;

-- ============================================
-- MIGRATION COMPLETE! 🎉
-- ============================================

-- Next steps:
-- 1. ✅ Verify the output above shows correct counts
-- 2. Update your .env file with Supabase credentials
-- 3. Run: npm run dev
-- 4. Test that tasks load correctly in the UI
