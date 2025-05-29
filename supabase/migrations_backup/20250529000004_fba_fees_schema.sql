-- FBA fees schema for DutyLeak
-- Migration: 20250529000004_fba_fees_schema.sql

-- Add FBA fee estimate to products table
ALTER TABLE products
ADD COLUMN fba_fee_estimate_usd NUMERIC(10,2),
ADD COLUMN yearly_units INTEGER;

-- FBA fee amount will be added to duty_calculations table in later migration

-- Create index for performance
CREATE INDEX idx_products_fba_fee ON products(fba_fee_estimate_usd) WHERE fba_fee_estimate_usd IS NOT NULL;
CREATE INDEX idx_products_yearly_units ON products(yearly_units) WHERE yearly_units IS NOT NULL;
-- Index for duty_calculations will be created in later migration

-- Add RLS policies (simplified for local development)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- Workspace isolation policy will be added in production deployment

-- RLS for duty_calculations will be configured in later migration
-- ALTER TABLE duty_calculations ENABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON COLUMN products.fba_fee_estimate_usd IS 'Estimated FBA fee in USD for the product';
COMMENT ON COLUMN products.yearly_units IS 'Estimated annual sales volume in units';
-- Comment for duty_calculations will be added in later migration
