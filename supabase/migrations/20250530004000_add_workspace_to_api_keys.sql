-- Add workspace_id to api_keys table for workspace-scoped API key management
ALTER TABLE api_keys ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Update the unique constraint to be per workspace instead of per user
ALTER TABLE api_keys DROP CONSTRAINT api_keys_user_id_service_name_key;
ALTER TABLE api_keys ADD CONSTRAINT api_keys_workspace_service_unique UNIQUE(workspace_id, service_name);

-- Create index for workspace-based lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_service ON api_keys(workspace_id, service_name);
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace ON api_keys(workspace_id);

-- Drop old RLS policies
DROP POLICY "Users can view their own API keys" ON api_keys;
DROP POLICY "Users can insert their own API keys" ON api_keys;
DROP POLICY "Users can update their own API keys" ON api_keys;
DROP POLICY "Users can delete their own API keys" ON api_keys;

-- Create new workspace-based RLS policies
CREATE POLICY "Users can view API keys for their workspaces" ON api_keys
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert API keys for their workspaces" ON api_keys
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT wu.workspace_id 
            FROM workspace_users wu
            JOIN workspace_roles wr ON wu.role_id = wr.id
            WHERE wu.user_id = auth.uid() 
            AND wr.permissions @> '["settings:write"]'
        )
    );

CREATE POLICY "Users can update API keys for their workspaces" ON api_keys
    FOR UPDATE USING (
        workspace_id IN (
            SELECT wu.workspace_id 
            FROM workspace_users wu
            JOIN workspace_roles wr ON wu.role_id = wr.id
            WHERE wu.user_id = auth.uid() 
            AND wr.permissions @> '["settings:write"]'
        )
    );

CREATE POLICY "Users can delete API keys for their workspaces" ON api_keys
    FOR DELETE USING (
        workspace_id IN (
            SELECT wu.workspace_id 
            FROM workspace_users wu
            JOIN workspace_roles wr ON wu.role_id = wr.id
            WHERE wu.user_id = auth.uid() 
            AND wr.permissions @> '["settings:write"]'
        )
    );

-- Update the trigger function to handle workspace_id
CREATE OR REPLACE FUNCTION handle_api_keys_workspace()
RETURNS TRIGGER AS $$
BEGIN
    -- Set user_id on insert if not provided
    IF TG_OP = 'INSERT' AND NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    
    -- Update updated_at on update
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger to use the new function
DROP TRIGGER set_api_keys_user_id ON api_keys;
CREATE TRIGGER set_api_keys_workspace
    BEFORE INSERT OR UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION handle_api_keys_workspace();

-- Update comments
COMMENT ON COLUMN api_keys.workspace_id IS 'ID of the workspace this API key belongs to';
COMMENT ON TABLE api_keys IS 'Stores encrypted API keys for external services, scoped to workspaces';