-- Classifications schema for DutyLeak application
-- This migration creates the classifications table and related functionality

-- Create classifications table
CREATE TABLE IF NOT EXISTS classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  hs6 TEXT NOT NULL,
  hs8 TEXT,
  confidence_score DECIMAL(5, 2) NOT NULL,
  source TEXT NOT NULL,
  ruling_reference TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint to products table
ALTER TABLE products 
ADD CONSTRAINT fk_products_active_classification 
FOREIGN KEY (active_classification_id) 
REFERENCES classifications(id) 
ON DELETE SET NULL;

-- Create RLS policies for classifications
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY classifications_select ON classifications
  FOR SELECT USING (
    product_id IN (
      SELECT id FROM products
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY classifications_insert ON classifications
  FOR INSERT WITH CHECK (
    product_id IN (
      SELECT id FROM products
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY classifications_update ON classifications
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

CREATE POLICY classifications_delete ON classifications
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
CREATE TRIGGER update_classifications_updated_at
BEFORE UPDATE ON classifications
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create function to handle setting active classification
CREATE OR REPLACE FUNCTION set_active_classification()
RETURNS TRIGGER
SET search_path = ""
AS $$
BEGIN
  -- If this is a new classification being set as active
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    -- Set all other classifications for this product to inactive
    UPDATE classifications
    SET is_active = false
    WHERE product_id = NEW.product_id AND id != NEW.id;
    
    -- Update the product's active_classification_id
    UPDATE products
    SET active_classification_id = NEW.id
    WHERE id = NEW.product_id;
  -- If this classification is being set to inactive and it was the active one
  ELSIF NEW.is_active = false AND OLD.is_active = true THEN
    -- Clear the product's active_classification_id
    UPDATE products
    SET active_classification_id = NULL
    WHERE id = NEW.product_id AND active_classification_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for setting active classification
CREATE TRIGGER on_classification_active_change
AFTER INSERT OR UPDATE OF is_active ON classifications
FOR EACH ROW EXECUTE FUNCTION set_active_classification();

-- Create index for faster lookups
CREATE INDEX idx_classifications_product_id ON classifications(product_id);
CREATE INDEX idx_classifications_is_active ON classifications(is_active);
CREATE INDEX idx_classifications_hs6 ON classifications(hs6);
