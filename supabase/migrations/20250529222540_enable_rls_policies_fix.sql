-- Enable RLS policies for tables with RLS enabled but no policies
-- This addresses the "RLS Enabled No Policy" security warnings

-- Policy for optimization_recommendations table
CREATE POLICY optimization_recommendations_workspace_isolation ON optimization_recommendations
    FOR ALL
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    ));

-- Policy for product_profitability_snapshots table
CREATE POLICY profitability_snapshots_workspace_isolation ON product_profitability_snapshots
    FOR ALL
    USING (product_id IN (
        SELECT id FROM products WHERE workspace_id IN (
            SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
        )
    ));