-- Enhanced duty_rates table migration
-- This script enhances the existing duty_rates table to support multi-country rule management

-- Add new columns to duty_rates table for enhanced functionality
ALTER TABLE duty_rates 
ADD COLUMN IF NOT EXISTS origin_country_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS trade_agreement VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferential_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS additional_fees JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rule_source VARCHAR(20) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_duty_rates_country_origin 
ON duty_rates(country_code, origin_country_code);

CREATE INDEX IF NOT EXISTS idx_duty_rates_trade_agreement 
ON duty_rates(trade_agreement) WHERE trade_agreement IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_duty_rates_effective_date 
ON duty_rates(effective_date DESC);

-- Create trade_agreements table
CREATE TABLE IF NOT EXISTS trade_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  countries TEXT[] NOT NULL,
  hs_code_benefits JSONB DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',
  effective_date DATE NOT NULL,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create country_tax_rules table for centralized tax information
CREATE TABLE IF NOT EXISTS country_tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) UNIQUE NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_type VARCHAR(20) NOT NULL, -- VAT, GST, sales_tax, none
  tax_name VARCHAR(100),
  additional_fees JSONB DEFAULT '{}',
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create duty_rate_history table for audit trail
CREATE TABLE IF NOT EXISTS duty_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_rate_id UUID NOT NULL REFERENCES duty_rates(id),
  old_duty_percentage DECIMAL(5,2),
  new_duty_percentage DECIMAL(5,2),
  old_vat_percentage DECIMAL(5,2),
  new_vat_percentage DECIMAL(5,2),
  change_reason TEXT,
  changed_by UUID, -- Reference to user who made the change
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial trade agreements data
INSERT INTO trade_agreements (code, name, countries, hs_code_benefits, requirements, effective_date) VALUES
('USMCA', 'United States-Mexico-Canada Agreement', 
 ARRAY['US', 'CA', 'MX'], 
 '{"87": 0, "84": 0, "85": 0}',
 ARRAY['Certificate of Origin', 'Regional Value Content'],
 '2020-07-01'),
