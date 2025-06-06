-- Create api_keys table for storing encrypted API keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_name VARCHAR(50) NOT NULL,
    api_key TEXT NOT NULL, -- Will be encrypted at application level
    is_active BOOLEAN DEFAULT true,
    test_status VARCHAR(20) DEFAULT 'pending' CHECK (test_status IN ('pending', 'success', 'failed')),
    last_tested TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one API key per service per user
    UNIQUE(user_id, service_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_service ON api_keys(user_id, service_name);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- Enable RLS (Row Level Security)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own API keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically set user_id and updated_at
CREATE OR REPLACE FUNCTION handle_api_keys_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set user_id on insert
    IF TG_OP = 'INSERT' THEN
        NEW.user_id = auth.uid();
    END IF;
    
    -- Update updated_at on update
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER set_api_keys_user_id
    BEFORE INSERT OR UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION handle_api_keys_user_id();

-- Grant necessary permissions
GRANT ALL ON api_keys TO authenticated;

-- Add helpful comments
COMMENT ON TABLE api_keys IS 'Stores encrypted API keys for external services';
COMMENT ON COLUMN api_keys.service_name IS 'Name of the external service (openai, anthropic, customs_api, etc.)';
COMMENT ON COLUMN api_keys.api_key IS 'Encrypted API key for the service';
COMMENT ON COLUMN api_keys.test_status IS 'Status of the last API key test';
COMMENT ON COLUMN api_keys.last_tested IS 'Timestamp of the last successful API test';