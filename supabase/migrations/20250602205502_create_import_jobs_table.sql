-- Create import_jobs table for tracking data import operations
CREATE TABLE import_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('full', 'products', 'classifications', 'calculations', 'workspace')),
    format TEXT NOT NULL CHECK (format IN ('json', 'csv')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_name TEXT NOT NULL,
    file_size TEXT,
    imported_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX idx_import_jobs_user_id ON import_jobs(user_id);
CREATE INDEX idx_import_jobs_workspace_id ON import_jobs(workspace_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own import jobs" ON import_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import jobs" ON import_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import jobs" ON import_jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own import jobs" ON import_jobs
    FOR DELETE USING (auth.uid() = user_id);