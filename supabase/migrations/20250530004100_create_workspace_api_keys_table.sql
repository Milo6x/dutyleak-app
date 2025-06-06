-- Create workspace_api_keys table for workspace-scoped API key management
CREATE TABLE IF NOT EXISTS workspace_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Creator of the key
    name VARCHAR(100) NOT NULL, -- Human-readable name for the key
    key_hash TEXT NOT NULL, -- SHA-256 hash of the API key
    permissions JSONB DEFAULT '[]'::jsonb, -- Array of permission scopes
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- Optional expiration date
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique key names per workspace
    UNIQUE(workspace_id, name)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_workspace_api_keys_workspace ON workspace_api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_api_keys_hash ON workspace_api_keys(key_hash) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workspace_api_keys_active ON workspace_api_keys(workspace_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workspace_api_keys_expires ON workspace_api_keys(expires_at) WHERE expires_at IS NOT NULL AND is_active = true;

-- Enable RLS (Row Level Security)
ALTER TABLE workspace_api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workspace-based access
CREATE POLICY "Users can view API keys for their workspaces" ON workspace_api_keys
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create API keys for workspaces with settings:write permission" ON workspace_api_keys
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT wu.workspace_id 
            FROM workspace_users wu
            JOIN workspace_roles wr ON wu.role_id = wr.id
            WHERE wu.user_id = auth.uid() 
            AND wr.permissions @> '["settings:write"]'
        )
    );

CREATE POLICY "Users can update API keys for workspaces with settings:write permission" ON workspace_api_keys
    FOR UPDATE USING (
        workspace_id IN (
            SELECT wu.workspace_id 
            FROM workspace_users wu
            JOIN workspace_roles wr ON wu.role_id = wr.id
            WHERE wu.user_id = auth.uid() 
            AND wr.permissions @> '["settings:write"]'
        )
    );

CREATE POLICY "Users can delete API keys for workspaces with settings:write permission" ON workspace_api_keys
    FOR DELETE USING (
        workspace_id IN (
            SELECT wu.workspace_id 
            FROM workspace_users wu
            JOIN workspace_roles wr ON wu.role_id = wr.id
            WHERE wu.user_id = auth.uid() 
            AND wr.permissions @> '["settings:write"]'
        )
    );

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION handle_workspace_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at
CREATE TRIGGER set_workspace_api_keys_updated_at
    BEFORE UPDATE ON workspace_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION handle_workspace_api_keys_updated_at();

-- Create function to clean up expired API keys
CREATE OR REPLACE FUNCTION cleanup_expired_api_keys()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE workspace_api_keys 
    SET is_active = false, 
        revoked_at = NOW()
    WHERE expires_at < NOW() 
    AND is_active = true;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON workspace_api_keys TO authenticated;
GRANT USAGE ON SEQUENCE workspace_api_keys_id_seq TO authenticated;

-- Add helpful comments
COMMENT ON TABLE workspace_api_keys IS 'Stores workspace-scoped API keys for external service access';
COMMENT ON COLUMN workspace_api_keys.workspace_id IS 'ID of the workspace this API key belongs to';
COMMENT ON COLUMN workspace_api_keys.user_id IS 'ID of the user who created this API key';
COMMENT ON COLUMN workspace_api_keys.name IS 'Human-readable name for the API key';
COMMENT ON COLUMN workspace_api_keys.key_hash IS 'SHA-256 hash of the actual API key for verification';
COMMENT ON COLUMN workspace_api_keys.permissions IS 'Array of permission scopes this key has access to';
COMMENT ON COLUMN workspace_api_keys.expires_at IS 'Optional expiration timestamp for the API key';
COMMENT ON COLUMN workspace_api_keys.revoked_at IS 'Timestamp when the key was revoked';
COMMENT ON COLUMN workspace_api_keys.revoked_by IS 'ID of the user who revoked this key';