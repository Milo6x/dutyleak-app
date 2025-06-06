// Enhanced Scenario Service
// Comprehensive service for managing scenarios, comparisons, and optimization recommendations

import { createBrowserClient } from '../supabase'
import {
  ScenarioGroup,
  ScenarioTemplate,
  EnhancedScenario,
  ScenarioProduct,
  ScenarioComparison,
  OptimizationRecommendation,
  CreateScenarioRequest,
  UpdateScenarioRequest,
  RunScenarioAnalysisRequest,
  CreateComparisonRequest,
  ScenarioAnalysisResponse,
  ComparisonAnalysisResponse,
  ScenarioConfiguration,
  ScenarioResults,
  ProductScenarioResults,
  ComparisonResults
} from '../../types/scenario'
import { SavingsAnalysisEngine } from '../duty/savings-analysis-engine'
import { OptimizationEngine } from '../duty/optimization-engine'

export class ScenarioService {
  private supabase = createBrowserClient()
  private savingsEngine = new SavingsAnalysisEngine()
  private optimizationEngine = new OptimizationEngine()

  // Scenario Group Management
  async createScenarioGroup(data: {
    workspace_id: string
    name: string
    description?: string
    metadata?: Record<string, any>
  }): Promise<ScenarioGroup> {
    // Note: scenario_groups table not implemented in current schema
    // Using duty_scenarios as fallback
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: group, error } = await this.supabase
      .from('duty_scenarios')
      .insert({
        workspace_id: data.workspace_id,
        name: data.name,
        description: data.description,
        status: 'draft',
        parameters: data.metadata as any
      })
      .select()
      .single()

