-- Initial schema for DutyLeak application
-- This migration creates the core tables for the application

-- Enable Row Level Security

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create workspace_users junction table
CREATE TABLE IF NOT EXISTS workspace_users (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Create profiles table to extend auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  asin TEXT,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cost DECIMAL(10, 2),
  active_classification_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create jobs table for the in-app job system
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create job_logs table for tracking job execution
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create job_related_entities table for linking jobs to entities
CREATE TABLE IF NOT EXISTS job_related_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create RLS policies

-- Workspaces policies
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_select ON workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY workspace_insert ON workspaces
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Workspace users policies
ALTER TABLE workspace_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_users_select ON workspace_users
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- CREATE POLICY workspace_users_insert ON workspace_users
--   FOR INSERT WITH CHECK (
--     workspace_id IN (
--       SELECT workspace_id FROM workspace_users
--       WHERE user_id = auth.uid() AND role = 'admin'
--     )
--   );

-- Profiles policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    id = auth.uid() OR
    id IN (
      SELECT user_id FROM workspace_users
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
  );

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (
    id = auth.uid()
  ) WITH CHECK (
    id = auth.uid()
  );

-- Products policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select ON products
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY products_insert ON products
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY products_update ON products
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY products_delete ON products
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

-- Jobs policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY jobs_select ON jobs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY jobs_insert ON jobs
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY jobs_update ON jobs
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  );

-- Job logs policies
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_logs_select ON job_logs
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM jobs
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY job_logs_insert ON job_logs
  FOR INSERT WITH CHECK (
    job_id IN (
      SELECT id FROM jobs
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Job related entities policies
ALTER TABLE job_related_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_related_entities_select ON job_related_entities
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM jobs
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY job_related_entities_insert ON job_related_entities
  FOR INSERT WITH CHECK (
    job_id IN (
      SELECT id FROM jobs
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create functions for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workspace_users_updated_at
BEFORE UPDATE ON workspace_users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile for the new user
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Create a default workspace for the new user
  INSERT INTO workspaces (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Workspace'))
  RETURNING id INTO NEW.raw_user_meta_data->'workspace_id';
  
  -- Add the user to the workspace as admin
  INSERT INTO workspace_users (workspace_id, user_id, role)
  VALUES (NEW.raw_user_meta_data->'workspace_id', NEW.id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();
