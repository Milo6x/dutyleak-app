-- Fix the infinite recursion in workspace_users RLS policy
-- The current policy references workspace_users table within itself, causing infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "workspace_users_select" ON public.workspace_users;

-- Create a corrected policy that allows users to see their own workspace associations
CREATE POLICY "workspace_users_select" ON public.workspace_users 
FOR SELECT 
USING (user_id = auth.uid());

-- Also fix the insert policy to be simpler
DROP POLICY IF EXISTS "workspace_users_insert" ON public.workspace_users;
CREATE POLICY "workspace_users_insert" ON public.workspace_users 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Add update and delete policies for completeness
DROP POLICY IF EXISTS "workspace_users_update" ON public.workspace_users;
CREATE POLICY "workspace_users_update" ON public.workspace_users 
FOR UPDATE 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "workspace_users_delete" ON public.workspace_users;
CREATE POLICY "workspace_users_delete" ON public.workspace_users 
FOR DELETE 
USING (user_id = auth.uid());