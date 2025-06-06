-- Migration script for Review Notification System
-- This script creates the necessary database tables and functions for the notification system

-- 1. Create notification_settings table (if not exists)
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  review_assignments BOOLEAN DEFAULT true,
  review_completions BOOLEAN DEFAULT true,
  review_overdue BOOLEAN DEFAULT true,
  system_alerts BOOLEAN DEFAULT true,
  workload_warnings BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Create notification_logs table for analytics
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  channels_used JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create notification_analytics table
CREATE TABLE IF NOT EXISTS notification_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  total_notifications INTEGER DEFAULT 0,
  type_breakdown JSONB DEFAULT '{}',
  priority_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);

-- 4. Enhance existing notifications table (if needed)
DO $$
BEGIN
  -- Add expires_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'expires_at') THEN
    ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add action_url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE notifications ADD COLUMN action_url TEXT;
  END IF;
  
  -- Ensure priority column exists with correct type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'priority') THEN
    ALTER TABLE notifications ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
  END IF;
END $$;

-- 5. Create review_assignments table (if not exists)
CREATE TABLE IF NOT EXISTS review_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES review_queue(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  completed_at TIMESTAMP WITH TIME ZONE,
  decision VARCHAR(20) CHECK (decision IN ('approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_id, reviewer_id)
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_priority ON notifications(type, priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read_created_at ON notifications(read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id_created_at ON notification_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type_created_at ON notification_logs(notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_date ON notification_analytics(date DESC);

CREATE INDEX IF NOT EXISTS idx_review_assignments_reviewer_status ON review_assignments(reviewer_id, status);
CREATE INDEX IF NOT EXISTS idx_review_assignments_due_date ON review_assignments(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_review_assignments_status_due_date ON review_assignments(status, due_date);

-- 7. Create RLS policies

-- notification_settings policies
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification settings" ON notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- notification_logs policies
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification logs" ON notification_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification logs" ON notification_logs
  FOR INSERT WITH CHECK (true); -- Allow system to log notifications

-- notification_analytics policies
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view notification analytics" ON notification_analytics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage notification analytics" ON notification_analytics
  FOR ALL USING (true); -- Allow system to manage analytics

-- review_assignments policies
ALTER TABLE review_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewers can view their assignments" ON review_assignments
  FOR SELECT USING (auth.uid() = reviewer_id);

CREATE POLICY "Assigners can view assignments they created" ON review_assignments
  FOR SELECT USING (auth.uid() = assigned_by);

CREATE POLICY "Reviewers can update their assignments" ON review_assignments
  FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Authorized users can create assignments" ON review_assignments
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE id IN (
        SELECT user_id FROM profiles 
        WHERE role IN ('admin', 'reviewer', 'manager')
      )
    )
  );

-- 8. Create database functions

-- Function to get reviewer workload statistics
CREATE OR REPLACE FUNCTION get_reviewer_workload_stats()
RETURNS TABLE (
  reviewer_id UUID,
  current_assignments INTEGER,
  threshold INTEGER,
  pending_items INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ra.reviewer_id,
    COUNT(ra.id)::INTEGER as current_assignments,
    COALESCE(p.workload_threshold, 10)::INTEGER as threshold,
    (
      SELECT COUNT(*)::INTEGER 
      FROM review_queue rq 
      WHERE rq.status = 'pending'
    ) as pending_items
  FROM review_assignments ra
  LEFT JOIN profiles p ON p.id = ra.reviewer_id
  WHERE ra.status IN ('pending', 'in_progress')
  GROUP BY ra.reviewer_id, p.workload_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically update assignment status based on due date
CREATE OR REPLACE FUNCTION update_overdue_assignments()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE review_assignments 
  SET 
    status = 'overdue',
    updated_at = NOW()
  WHERE 
    status = 'pending' 
    AND due_date < NOW()
    AND due_date IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE 
    expires_at IS NOT NULL 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create triggers

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_review_assignments_updated_at ON review_assignments;
CREATE TRIGGER update_review_assignments_updated_at
  BEFORE UPDATE ON review_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_analytics_updated_at ON notification_analytics;
CREATE TRIGGER update_notification_analytics_updated_at
  BEFORE UPDATE ON notification_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Insert default notification settings for existing users
INSERT INTO notification_settings (user_id)
SELECT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM notification_settings)
ON CONFLICT (user_id) DO NOTHING;

-- 11. Add workload_threshold to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'workload_threshold') THEN
    ALTER TABLE profiles ADD COLUMN workload_threshold INTEGER DEFAULT 10;
  END IF;
END $$;

-- 12. Create a view for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
  user_id,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE read = false) as unread_notifications,
  COUNT(*) FILTER (WHERE type = 'review_assignment') as assignment_notifications,
  COUNT(*) FILTER (WHERE type = 'review_completed') as completion_notifications,
  COUNT(*) FILTER (WHERE type = 'review_overdue') as overdue_notifications,
  COUNT(*) FILTER (WHERE type = 'workload_warning') as workload_notifications,
  COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_notifications,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_notifications,
  MAX(created_at) as last_notification_at
FROM notifications
GROUP BY user_id;

-- Grant necessary permissions
GRANT SELECT ON notification_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_reviewer_workload_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION update_overdue_assignments() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO service_role;

-- Create a comment to track migration version
COMMENT ON TABLE notification_settings IS 'Review notification system - v1.0';