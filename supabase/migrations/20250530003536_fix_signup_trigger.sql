-- Fix signup trigger function and RLS policies

-- Drop and recreate the signup trigger function with proper variable handling
DROP FUNCTION IF EXISTS public.handle_new_user_signup() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user_signup() RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
    AS $$
DECLARE
  workspace_id_var uuid;
BEGIN
  -- Create a profile for the new user
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Create a default workspace for the new user
  INSERT INTO public.workspaces (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name' || '''s Workspace', 'My Workspace'))
  RETURNING id INTO workspace_id_var;
  
  -- Add the user to the workspace as admin
  INSERT INTO public.workspace_users (workspace_id, user_id, role)
  VALUES (workspace_id_var, NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- Fix the workspace_users RLS policy to allow initial signup
DROP POLICY IF EXISTS "workspace_users_insert" ON public.workspace_users;
CREATE POLICY "workspace_users_insert" ON public.workspace_users FOR INSERT WITH CHECK (
  -- Allow if user is admin in the workspace OR if it's the first user being added to a new workspace
  (workspace_id IN ( SELECT workspace_users_1.workspace_id
     FROM public.workspace_users workspace_users_1
    WHERE ((workspace_users_1.user_id = auth.uid()) AND (workspace_users_1.role = 'admin'::text)))) 
  OR 
  -- Allow if no users exist in this workspace yet (for initial signup)
  (NOT EXISTS (SELECT 1 FROM public.workspace_users WHERE workspace_id = workspace_users.workspace_id))
);

-- Grant necessary permissions
GRANT ALL ON FUNCTION public.handle_new_user_signup() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user_signup() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user_signup() TO service_role;