    if (error) {
      throw error
    }
    return group as any
  }

  async getScenarioGroups(workspace_id: string): Promise<ScenarioGroup[]> {
    // Note: scenario_groups table not implemented in current schema
    // Using duty_scenarios as fallback
    const { data, error } = await this.supabase
      .from('duty_scenarios')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }
    return (data || []) as any
  }

  async updateScenarioGroup(
    id: string,
    updates: Partial<Pick<ScenarioGroup, 'name' | 'description' | 'metadata'>>
  ): Promise<ScenarioGroup> {
    // Note: scenario_groups table not implemented in current schema
    // Using duty_scenarios as fallback
    const { data, error } = await this.supabase
      .from('duty_scenarios')
      .update({ 
        name: updates.name,
        description: updates.description,
        parameters: updates.metadata as any,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }
    return data as any
  }

  async deleteScenarioGroup(id: string): Promise<void> {
    // Note: scenario_groups table not implemented in current schema
    // Using duty_scenarios as fallback
    const { error } = await this.supabase
      .from('duty_scenarios')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }
  }

  // Scenario Template Management
  async createScenarioTemplate(data: {
    workspace_id: string
    name: string
    description?: string
    category: ScenarioTemplate['category']
    configuration: ScenarioConfiguration
    is_public?: boolean
  }): Promise<ScenarioTemplate> {
    // Note: scenario_templates table not implemented in current schema
    // Using duty_scenarios as fallback
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: template, error } = await this.supabase
      .from('duty_scenarios')
      .insert({
        workspace_id: data.workspace_id,
        name: data.name,
        description: data.description,
        status: 'draft',
        parameters: data.configuration as any
      })
      .select()
      .single()

    if (error) {
      throw error
    }
    return template as any
  }

  async getScenarioTemplates(
    workspace_id: string,
    _include_public = true
  ): Promise<ScenarioTemplate[]> {
    // Note: scenario_templates table not implemented in current schema
    // Using duty_scenarios as fallback
    const { data, error } = await this.supabase
      .from('duty_scenarios')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }
    return (data || []) as any
  }

  async updateScenarioTemplate(
    id: string,
    updates: Partial<Pick<ScenarioTemplate, 'name' | 'description' | 'configuration' | 'is_public'>>
  ): Promise<ScenarioTemplate> {
    // Note: scenario_templates table not implemented in current schema
    // Using duty_scenarios as fallback
    const { data, error } = await this.supabase
      .from('duty_scenarios')
      .update({ 
        name: updates.name,
        description: updates.description,
        parameters: updates.configuration as any,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }
    return data as any
  }

  async deleteScenarioTemplate(id: string): Promise<void> {
    // Note: scenario_templates table not implemented in current schema
    // Using duty_scenarios as fallback
    const { error } = await this.supabase
      .from('duty_scenarios')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }
  }

  // Enhanced Scenario Management
  async createScenario(request: CreateScenarioRequest): Promise<any> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: scenario, error } = await this.supabase
      .from('duty_scenarios')
      .insert({
        workspace_id: request.workspace_id,
        name: request.name,
        description: request.description || '',
        status: 'draft',
        parameters: (request.configuration || {}) as any
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return scenario
  }

  async getScenarios(
    workspace_id: string,
    filters?: {
      status?: string
    }
  ): Promise<any[]> {
    let query = this.supabase
      .from('duty_scenarios')
      .select('*')
      .eq('workspace_id', workspace_id)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw error
    }
    return data || []
  }

  async getScenario(id: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('duty_scenarios')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }
    return data
  }

  async updateScenario(id: string, updates: UpdateScenarioRequest): Promise<any> {
    const { data, error } = await this.supabase
      .from('duty_scenarios')
      .update({
        name: updates.name,
        description: updates.description,
        status: updates.status,
        parameters: updates.configuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }
    return data
  }

  async deleteScenario(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('duty_scenarios')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }
  }

  // Scenario Analysis
  async runScenarioAnalysis(request: RunScenarioAnalysisRequest): Promise<ScenarioAnalysisResponse> {
    const scenario = await this.getScenario(request.scenario_id)
    if (!scenario) {
      throw new Error('Scenario not found')
    }

    // Get scenario products
    const { data: scenarioProducts, error: productsError } = await this.supabase
      .from('scenario_products')
      .select(`
        *,
        product:products(
          id,
          name,
          hs_code,
          value,
          origin_country,
          weight,
          dimensions
        )
      `)
      .eq('scenario_id', request.scenario_id)

    if (productsError) {
      throw productsError
    }

    // Run analysis using the savings analysis engine
    const analysisResults = await this.savingsEngine.analyzeBatch(
      (scenarioProducts as any[]).map(sp => sp.product),
      scenario.configuration
    )

    // Convert results to our format
    const scenarioResults: ScenarioResults = {
      summary: {
        total_products: analysisResults.totalProducts,
        total_current_cost: analysisResults.totalCurrentCost,
        total_optimized_cost: analysisResults.totalOptimizedCost,
        total_savings: analysisResults.totalSavings,
        total_savings_percentage: analysisResults.totalSavingsPercentage,
        average_roi: analysisResults.averageROI,
        execution_time_ms: Date.now(),
        last_updated: new Date().toISOString()
      },
      breakdown: {
        duty_savings: analysisResults.scenarios.reduce((sum, s) => sum + s.savingsBreakdown.dutyReduction, 0),
        vat_savings: analysisResults.scenarios.reduce((sum, s) => sum + s.savingsBreakdown.vatReduction, 0),
        shipping_savings: analysisResults.scenarios.reduce((sum, s) => sum + s.savingsBreakdown.shippingReduction, 0),
        fba_savings: analysisResults.scenarios.reduce((sum, s) => sum + s.savingsBreakdown.fbaReduction, 0),
        other_savings: 0
      },
      recommendations: [],
      risk_assessment: {
        compliance_risk: 'medium',
        supplier_risk: 'low',
        market_risk: 'medium',
        operational_risk: 'low',
        overall_risk: 'medium',
        mitigation_strategies: [],
        risk_factors: []
      },
      implementation_timeline: {
        phases: [],
        total_duration_weeks: 12,
        critical_path: [],
        milestones: []
      },
      metadata: {}
    }

    // Update scenario with results
    await this.updateScenario(request.scenario_id, {
      status: 'completed',
      configuration: {
        ...scenario.configuration,
        last_analysis: new Date().toISOString()
      }
    })

    // Update scenario results in database
    const { error: updateError } = await this.supabase
      .from('enhanced_scenarios')
      .update({
        results: scenarioResults as any,
        completed_at: new Date().toISOString()
      })
      .eq('id', request.scenario_id)

    if (updateError) {
      throw updateError
    }

    // Generate recommendations if requested
    let recommendations: OptimizationRecommendation[] = []
    if (request.include_recommendations) {
      recommendations = await this.generateOptimizationRecommendations(
        request.scenario_id,
        analysisResults
      )
    }

    return {
      scenario: { ...scenario, results: scenarioResults },
      results: scenarioResults,
      products: scenarioProducts as any,
      recommendations
    }
  }

  // Scenario Comparison
  async createComparison(request: CreateComparisonRequest): Promise<ScenarioComparison> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get workspace_id from the first scenario
    const { data: scenario } = await this.supabase
      .from('enhanced_scenarios')
      .select('workspace_id')
      .eq('id', request.scenario_ids[0])
      .single()

    if (!scenario) {
      throw new Error('Scenario not found')
    }

    const { data: comparison, error } = await this.supabase
      .from('scenario_comparisons')
      .insert({
        workspace_id: scenario.workspace_id,
        name: request.name,
        description: request.description,
        scenario_ids: request.scenario_ids,
        comparison_type: request.comparison_type,
        results: {},
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      throw error
    }
    return {
      ...comparison,
      comparison_type: 'side_by_side' as const,
      created_by: '',
      description: '',
      results: comparison.results as unknown as ComparisonResults
    }
  }

  async runComparisonAnalysis(comparison_id: string): Promise<ComparisonAnalysisResponse> {
    const { data: comparison, error } = await this.supabase
      .from('scenario_comparisons')
      .select('*')
      .eq('id', comparison_id)
      .single()

    if (error) {
      throw error
    }

    // Cast comparison to include missing properties
    const typedComparison = {
      ...comparison,
      comparison_type: 'side_by_side' as const,
      created_by: '',
      description: '',
      results: comparison.results as unknown as ComparisonResults
    }

    // Get all scenarios
    const { data: scenarios, error: scenariosError } = await this.supabase
      .from('enhanced_scenarios')
      .select('*')
      .in('id', comparison.scenario_ids)

    if (scenariosError) {
      throw scenariosError
    }

    // Generate comparison results
    const comparisonResults: ComparisonResults = {
      scenarios: scenarios.map(scenario => ({
        scenario_id: scenario.id,
        scenario_name: scenario.name,
        total_cost: (scenario.results as any)?.summary?.total_optimized_cost || 0,
        total_savings: (scenario.results as any)?.summary?.total_savings || 0,
        savings_percentage: (scenario.results as any)?.summary?.total_savings_percentage || 0,
        risk_score: this.calculateRiskScore((scenario.results as any)?.risk_assessment),
        implementation_complexity: 'medium',
        timeline_weeks: (scenario.results as any)?.implementation_timeline?.total_duration_weeks || 12,
        confidence_score: 0.8
      })),
      summary: {
        best_scenario_id: scenarios[0]?.id || '',
        worst_scenario_id: scenarios[scenarios.length - 1]?.id || '',
        average_savings: 0,
        total_variance: 0
      },
      metrics: [],
      charts_data: [],
      recommendations: [],
      generated_at: new Date().toISOString()
    }

    // Update comparison with results
    const { error: updateError } = await this.supabase
      .from('scenario_comparisons')
      .update({ results: comparisonResults as any })
      .eq('id', comparison_id)

    if (updateError) {
      throw updateError
    }

    return {
      comparison: { 
        ...typedComparison, 
        results: comparisonResults
      },
      scenarios: scenarios.map((scenario: any) => ({
        id: scenario.id,
        workspace_id: scenario.workspace_id,
        name: scenario.name,
        description: scenario.description,
        scenario_type: scenario.scenario_type || 'optimization',
        status: scenario.status || 'active',
        configuration: scenario.configuration || {},
        created_by: scenario.created_by || '',
        created_at: scenario.created_at,
        updated_at: scenario.updated_at,
        scenario_ids: scenario.scenario_ids || [],
        results: scenario.results || {}
      })),
      results: comparisonResults
    }
  }

  // Optimization Recommendations
  async generateOptimizationRecommendations(
    scenario_id: string,
    analysisResults: any
  ): Promise<OptimizationRecommendation[]> {
    const scenario = await this.getScenario(scenario_id)
    if (!scenario) {
      throw new Error('Scenario not found')
    }

    const recommendations: Omit<OptimizationRecommendation, 'id' | 'created_at' | 'updated_at'>[] = []

    // Generate recommendations based on analysis results
    for (const scenarioResult of analysisResults.scenarios) {
      if (scenarioResult.savingsBreakdown.totalSavingsPerUnit > 100) {
        recommendations.push({
          workspace_id: scenario.workspace_id,
          scenario_id,
          product_id: scenarioResult.productId,
          recommendation_type: 'classification',
          title: 'Optimize HS Code Classification',
          description: `Consider reclassifying this product to reduce duty costs by $${scenarioResult.savingsBreakdown.totalSavingsPerUnit.toFixed(2)} per unit`,
          impact_analysis: {
            financial_impact: {
              savings_per_unit: scenarioResult.savingsBreakdown.totalSavingsPerUnit,
              annual_savings: scenarioResult.savingsBreakdown.annualSavings,
              implementation_cost: 500,
              roi: scenarioResult.savingsBreakdown.roi,
              payback_period_months: 2
            },
            operational_impact: {
              complexity: 'medium',
              resource_requirements: ['Legal review', 'Documentation update'],
              timeline_weeks: 4,
              dependencies: ['Classification expert consultation']
            },
            risk_impact: {
              compliance_risk: 'medium',
              business_risk: 'low',
              mitigation_required: true
            }
          },
          implementation_requirements: {
            documentation: {
              required: true,
              documents: ['Product specification', 'Technical documentation'],
              estimated_hours: 8
            },
            certifications: {
              required: false,
              certifications: [],
              estimated_cost: 0,
              timeline_weeks: 0
            },
            supplier_changes: {
              required: false,
              changes: [],
              risk_level: 'low'
            },
            process_changes: {
              required: true,
              processes: ['Import documentation'],
              training_required: false
            },
            legal_review: {
              required: true,
              scope: ['Classification compliance'],
              estimated_cost: 1000
            }
          },
          confidence_score: scenarioResult.confidence,
          priority: scenarioResult.savingsBreakdown.totalSavingsPerUnit > 500 ? 'high' : 'medium',
          status: 'pending'
        })
      }
    }

    // Insert recommendations into database
    if (recommendations.length > 0) {
      const { data, error } = await this.supabase
        .from('duty_scenarios')
        .insert(recommendations.map(rec => ({
          workspace_id: rec.workspace_id,
          name: rec.title,
          description: rec.description,
          parameters: rec.implementation_requirements as any,
          status: rec.status,
          potential_savings: 0,
          total_products: 1
        })))
        .select()

      if (error) {
      throw error
    }
      
      // Map duty_scenarios back to OptimizationRecommendation format
      return data?.map((item: any) => ({
        id: item.id,
        workspace_id: item.workspace_id,
        scenario_id: scenario_id,
        product_id: recommendations[0]?.product_id || '',
        recommendation_type: 'classification',
        title: item.name,
        description: item.description,
        impact_analysis: {
          financial_impact: {
            savings_per_unit: 0,
            annual_savings: 0,
            implementation_cost: 0,
            roi: 0,
            payback_period_months: 0
          },
          operational_impact: {
            complexity: 'low' as const,
            resource_requirements: [],
            timeline_weeks: 0,
            dependencies: []
          },
          risk_impact: {
            compliance_risk: 'low' as const,
            business_risk: 'low' as const,
            mitigation_required: false
          }
        },
        implementation_requirements: item.parameters,
        confidence_score: recommendations[0]?.confidence_score || 0.8,
        priority: recommendations[0]?.priority || 'medium',
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at
      })) || []
    }

    return []
  }

  async getOptimizationRecommendations(
    workspace_id: string,
    filters?: {
      scenario_id?: string
      product_id?: string
      recommendation_type?: OptimizationRecommendation['recommendation_type']
      status?: OptimizationRecommendation['status']
      priority?: OptimizationRecommendation['priority']
    }
  ): Promise<OptimizationRecommendation[]> {
    // Note: optimization_recommendations table not implemented in current schema
    // Using duty_scenarios as fallback
    let query = this.supabase
      .from('duty_scenarios')
      .select('*')
      .eq('workspace_id', workspace_id)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }
    
    // Map duty_scenarios to OptimizationRecommendation format
    return (data || []).map(scenario => ({
      id: scenario.id,
      workspace_id: scenario.workspace_id,
      recommendation_type: 'classification' as const,
      title: scenario.name,
      description: scenario.description,
      impact_analysis: {
        financial_impact: {
          savings_per_unit: 0,
          annual_savings: 0,
          implementation_cost: 0,
          roi: 0,
          payback_period_months: 0
        },
        operational_impact: {
          complexity: 'low' as const,
          resource_requirements: [],
          timeline_weeks: 0,
          dependencies: []
        },
        risk_impact: {
          compliance_risk: 'low' as const,
          business_risk: 'low' as const,
          mitigation_required: false
        }
      },
      implementation_requirements: {} as any,
      confidence_score: 0.8,
      priority: 'medium' as const,
      status: scenario.status as any,
      created_at: scenario.created_at,
      updated_at: scenario.updated_at
    }))
  }

  async updateRecommendationStatus(
    id: string,
    status: OptimizationRecommendation['status']
  ): Promise<OptimizationRecommendation> {
    // Note: optimization_recommendations table not implemented in current schema
    // Using duty_scenarios as fallback
    const { data, error } = await this.supabase
      .from('duty_scenarios')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }
    
    // Map duty_scenario to OptimizationRecommendation format
    return {
      id: data.id,
      workspace_id: data.workspace_id,
      recommendation_type: 'classification' as const,
      title: data.name,
      description: data.description,
      impact_analysis: {
        financial_impact: {
          savings_per_unit: 0,
          annual_savings: 0,
          implementation_cost: 0,
          roi: 0,
          payback_period_months: 0
        },
        operational_impact: {
          complexity: 'low' as const,
          resource_requirements: [],
          timeline_weeks: 0,
          dependencies: []
        },
        risk_impact: {
          compliance_risk: 'low' as const,
          business_risk: 'low' as const,
          mitigation_required: false
        }
      },
      implementation_requirements: {} as any,
      confidence_score: 0.8,
      priority: 'medium' as const,
      status: data.status as any,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  // Utility Methods
  private calculateRiskScore(riskAssessment?: any): number {
    if (!riskAssessment) {
      return 0.5
    }

    const riskLevels = {
      low: 0.2,
      medium: 0.5,
      high: 0.8
    }

    const overallRisk = riskAssessment.overall_risk || 'medium'
    return riskLevels[overallRisk as keyof typeof riskLevels] || 0.5
  }

  // Bulk Operations
  async duplicateScenario(scenario_id: string, new_name: string): Promise<EnhancedScenario> {
    const scenario = await this.getScenario(scenario_id)
    if (!scenario) {
      throw new Error('Scenario not found')
    }

    // Get scenario products
    const { data: scenarioProducts } = await this.supabase
      .from('scenario_products')
      .select('product_id')
      .eq('scenario_id', scenario_id)

    // Create new scenario
    const newScenario = await this.createScenario({
      name: new_name,
      description: `Copy of ${scenario.name}`,
      scenario_type: scenario.scenario_type,
      group_id: scenario.group_id,
      template_id: scenario.template_id,
      configuration: scenario.configuration,
      product_ids: (scenarioProducts || []).map(sp => sp.product_id as string),
      workspace_id: scenario.workspace_id
    })

    return newScenario
  }

  async archiveScenario(scenario_id: string): Promise<EnhancedScenario> {
    return this.updateScenario(scenario_id, { status: 'archived' })
  }

  async restoreScenario(scenario_id: string): Promise<EnhancedScenario> {
    return this.updateScenario(scenario_id, { status: 'active' })
  }
}

// Export singleton instance
export const scenarioService = new ScenarioService()