('EU-Japan EPA', 'EU-Japan Economic Partnership Agreement',
 ARRAY['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'JP'],
 '{"87": 0, "22": 0}',
 ARRAY['EUR.1 Certificate', 'Origin Declaration'],
 '2019-02-01'),
('CPTPP', 'Comprehensive and Progressive Trans-Pacific Partnership',
 ARRAY['AU', 'CA', 'JP', 'NZ', 'SG', 'VN'],
 '{"84": 0, "85": 0}',
 ARRAY['Certificate of Origin'],
 '2018-12-30')
ON CONFLICT (code) DO NOTHING;

-- Insert initial country tax rules
INSERT INTO country_tax_rules (country_code, country_name, tax_rate, tax_type, tax_name, additional_fees, effective_date) VALUES
('US', 'United States', 0.00, 'none', 'No Federal VAT', 
 '{"mpf": {"rate": 0.3464, "min": 27.23, "max": 528.33}, "hmf": {"rate": 0.125}, "brokerFee": {"fixed": 50, "percentage": 0.5}}',
 '2024-01-01'),
('GB', 'United Kingdom', 20.00, 'VAT', 'Value Added Tax',
 '{"customsFee": {"fixed": 25}}',
 '2024-01-01'),
('DE', 'Germany', 19.00, 'VAT', 'Mehrwertsteuer', '{}', '2024-01-01'),
('FR', 'France', 20.00, 'VAT', 'Taxe sur la valeur ajoutée', '{}', '2024-01-01'),
('CA', 'Canada', 13.00, 'GST', 'Harmonized Sales Tax (average)', '{}', '2024-01-01'),
('AU', 'Australia', 10.00, 'GST', 'Goods and Services Tax', '{}', '2024-01-01')
ON CONFLICT (country_code) DO NOTHING;

-- Create function to update duty_rate_history on changes
CREATE OR REPLACE FUNCTION log_duty_rate_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO duty_rate_history (
      duty_rate_id,
      old_duty_percentage,
      new_duty_percentage,
      old_vat_percentage,
      new_vat_percentage,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.duty_percentage,
      NEW.duty_percentage,
      OLD.vat_percentage,
      NEW.vat_percentage,
      'Automated update'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for duty rate changes
DROP TRIGGER IF EXISTS duty_rate_changes_trigger ON duty_rates;
CREATE TRIGGER duty_rate_changes_trigger
  AFTER UPDATE ON duty_rates
  FOR EACH ROW
  EXECUTE FUNCTION log_duty_rate_changes();

-- Create view for easy querying of duty rates with country and classification info
CREATE OR REPLACE VIEW duty_rates_view AS
SELECT 
  dr.id,
  dr.duty_percentage,
  dr.vat_percentage,
  dr.country_code,
  dr.origin_country_code,
  dr.trade_agreement,
  dr.preferential_rate,
  dr.additional_fees,
  dr.rule_source,
  dr.confidence_score,
  dr.effective_date,
  dr.expiry_date,
  dr.notes,
  c.hs6,
  c.hs8,
  c.description as classification_description,
  ctr.country_name,
  ctr.tax_rate as country_tax_rate,
  ctr.tax_type,
  ctr.tax_name
FROM duty_rates dr
JOIN classifications c ON dr.classification_id = c.id
LEFT JOIN country_tax_rules ctr ON dr.country_code = ctr.country_code;

-- Create function to get effective duty rate considering trade agreements
CREATE OR REPLACE FUNCTION get_effective_duty_rate(
  p_hs_code VARCHAR(10),
  p_destination_country VARCHAR(2),
  p_origin_country VARCHAR(2) DEFAULT NULL,
  p_trade_agreement VARCHAR(50) DEFAULT NULL,
  p_effective_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  duty_rate DECIMAL(5,2),
  vat_rate DECIMAL(5,2),
  preferential_treatment BOOLEAN,
  trade_agreement_applied VARCHAR(50),
  confidence DECIMAL(3,2)
) AS $$
DECLARE
  v_classification_id UUID;
  v_duty_record RECORD;
  v_preferential_rate DECIMAL(5,2);
  v_agreement_rate DECIMAL(5,2);
BEGIN
  -- Get classification ID
  SELECT id INTO v_classification_id
  FROM classifications
  WHERE hs6 = LEFT(p_hs_code, 6) OR hs8 = p_hs_code
  ORDER BY CASE WHEN hs8 = p_hs_code THEN 1 ELSE 2 END
  LIMIT 1;
  
  IF v_classification_id IS NULL THEN
    -- Return default rates if no classification found
    RETURN QUERY SELECT 5.0::DECIMAL(5,2), 10.0::DECIMAL(5,2), FALSE, NULL::VARCHAR(50), 0.3::DECIMAL(3,2);
    RETURN;
  END IF;
  
  -- Get base duty rate
  SELECT * INTO v_duty_record
  FROM duty_rates
  WHERE classification_id = v_classification_id
    AND country_code = p_destination_country
    AND (effective_date IS NULL OR effective_date <= p_effective_date)
    AND (expiry_date IS NULL OR expiry_date > p_effective_date)
  ORDER BY effective_date DESC NULLS LAST
  LIMIT 1;
  
  IF v_duty_record IS NULL THEN
    -- Return default rates if no duty rate found
    RETURN QUERY SELECT 5.0::DECIMAL(5,2), 10.0::DECIMAL(5,2), FALSE, NULL::VARCHAR(50), 0.3::DECIMAL(3,2);
    RETURN;
  END IF;
  
  -- Check for preferential rates based on origin country
  IF p_origin_country IS NOT NULL THEN
    SELECT preferential_rate INTO v_preferential_rate
    FROM duty_rates
    WHERE classification_id = v_classification_id
      AND country_code = p_destination_country
      AND origin_country_code = p_origin_country
      AND (effective_date IS NULL OR effective_date <= p_effective_date)
      AND (expiry_date IS NULL OR expiry_date > p_effective_date)
    ORDER BY effective_date DESC NULLS LAST
    LIMIT 1;
  END IF;
  
  -- Check for trade agreement benefits
  IF p_trade_agreement IS NOT NULL AND p_origin_country IS NOT NULL THEN
    SELECT (hs_code_benefits->>LEFT(p_hs_code, 2))::DECIMAL(5,2) INTO v_agreement_rate
    FROM trade_agreements
    WHERE code = p_trade_agreement
      AND p_destination_country = ANY(countries)
      AND p_origin_country = ANY(countries)
      AND effective_date <= p_effective_date
      AND (expiry_date IS NULL OR expiry_date > p_effective_date);
  END IF;
  
  -- Return the most beneficial rate
  IF v_agreement_rate IS NOT NULL AND v_agreement_rate < COALESCE(v_preferential_rate, v_duty_record.duty_percentage) THEN
    RETURN QUERY SELECT v_agreement_rate, v_duty_record.vat_percentage, TRUE, p_trade_agreement, v_duty_record.confidence_score;
  ELSIF v_preferential_rate IS NOT NULL AND v_preferential_rate < v_duty_record.duty_percentage THEN
    RETURN QUERY SELECT v_preferential_rate, v_duty_record.vat_percentage, TRUE, NULL::VARCHAR(50), v_duty_record.confidence_score;
  ELSE
    RETURN QUERY SELECT v_duty_record.duty_percentage, v_duty_record.vat_percentage, FALSE, NULL::VARCHAR(50), v_duty_record.confidence_score;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classifications_hs6 ON classifications(hs6);
CREATE INDEX IF NOT EXISTS idx_classifications_hs8 ON classifications(hs8);
CREATE INDEX IF NOT EXISTS idx_trade_agreements_countries ON trade_agreements USING GIN(countries);
CREATE INDEX IF NOT EXISTS idx_duty_rates_classification_country ON duty_rates(classification_id, country_code);

-- Add comments for documentation
COMMENT ON TABLE duty_rates IS 'Enhanced duty rates table supporting multi-country rules, trade agreements, and preferential treatment';
COMMENT ON TABLE trade_agreements IS 'Trade agreements with participating countries and HS code benefits';
COMMENT ON TABLE country_tax_rules IS 'Country-specific tax rules and additional fees';
COMMENT ON TABLE duty_rate_history IS 'Audit trail for duty rate changes';
COMMENT ON FUNCTION get_effective_duty_rate IS 'Calculate effective duty rate considering trade agreements and preferential treatment';