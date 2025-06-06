// Enhanced Scenario Data Model Types
// Comprehensive type definitions for advanced scenario modeling and comparison

export interface ScenarioGroup {
  id: string
  workspace_id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
  metadata: Record<string, any>
}

export interface ScenarioTemplate {
  id: string
  workspace_id: string
  name: string
  description?: string
  category: 'optimization' | 'comparison' | 'analysis'
  configuration: ScenarioConfiguration
  is_public: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface EnhancedScenario {
  id: string
  workspace_id: string
  group_id?: string
  template_id?: string
  name: string
  description?: string
  scenario_type: 'baseline' | 'optimization' | 'comparison' | 'what_if'
  status: 'draft' | 'active' | 'archived' | 'completed'
  configuration: ScenarioConfiguration
  results: ScenarioResults
  created_by: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface ScenarioProduct {
  id: string
  scenario_id: string
  product_id: string
  configuration: ProductScenarioConfiguration
  results: ProductScenarioResults
  created_at: string
  updated_at: string
}

export interface ScenarioComparison {
  id: string
  workspace_id: string
  name: string
  description?: string
  scenario_ids: string[]
  comparison_type: 'side_by_side' | 'matrix' | 'timeline'
  results: ComparisonResults
  created_by: string
  created_at: string
  updated_at: string
}

export interface OptimizationRecommendation {
  id: string
  workspace_id: string
  scenario_id?: string
  product_id?: string
  recommendation_type: 'classification' | 'origin' | 'shipping' | 'fba' | 'trade_agreement'
  title: string
  description: string
  impact_analysis: ImpactAnalysis
  implementation_requirements: ImplementationRequirements
  confidence_score: number // 0-1
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'accepted' | 'rejected' | 'implemented'
  created_at: string
  updated_at: string
}

// Configuration Types
export interface ScenarioConfiguration {
  includeShippingVariations?: boolean
  includeOriginCountryVariations?: boolean
  includeClassificationVariations?: boolean
  includeTradeAgreements?: boolean
  includeFBAOptimizations?: boolean
  timeHorizonMonths?: number
  confidenceThreshold?: number
  minSavingThreshold?: number
  maxScenarios?: number
  analysisDepth?: 'basic' | 'comprehensive' | 'detailed'
  destinationCountries?: string[]
  originCountries?: string[]
  shippingMethods?: string[]
  customParameters?: Record<string, any>
}

export interface ProductScenarioConfiguration {
  overrideValues?: {
    value?: number
    weight?: number
    dimensions?: {
      length: number
      width: number
      height: number
    }
    origin_country?: string
    hs_code?: string
  }
  shippingOptions?: {
    method: string
    cost: number
    transit_time?: number
  }[]
  fbaSettings?: {
    enabled: boolean
    fulfillment_center?: string
    storage_fees?: number
    fulfillment_fees?: number
  }
  customSettings?: Record<string, any>
}

// Results Types
export interface ScenarioResults {
  summary: {
    total_products: number
    total_current_cost: number
    total_optimized_cost: number
    total_savings: number
    total_savings_percentage: number
    average_roi: number
    execution_time_ms: number
    last_updated: string
  }
  breakdown: {
    duty_savings: number
    vat_savings: number
    shipping_savings: number
    fba_savings: number
    other_savings: number
  }
  recommendations: OptimizationRecommendation[]
  risk_assessment: RiskAssessment
  implementation_timeline: ImplementationTimeline
  metadata: Record<string, any>
}

export interface ProductScenarioResults {
  baseline: LandedCostBreakdown
  optimized: LandedCostBreakdown
  savings: SavingsBreakdown
  recommendations: ProductRecommendation[]
  risk_factors: string[]
  confidence_score: number
  last_calculated: string
}

export interface ComparisonResults {
  scenarios: ScenarioComparisonData[]
  summary: {
    best_scenario_id: string
    worst_scenario_id: string
    average_savings: number
    total_variance: number
  }
  metrics: ComparisonMetric[]
  charts_data: ChartData[]
  recommendations: string[]
  generated_at: string
}

// Supporting Types
export interface LandedCostBreakdown {
  product_value: number
  duty_amount: number
  vat_amount: number
  shipping_cost: number
  insurance_cost: number
  fba_fees: number
  broker_fees: number
  other_fees: number
  total_landed_cost: number
  profit_margin?: number
  selling_price?: number
}

export interface SavingsBreakdown {
  duty_reduction: number
  vat_reduction: number
  shipping_reduction: number
  fba_reduction: number
  other_reduction: number
  total_savings_per_unit: number
  total_savings_percentage: number
  annual_savings: number
  roi: number
  payback_period_months: number
}

export interface ProductRecommendation {
  type: string
  title: string
  description: string
  impact: number
  effort: 'low' | 'medium' | 'high'
  timeline: string
  confidence: number
}

export interface RiskAssessment {
  compliance_risk: 'low' | 'medium' | 'high'
  supplier_risk: 'low' | 'medium' | 'high'
  market_risk: 'low' | 'medium' | 'high'
  operational_risk: 'low' | 'medium' | 'high'
  overall_risk: 'low' | 'medium' | 'high'
  mitigation_strategies: string[]
  risk_factors: {
    factor: string
    severity: 'low' | 'medium' | 'high'
    probability: number
    impact: string
  }[]
}

export interface ImplementationTimeline {
  phases: {
    name: string
    duration_weeks: number
    dependencies: string[]
    deliverables: string[]
    resources_required: string[]
  }[]
  total_duration_weeks: number
  critical_path: string[]
  milestones: {
    name: string
    week: number
    description: string
  }[]
}

export interface ImpactAnalysis {
  financial_impact: {
    savings_per_unit: number
    annual_savings: number
    implementation_cost: number
    roi: number
    payback_period_months: number
  }
  operational_impact: {
    complexity: 'low' | 'medium' | 'high'
    resource_requirements: string[]
    timeline_weeks: number
    dependencies: string[]
  }
  risk_impact: {
    compliance_risk: 'low' | 'medium' | 'high'
    business_risk: 'low' | 'medium' | 'high'
    mitigation_required: boolean
  }
}

export interface ImplementationRequirements {
  documentation: {
    required: boolean
    documents: string[]
    estimated_hours: number
  }
  certifications: {
    required: boolean
    certifications: string[]
    estimated_cost: number
    timeline_weeks: number
  }
  supplier_changes: {
    required: boolean
    changes: string[]
    risk_level: 'low' | 'medium' | 'high'
  }
  process_changes: {
    required: boolean
    processes: string[]
    training_required: boolean
  }
  legal_review: {
    required: boolean
    scope: string[]
    estimated_cost: number
  }
}

export interface ScenarioComparisonData {
  scenario_id: string
  scenario_name: string
  total_cost: number
  total_savings: number
  savings_percentage: number
  risk_score: number
  implementation_complexity: 'low' | 'medium' | 'high'
  timeline_weeks: number
  confidence_score: number
}

export interface ComparisonMetric {
  name: string
  unit: string
  values: {
    scenario_id: string
    value: number
    rank: number
  }[]
  best_value: number
  worst_value: number
  variance: number
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'radar'
  title: string
  data: any[]
  config: Record<string, any>
}

// API Request/Response Types
export interface CreateScenarioRequest {
  name: string
  description?: string
  scenario_type: EnhancedScenario['scenario_type']
  group_id?: string
  template_id?: string
  configuration: ScenarioConfiguration
  product_ids: string[]
  workspace_id: string
}

export interface UpdateScenarioRequest {
  name?: string
  description?: string
  status?: EnhancedScenario['status']
  configuration?: Partial<ScenarioConfiguration>
}

export interface RunScenarioAnalysisRequest {
  scenario_id: string
  force_recalculation?: boolean
  include_recommendations?: boolean
}

export interface CreateComparisonRequest {
  name: string
  description?: string
  scenario_ids: string[]
  comparison_type: ScenarioComparison['comparison_type']
}

export interface ScenarioAnalysisResponse {
  scenario: EnhancedScenario
  results: ScenarioResults
  products: (ScenarioProduct & {
    product: {
      id: string
      name: string
      hs_code: string
      value: number
    }
  })[]
  recommendations: OptimizationRecommendation[]
}

export interface ComparisonAnalysisResponse {
  comparison: ScenarioComparison
  scenarios: EnhancedScenario[]
  results: ComparisonResults
}

// Utility Types
export type ScenarioStatus = EnhancedScenario['status']
export type ScenarioType = EnhancedScenario['scenario_type']
export type RecommendationType = OptimizationRecommendation['recommendation_type']
export type RecommendationPriority = OptimizationRecommendation['priority']
export type RecommendationStatus = OptimizationRecommendation['status']
export type ComparisonType = ScenarioComparison['comparison_type']
export type RiskLevel = 'low' | 'medium' | 'high'
export type EffortLevel = 'low' | 'medium' | 'high'