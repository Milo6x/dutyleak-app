-- Create classification_logs table for tracking usage and analytics
CREATE TABLE IF NOT EXISTS classification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    classification_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_classification_logs_user_id ON classification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_classification_logs_created_at ON classification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_classification_logs_user_created ON classification_logs(user_id, created_at);

-- Create index on JSONB data for analytics queries
CREATE INDEX IF NOT EXISTS idx_classification_logs_data_type ON classification_logs ((classification_data->>'type'));
CREATE INDEX IF NOT EXISTS idx_classification_logs_data_source ON classification_logs ((classification_data->>'source'));

-- Enable Row Level Security (RLS)
ALTER TABLE classification_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own classification logs" ON classification_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own classification logs" ON classification_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own classification logs" ON classification_logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own classification logs" ON classification_logs
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_classification_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_classification_logs_updated_at
    BEFORE UPDATE ON classification_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_classification_logs_updated_at();

-- Create function to automatically set user_id from auth context
CREATE OR REPLACE FUNCTION set_classification_logs_user_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_classification_logs_user_id
    BEFORE INSERT ON classification_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_classification_logs_user_id();

-- Grant necessary permissions
GRANT ALL ON classification_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create view for analytics (admin only)
CREATE OR REPLACE VIEW classification_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    classification_data->>'type' as classification_type,
    classification_data->>'source' as ai_source,
    COUNT(*) as total_classifications,
    COUNT(*) FILTER (WHERE (classification_data->>'confidence')::numeric >= 80) as high_confidence_count,
    AVG((classification_data->>'confidence')::numeric) as avg_confidence,
    COUNT(DISTINCT user_id) as unique_users
FROM classification_logs
WHERE classification_data->>'type' IS NOT NULL
GROUP BY DATE_TRUNC('day', created_at), classification_data->>'type', classification_data->>'source'
ORDER BY date DESC;

-- Grant view access to service role only (for admin analytics)
GRANT SELECT ON classification_analytics TO service_role;

-- Add comment for documentation
COMMENT ON TABLE classification_logs IS 'Stores classification requests and results for analytics and usage tracking';
COMMENT ON COLUMN classification_logs.classification_data IS 'JSONB containing classification request details, results, and metadata';
COMMENT ON VIEW classification_analytics IS 'Aggregated analytics view for classification usage patterns (admin access only)';