-- Review queue schema for DutyLeak
-- Migration: 20250529000007_review_queue_schema.sql

-- Create review_queue table
CREATE TABLE review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  classification_id UUID NOT NULL REFERENCES classifications(id) ON DELETE CASCADE,
  confidence_score NUMERIC(3,2),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_review_queue_workspace ON review_queue(workspace_id);
CREATE INDEX idx_review_queue_product ON review_queue(product_id);
CREATE INDEX idx_review_queue_classification ON review_queue(classification_id);
CREATE INDEX idx_review_queue_status ON review_queue(status);
CREATE INDEX idx_review_queue_confidence ON review_queue(confidence_score);
CREATE INDEX idx_review_queue_created_at ON review_queue(created_at DESC);

-- Add RLS policies
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
-- RLS policies will be configured in production deployment
-- CREATE POLICY review_queue_workspace_isolation ON review_queue
-- USING (workspace_id = auth.jwt.claims.workspace_id::UUID);

-- Create profitability_snapshots table
CREATE TABLE product_profitability_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sale_price NUMERIC(10,2) NOT NULL,
  cogs NUMERIC(10,2) NOT NULL,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  duty_amount NUMERIC(10,2) DEFAULT 0,
  vat_amount NUMERIC(10,2) DEFAULT 0,
  fba_fee_amount NUMERIC(10,2) DEFAULT 0,
  marketplace_fee_amount NUMERIC(10,2) DEFAULT 0,
  other_costs NUMERIC(10,2) DEFAULT 0,
  profit_amount NUMERIC(10,2) NOT NULL,
  profit_margin_percentage NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for profitability_snapshots
CREATE INDEX idx_profitability_snapshots_product ON product_profitability_snapshots(product_id);
CREATE INDEX idx_profitability_snapshots_date ON product_profitability_snapshots(date DESC);
CREATE INDEX idx_profitability_snapshots_profit_margin ON product_profitability_snapshots(profit_margin_percentage DESC);

-- Add RLS policies for profitability_snapshots
ALTER TABLE product_profitability_snapshots ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY profitability_snapshots_workspace_isolation ON product_profitability_snapshots
--     USING (product_id IN (SELECT id FROM products WHERE workspace_id = auth.jwt.claims.workspace_id::UUID));

-- Comments for documentation
COMMENT ON TABLE review_queue IS 'Queue for manual review of product classifications with low confidence or other issues';
COMMENT ON TABLE product_profitability_snapshots IS 'Historical snapshots of product profitability including all cost components';
