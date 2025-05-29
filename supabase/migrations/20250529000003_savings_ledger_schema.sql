-- Savings ledger schema for DutyLeak application
-- This migration creates the savings_ledger table and related functionality

-- Create savings_ledger table
CREATE TABLE IF NOT EXISTS savings_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_classification_id UUID REFERENCES classifications(id) ON DELETE SET NULL,
  new_classification_id UUID NOT NULL REFERENCES classifications(id) ON DELETE CASCADE,
  old_duty_percentage DECIMAL(10, 4) NOT NULL,
  new_duty_percentage DECIMAL(10, 4) NOT NULL,
  yearly_units INTEGER NOT NULL DEFAULT 0,
  yearly_saving_usd DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create RLS policies for savings_ledger
ALTER TABLE savings_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY savings_ledger_select ON savings_ledger
  FOR SELECT USING (
    product_id IN (
      SELECT id FROM products
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY savings_ledger_insert ON savings_ledger
  FOR INSERT WITH CHECK (
    product_id IN (
      SELECT id FROM products
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY savings_ledger_update ON savings_ledger
  FOR UPDATE USING (
    product_id IN (
      SELECT id FROM products
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users
        WHERE user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    product_id IN (
      SELECT id FROM products
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY savings_ledger_delete ON savings_ledger
  FOR DELETE USING (
    product_id IN (
      SELECT id FROM products
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users
        WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
      )
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_savings_ledger_updated_at
BEFORE UPDATE ON savings_ledger
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create indexes for faster lookups
CREATE INDEX idx_savings_ledger_product_id ON savings_ledger(product_id);
CREATE INDEX idx_savings_ledger_old_classification_id ON savings_ledger(old_classification_id);
CREATE INDEX idx_savings_ledger_new_classification_id ON savings_ledger(new_classification_id);

-- Create function to calculate savings when classification changes
CREATE OR REPLACE FUNCTION calculate_savings_on_classification_change()
RETURNS TRIGGER
SET search_path = ""
AS $$
DECLARE
  old_duty DECIMAL(10, 4);
  new_duty DECIMAL(10, 4);
  product_cost DECIMAL(10, 2);
  yearly_units INTEGER;
  yearly_saving DECIMAL(12, 2);
  old_class_id UUID;
BEGIN
  -- Only proceed if this is an active classification change
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    -- Get the product cost and yearly units
    SELECT cost, COALESCE(p.metadata->>'yearly_units', '0')::INTEGER
    INTO product_cost, yearly_units
    FROM products p
    WHERE p.id = NEW.product_id;
    
    -- If no product cost or yearly units, exit
    IF product_cost IS NULL OR yearly_units = 0 THEN
      RETURN NEW;
    END IF;
    
    -- Get the old duty rate from the previous active classification
    SELECT c.id, COALESCE(dr.duty_percentage, 0)
    INTO old_class_id, old_duty
    FROM classifications c
    LEFT JOIN duty_rates dr ON dr.classification_id = c.id
    WHERE c.product_id = NEW.product_id AND c.is_active = true AND c.id != NEW.id
    LIMIT 1;
    
    -- Get the new duty rate
    SELECT COALESCE(dr.duty_percentage, 0)
    INTO new_duty
    FROM duty_rates dr
    WHERE dr.classification_id = NEW.id
    LIMIT 1;
    
    -- If no duty rates found, exit
    IF new_duty IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate yearly saving
    yearly_saving := (old_duty - new_duty) * product_cost * yearly_units / 100;
    
    -- Only create a savings record if there's an actual saving
    IF yearly_saving > 0 THEN
      INSERT INTO savings_ledger (
        product_id,
        old_classification_id,
        new_classification_id,
        old_duty_percentage,
        new_duty_percentage,
        yearly_units,
        yearly_saving_usd
      ) VALUES (
        NEW.product_id,
        old_class_id,
        NEW.id,
        old_duty,
        new_duty,
        yearly_units,
        yearly_saving
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for calculating savings on classification change
CREATE TRIGGER on_classification_change_calculate_savings
AFTER INSERT OR UPDATE OF is_active ON classifications
FOR EACH ROW EXECUTE FUNCTION calculate_savings_on_classification_change();

-- Create function to get total savings for a workspace
CREATE OR REPLACE FUNCTION get_workspace_total_savings(workspace_id UUID)
RETURNS DECIMAL(12, 2)
SET search_path = ""
AS $$
DECLARE
  total_savings DECIMAL(12, 2);
BEGIN
  SELECT COALESCE(SUM(sl.yearly_saving_usd), 0)
  INTO total_savings
  FROM savings_ledger sl
  JOIN products p ON p.id = sl.product_id
  WHERE p.workspace_id = get_workspace_total_savings.workspace_id;
  
  RETURN total_savings;
END;
$$ LANGUAGE plpgsql;
