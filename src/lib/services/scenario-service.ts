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
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: group, error } = await this.supabase
      .from('scenario_groups')
      .insert({
        workspace_id: data.workspace_id,
        name: data.name,
        description: data.description,
        metadata: data.metadata || {},
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating scenario group:", error)
      throw error
    }
    return group as ScenarioGroup
  }

  async getScenarioGroups(workspace_id: string): Promise<ScenarioGroup[]> {
    const { data, error } = await this.supabase
      .from('scenario_groups')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Error fetching scenario groups:", error)
      throw error
    }
    return (data || []) as ScenarioGroup[]
  }

  async updateScenarioGroup(
    id: string,
    updates: Partial<Pick<ScenarioGroup, 'name' | 'description' | 'metadata'>>
  ): Promise<ScenarioGroup> {
    const { data, error } = await this.supabase
      .from('scenario_groups')
      .update({ 
        name: updates.name,
        description: updates.description,
        metadata: updates.metadata,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error("Error updating scenario group:", error)
      throw error
    }
    return data as ScenarioGroup
  }

  async deleteScenarioGroup(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('scenario_groups')
      .delete()
      .eq('id', id)

    if (error) {
      console.error("Error deleting scenario group:", error)
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
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: template, error } = await this.supabase
      .from('scenario_templates')
      .insert({
        workspace_id: data.workspace_id,
        name: data.name,
        description: data.description,
        category: data.category,
        configuration: data.configuration,
        is_public: data.is_public ?? false,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating scenario template:", error)
      throw error
    }
    return template as ScenarioTemplate
  }

  async getScenarioTemplates(
    workspace_id: string,
    include_public = true
  ): Promise<ScenarioTemplate[]> {
    let query = this.supabase
      .from('scenario_templates')
      .select('*')
      .eq('workspace_id', workspace_id)

    if (include_public) {
      query = query.or(`workspace_id.eq.${workspace_id},is_public.eq.true`)
    }
      
    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error("Error fetching scenario templates:", error)
      throw error
    }
    return (data || []) as ScenarioTemplate[]
  }

  async updateScenarioTemplate(
    id: string,
    updates: Partial<Pick<ScenarioTemplate, 'name' | 'description' | 'configuration' | 'is_public'>>
  ): Promise<ScenarioTemplate> {
    const { data, error } = await this.supabase
      .from('scenario_templates')
      .update({ 
        name: updates.name,
        description: updates.description,
        configuration: updates.configuration,
        is_public: updates.is_public,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error("Error updating scenario template:", error)
      throw error
    }
    return data as ScenarioTemplate
  }

  async deleteScenarioTemplate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('scenario_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error("Error deleting scenario template:", error)
      throw error
    }
  }

  // Enhanced Scenario Management
  async createScenario(request: CreateScenarioRequest): Promise<EnhancedScenario> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: scenario, error } = await this.supabase
      .from('enhanced_scenarios') // Changed table name
      .insert({
        workspace_id: request.workspace_id,
        name: request.name,
        description: request.description || '',
        scenario_type: request.scenario_type,
        status: 'draft',
        group_id: request.group_id,
        template_id: request.template_id,
        configuration: request.configuration,
        results: {} as ScenarioResults, // Initialize with empty results
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating enhanced scenario:", error)
      throw error
    }
    // TODO: Handle scenario_products insertion if product_ids are provided

    return scenario as EnhancedScenario
  }

  async getScenarios(
    workspace_id: string,
    filters?: {
      status?: string
      group_id?: string
      scenario_type?: string
    }
  ): Promise<EnhancedScenario[]> {
    let query = this.supabase
      .from('enhanced_scenarios') // Changed table name
      .select('*')
      .eq('workspace_id', workspace_id)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.group_id) {
      query = query.eq('group_id', filters.group_id)
    }
    if (filters?.scenario_type) {
      query = query.eq('scenario_type', filters.scenario_type)
    }


    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error("Error fetching enhanced scenarios:", error)
      throw error
    }
    return (data || []) as EnhancedScenario[]
  }

  async getScenario(id: string): Promise<EnhancedScenario | null> {
    const { data, error } = await this.supabase
      .from('enhanced_scenarios') // Changed table name
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Resource not found
        return null
      }
      console.error(`Error fetching enhanced scenario ${id}:`, error)
      throw error
    }
    return data as EnhancedScenario
  }

  async updateScenario(id: string, updates: UpdateScenarioRequest): Promise<EnhancedScenario> {
    const { data, error } = await this.supabase
      .from('enhanced_scenarios') // Changed table name
      .update({
        name: updates.name,
        description: updates.description,
        status: updates.status,
        configuration: updates.configuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error(`Error updating enhanced scenario ${id}:`, error)
      throw error
    }
    return data as EnhancedScenario
  }

  async deleteScenario(id: string): Promise<void> {
    // Also delete related scenario_products
    await this.supabase.from('scenario_products').delete().eq('scenario_id', id);
    
    const { error } = await this.supabase
      .from('enhanced_scenarios') // Changed table name
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`Error deleting enhanced scenario ${id}:`, error)
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
      .from('enhanced_scenarios') // Ensure this table exists
      .update({
        results: scenarioResults, // No 'as any' if types match
        status: 'completed', // Update status as well
        completed_at: new Date().toISOString()
      })
      .eq('id', request.scenario_id)

    if (updateError) {
      console.error(`Error updating enhanced_scenario ${request.scenario_id} with results:`, updateError);
      // Decide if this should throw or just log
      // throw updateError; 
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
    const { data: firstScenarioData } = await this.supabase
      .from('enhanced_scenarios') // Changed table name
      .select('workspace_id')
      .in('id', request.scenario_ids) // Check first ID from the array
      .limit(1)
      .single()

    if (!firstScenarioData) {
      throw new Error('One or more scenarios not found for comparison')
    }

    const { data: comparison, error } = await this.supabase
      .from('scenario_comparisons') // Ensure this table exists
      .insert({
        workspace_id: firstScenarioData.workspace_id,
        name: request.name,
        description: request.description,
        scenario_ids: request.scenario_ids,
        comparison_type: request.comparison_type,
        results: {} as ComparisonResults, // Initialize with empty results
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating scenario comparison:", error)
      throw error
    }
    return comparison as ScenarioComparison // Cast to defined type
  }

  async runComparisonAnalysis(comparison_id: string): Promise<ComparisonAnalysisResponse> {
    const { data: comparisonData, error: comparisonError } = await this.supabase
      .from('scenario_comparisons') // Ensure this table exists
      .select('*')
      .eq('id', comparison_id)
      .single()

    if (comparisonError) {
      console.error(`Error fetching scenario comparison ${comparison_id}:`, comparisonError)
      throw comparisonError
    }
    const comparison = comparisonData as ScenarioComparison;


    // Get all scenarios involved in the comparison
    const { data: scenariosData, error: scenariosError } = await this.supabase
      .from('enhanced_scenarios') // Changed table name
      .select('*')
      .in('id', comparison.scenario_ids)

    if (scenariosError) {
      console.error(`Error fetching scenarios for comparison ${comparison_id}:`, scenariosError)
      throw scenariosError
    }
    const scenarios = (scenariosData || []) as EnhancedScenario[];

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
      .from('scenario_comparisons') // Ensure this table exists
      .update({ results: comparisonResults })
      .eq('id', comparison_id)

    if (updateError) {
      console.error(`Error updating scenario comparison ${comparison_id} with results:`, updateError)
      // Decide if this should throw or just log
    }

    return {
      comparison: { 
        ...comparison, 
        results: comparisonResults
      },
      scenarios,
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
      const { data: insertedRecs, error } = await this.supabase
        .from('optimization_recommendations') // Changed table name
        .insert(recommendations.map(rec => ({
          // Map rec fields to optimization_recommendations table columns
          workspace_id: rec.workspace_id,
          scenario_id: rec.scenario_id,
          product_id: rec.product_id,
          recommendation_type: rec.type,
          title: rec.title,
          description: rec.description,
          impact_analysis: rec.impact_analysis,
          implementation_requirements: rec.implementation_requirements,
          confidence_score: rec.confidence_score,
          priority: rec.priority,
          status: rec.status,
        })))
        .select();

      if (error) {
        console.error("Error storing optimization recommendations:", error)
        throw error;
      }
      return (insertedRecs || []) as OptimizationRecommendation[];
    }
    return [];
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
    let query = this.supabase
      .from('optimization_recommendations') // Changed table name
      .select('*')
      .eq('workspace_id', workspace_id)

    if (filters?.scenario_id) query = query.eq('scenario_id', filters.scenario_id);
    if (filters?.product_id) query = query.eq('product_id', filters.product_id);
    if (filters?.recommendation_type) query = query.eq('recommendation_type', filters.recommendation_type);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.priority) query = query.eq('priority', filters.priority);
    
    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error("Error fetching optimization recommendations:", error)
      throw error
    }
    return (data || []) as OptimizationRecommendation[]
  }

  async updateRecommendationStatus(
    id: string,
    status: OptimizationRecommendation['status']
  ): Promise<OptimizationRecommendation> {
    const { data, error } = await this.supabase
      .from('optimization_recommendations') // Changed table name
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error(`Error updating recommendation ${id} status:`, error)
      throw error
    }
    return data as OptimizationRecommendation
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
