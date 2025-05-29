-- Migration: 20250529184103_apply_all_schemas.sql
-- This migration applies all missing schema changes

-- Add missing columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS fba_fee_estimate_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS yearly_units INTEGER,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS active_classification_id UUID;

-- Create classifications table if not exists
CREATE TABLE IF NOT EXISTS classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  hs6 TEXT NOT NULL,
  hs8 TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create duty_rates table if not exists
CREATE TABLE IF NOT EXISTS duty_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classification_id UUID NOT NULL REFERENCES classifications(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  duty_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create duty_calculations table if not exists
CREATE TABLE IF NOT EXISTS duty_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  classification_id UUID NOT NULL REFERENCES classifications(id),
  destination_country TEXT NOT NULL,
  product_value NUMERIC(10,2) NOT NULL,
  shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  insurance_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  fba_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  duty_percentage NUMERIC(5,2) NOT NULL,
  vat_percentage NUMERIC(5,2) NOT NULL,
  duty_amount NUMERIC(10,2) NOT NULL,
  vat_amount NUMERIC(10,2) NOT NULL,
  total_landed_cost NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create savings_ledger table if not exists
CREATE TABLE IF NOT EXISTS savings_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  calculation_id UUID NOT NULL REFERENCES duty_calculations(id) ON DELETE CASCADE,
  savings_amount NUMERIC(10,2) NOT NULL,
  savings_percentage NUMERIC(5,2) NOT NULL,
  baseline_duty_rate NUMERIC(5,2) NOT NULL,
  optimized_duty_rate NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create duty_scenarios table if not exists
CREATE TABLE IF NOT EXISTS duty_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_product_id UUID REFERENCES products(id),
  scenario_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create review_queue table if not exists
CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  review_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,
  assigned_to UUID REFERENCES profiles(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_fba_fee ON products(fba_fee_estimate_usd) WHERE fba_fee_estimate_usd IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_yearly_units ON products(yearly_units) WHERE yearly_units IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_workspace ON products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_classifications_workspace ON classifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_duty_rates_classification ON duty_rates(classification_id);
CREATE INDEX IF NOT EXISTS idx_duty_calculations_product ON duty_calculations(product_id);
CREATE INDEX IF NOT EXISTS idx_savings_ledger_workspace ON savings_ledger(workspace_id);
CREATE INDEX IF NOT EXISTS idx_duty_scenarios_workspace ON duty_scenarios(workspace_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_workspace ON review_queue(workspace_id);

-- Enable RLS on new tables
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS classifications_workspace_isolation ON classifications
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS duty_rates_workspace_isolation ON duty_rates
    USING (classification_id IN (
        SELECT id FROM classifications WHERE workspace_id IN (
            SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY IF NOT EXISTS duty_calculations_workspace_isolation ON duty_calculations
    USING (product_id IN (
        SELECT id FROM products WHERE workspace_id IN (
            SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY IF NOT EXISTS savings_ledger_workspace_isolation ON savings_ledger
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS duty_scenarios_workspace_isolation ON duty_scenarios
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS review_queue_workspace_isolation ON review_queue
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    ));

-- Add comments for documentation
COMMENT ON COLUMN products.fba_fee_estimate_usd IS 'Estimated FBA fee in USD for the product';
COMMENT ON COLUMN products.yearly_units IS 'Estimated annual sales volume in units';
COMMENT ON COLUMN duty_calculations.fba_fee_amount IS 'FBA fee amount used in this specific duty calculation';