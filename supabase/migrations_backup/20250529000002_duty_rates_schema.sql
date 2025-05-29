-- Duty rates schema for DutyLeak application
-- This migration creates the duty_rates table and related functionality

-- Create duty_rates table
CREATE TABLE IF NOT EXISTS duty_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classification_id UUID NOT NULL REFERENCES classifications(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  duty_percentage DECIMAL(10, 4) NOT NULL,
  vat_percentage DECIMAL(10, 4) NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(classification_id, country_code, effective_date)
);

-- Create RLS policies for duty_rates
ALTER TABLE duty_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY duty_rates_select ON duty_rates
  FOR SELECT USING (
    classification_id IN (
      SELECT id FROM classifications
      WHERE product_id IN (
        SELECT id FROM products
        WHERE workspace_id IN (
          SELECT workspace_id FROM workspace_users
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY duty_rates_insert ON duty_rates
  FOR INSERT WITH CHECK (
    classification_id IN (
      SELECT id FROM classifications
      WHERE product_id IN (
        SELECT id FROM products
        WHERE workspace_id IN (
          SELECT workspace_id FROM workspace_users
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY duty_rates_update ON duty_rates
  FOR UPDATE USING (
    classification_id IN (
      SELECT id FROM classifications
      WHERE product_id IN (
        SELECT id FROM products
        WHERE workspace_id IN (
          SELECT workspace_id FROM workspace_users
          WHERE user_id = auth.uid()
        )
      )
    )
  ) WITH CHECK (
    classification_id IN (
      SELECT id FROM classifications
      WHERE product_id IN (
        SELECT id FROM products
        WHERE workspace_id IN (
          SELECT workspace_id FROM workspace_users
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY duty_rates_delete ON duty_rates
  FOR DELETE USING (
    classification_id IN (
      SELECT id FROM classifications
      WHERE product_id IN (
        SELECT id FROM products
        WHERE workspace_id IN (
          SELECT workspace_id FROM workspace_users
          WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
        )
      )
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_duty_rates_updated_at
BEFORE UPDATE ON duty_rates
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create indexes for faster lookups
CREATE INDEX idx_duty_rates_classification_id ON duty_rates(classification_id);
CREATE INDEX idx_duty_rates_country_code ON duty_rates(country_code);
CREATE INDEX idx_duty_rates_effective_date ON duty_rates(effective_date);

-- Create function to get current duty rate for a classification and country
CREATE OR REPLACE FUNCTION get_current_duty_rate(classification_id UUID, country_code TEXT)
RETURNS TABLE (
  duty_percentage DECIMAL(10, 4),
  vat_percentage DECIMAL(10, 4),
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT dr.duty_percentage, dr.vat_percentage, dr.source
  FROM duty_rates dr
  WHERE dr.classification_id = get_current_duty_rate.classification_id
    AND dr.country_code = get_current_duty_rate.country_code
    AND dr.effective_date <= CURRENT_DATE
    AND (dr.expiry_date IS NULL OR dr.expiry_date >= CURRENT_DATE)
  ORDER BY dr.effective_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
