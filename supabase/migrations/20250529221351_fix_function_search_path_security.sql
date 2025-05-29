-- Fix security warnings by adding SET search_path = '' to all functions
-- This prevents potential SQL injection attacks

-- Fix update_updated_at function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix handle_new_user_signup function
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  -- Create a profile for the new user
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Create a default workspace for the new user
  INSERT INTO workspaces (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Workspace'))
  RETURNING id INTO NEW.raw_user_meta_data->'workspace_id';
  
  -- Add the user to the workspace as admin
  INSERT INTO workspace_users (workspace_id, user_id, role)
  VALUES (NEW.raw_user_meta_data->'workspace_id', NEW.id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix set_active_classification function
CREATE OR REPLACE FUNCTION set_active_classification()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  -- If this is a new classification being set as active
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    -- Set all other classifications for this product to inactive
    UPDATE classifications
    SET is_active = false
    WHERE product_id = NEW.product_id AND id != NEW.id;
    
    -- Calculate savings for this classification change
    PERFORM calculate_savings_on_classification_change();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix get_current_duty_rate function
CREATE OR REPLACE FUNCTION get_current_duty_rate(classification_id UUID, country_code TEXT)
RETURNS TABLE (
  duty_percentage DECIMAL(10, 4),
  vat_percentage DECIMAL(10, 4),
  source TEXT
)
SET search_path = ''
AS $$
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

-- Fix calculate_savings_on_classification_change function
CREATE OR REPLACE FUNCTION calculate_savings_on_classification_change()
RETURNS TRIGGER
SET search_path = ''
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
    -- Get the product details
    SELECT p.cost_per_unit, p.yearly_units
    INTO product_cost, yearly_units
    FROM products p
    WHERE p.id = NEW.product_id;
    
    -- Get the previously active classification
    SELECT c.id INTO old_class_id
    FROM classifications c
    WHERE c.product_id = NEW.product_id 
      AND c.is_active = false 
      AND c.id != NEW.id
    ORDER BY c.updated_at DESC
    LIMIT 1;
    
    -- Get old duty rate if there was a previous classification
    IF old_class_id IS NOT NULL THEN
      SELECT dr.duty_percentage INTO old_duty
      FROM duty_rates dr
      WHERE dr.classification_id = old_class_id
        AND dr.country_code = 'US' -- Default to US for now
        AND dr.effective_date <= CURRENT_DATE
        AND (dr.expiry_date IS NULL OR dr.expiry_date >= CURRENT_DATE)
      ORDER BY dr.effective_date DESC
      LIMIT 1;
    ELSE
      old_duty := 0;
    END IF;
    
    -- Get new duty rate
    SELECT dr.duty_percentage INTO new_duty
    FROM duty_rates dr
    WHERE dr.classification_id = NEW.id
      AND dr.country_code = 'US' -- Default to US for now
      AND dr.effective_date <= CURRENT_DATE
      AND (dr.expiry_date IS NULL OR dr.expiry_date >= CURRENT_DATE)
    ORDER BY dr.effective_date DESC
    LIMIT 1;
    
    -- Calculate yearly savings
    IF old_duty IS NOT NULL AND new_duty IS NOT NULL THEN
      yearly_saving := (product_cost * yearly_units * (old_duty - new_duty) / 100);
      
      -- Insert or update savings ledger
      INSERT INTO savings_ledger (
        product_id,
        old_classification_id,
        new_classification_id,
        old_duty_percentage,
        new_duty_percentage,
        yearly_saving_usd,
        calculation_date
      ) VALUES (
        NEW.product_id,
        old_class_id,
        NEW.id,
        COALESCE(old_duty, 0),
        COALESCE(new_duty, 0),
        yearly_saving,
        CURRENT_DATE
      )
      ON CONFLICT (product_id, new_classification_id)
      DO UPDATE SET
        old_classification_id = EXCLUDED.old_classification_id,
        old_duty_percentage = EXCLUDED.old_duty_percentage,
        new_duty_percentage = EXCLUDED.new_duty_percentage,
        yearly_saving_usd = EXCLUDED.yearly_saving_usd,
        calculation_date = EXCLUDED.calculation_date,
        updated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix get_workspace_total_savings function
CREATE OR REPLACE FUNCTION get_workspace_total_savings(workspace_id UUID)
RETURNS DECIMAL(12, 2)
SET search_path = ''
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