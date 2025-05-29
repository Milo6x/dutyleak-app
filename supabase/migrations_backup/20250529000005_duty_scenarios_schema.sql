-- Duty scenarios schema for DutyLeak
-- Migration: 20250529000005_duty_scenarios_schema.sql

-- Create duty_scenarios table
CREATE TABLE duty_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_classification_id UUID NOT NULL REFERENCES classifications(id),
  alternative_classification_id UUID NOT NULL REFERENCES classifications(id),
  destination_country CHAR(2) NOT NULL,
  product_value NUMERIC(10,2) NOT NULL,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  insurance_cost NUMERIC(10,2) DEFAULT 0,
  fba_fee_amount NUMERIC(10,2) DEFAULT 0,
  yearly_units INTEGER,
  base_duty_amount NUMERIC(10,2) NOT NULL,
  alternative_duty_amount NUMERIC(10,2) NOT NULL,
  potential_saving NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create optimization_recommendations table
CREATE TABLE optimization_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  current_classification_id UUID NOT NULL REFERENCES classifications(id),
  recommended_classification_id UUID NOT NULL REFERENCES classifications(id),
  confidence_score NUMERIC(3,2) NOT NULL,
  potential_saving NUMERIC(10,2) NOT NULL,
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_duty_scenarios_workspace ON duty_scenarios(workspace_id);
CREATE INDEX idx_duty_scenarios_base_classification ON duty_scenarios(base_classification_id);
CREATE INDEX idx_duty_scenarios_alternative_classification ON duty_scenarios(alternative_classification_id);
CREATE INDEX idx_duty_scenarios_potential_saving ON duty_scenarios(potential_saving DESC);

CREATE INDEX idx_optimization_recommendations_workspace ON optimization_recommendations(workspace_id);
CREATE INDEX idx_optimization_recommendations_product ON optimization_recommendations(product_id);
CREATE INDEX idx_optimization_recommendations_current_classification ON optimization_recommendations(current_classification_id);
CREATE INDEX idx_optimization_recommendations_recommended_classification ON optimization_recommendations(recommended_classification_id);
CREATE INDEX idx_optimization_recommendations_potential_saving ON optimization_recommendations(potential_saving DESC);
CREATE INDEX idx_optimization_recommendations_status ON optimization_recommendations(status);

-- Add RLS policies
ALTER TABLE duty_scenarios ENABLE ROW LEVEL SECURITY;
-- RLS policies will be configured in production deployment
-- CREATE POLICY duty_scenarios_workspace_isolation ON duty_scenarios
--     USING (workspace_id = auth.jwt.claims.workspace_id::UUID);

ALTER TABLE optimization_recommendations ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY optimization_recommendations_workspace_isolation ON optimization_recommendations
--     USING (workspace_id = auth.jwt.claims.workspace_id::UUID);

-- Comments for documentation
COMMENT ON TABLE duty_scenarios IS 'Scenarios for comparing different HS classifications and their duty implications';
COMMENT ON TABLE optimization_recommendations IS 'System-generated recommendations for optimizing duty rates through classification changes';
