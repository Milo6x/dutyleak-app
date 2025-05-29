export interface OptimizationEngineOptions {
  confidenceThreshold?: number;
  minPotentialSaving?: number;
}

export interface OptimizationRecommendation {
  productId: string;
  currentClassificationId: string;
  recommendedClassificationId: string;
  confidenceScore: number;
  potentialSaving: number;
  justification: string;
}

export class OptimizationEngine {
  private options: OptimizationEngineOptions;

  constructor(options: OptimizationEngineOptions = {}) {
    this.options = {
      confidenceThreshold: options.confidenceThreshold || 0.7,
      minPotentialSaving: options.minPotentialSaving || 10 // Minimum $10 saving to recommend
    };
  }

  /**
   * Generate optimization recommendations for a list of products
   * @param productIds - List of product IDs to analyze
   * @param supabase - Supabase client
   * @param workspaceId - Workspace ID
   * @returns List of optimization recommendations
   */
  async generateRecommendations(
    productIds: string[],
    supabase: any,
    workspaceId: string
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Process each product
    for (const productId of productIds) {
      try {
        // Get product details
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, active_classification_id, yearly_units')
          .eq('id', productId)
          .eq('workspace_id', workspaceId)
          .single();
          
        if (productError || !product || !product.active_classification_id) {
          console.warn(`Skipping product ${productId}: ${productError?.message || 'No active classification'}`);
          continue;
        }
        
        // Get current classification
        const { data: currentClassification, error: classError } = await supabase
          .from('classifications')
          .select('id, hs6, hs8')
          .eq('id', product.active_classification_id)
          .single();
          
        if (classError || !currentClassification) {
          console.warn(`Skipping product ${productId}: ${classError?.message || 'Classification not found'}`);
          continue;
        }
        
        // Find alternative classifications with lower duty rates
        const alternatives = await this.findAlternativeClassifications(
          currentClassification,
          productId,
          supabase
        );
        
        // If alternatives found, create recommendations
        for (const alt of alternatives) {
          // Skip if confidence is below threshold
          if (alt.confidenceScore < this.options.confidenceThreshold) {
            continue;
          }
          
          // Skip if potential saving is below threshold
          if (alt.potentialSaving < this.options.minPotentialSaving) {
            continue;
          }
          
          // Create recommendation
          recommendations.push({
            productId,
            currentClassificationId: currentClassification.id,
            recommendedClassificationId: alt.classificationId,
            confidenceScore: alt.confidenceScore,
            potentialSaving: alt.potentialSaving,
            justification: alt.justification
          });
          
          // Only keep the best recommendation per product
          break;
        }
      } catch (error) {
        console.error(`Error processing product ${productId}:`, error);
        // Continue with next product
      }
    }
    
    return recommendations;
  }
  
  /**
   * Find alternative classifications with lower duty rates
   * @param currentClassification - Current classification
   * @param productId - Product ID
   * @param supabase - Supabase client
   * @returns List of alternative classifications with potential savings
   */
  private async findAlternativeClassifications(
    currentClassification: { id: string, hs6: string, hs8?: string },
    productId: string,
    supabase: any
  ): Promise<Array<{
    classificationId: string,
    hsCode: string,
    confidenceScore: number,
    potentialSaving: number,
    justification: string
  }>> {
    // Get all classifications for this product
    const { data: classifications, error: classError } = await supabase
      .from('classifications')
      .select('id, hs6, hs8, confidence_score, source')
      .eq('product_id', productId)
      .neq('id', currentClassification.id) // Exclude current classification
      .order('confidence_score', { ascending: false });
      
    if (classError || !classifications || classifications.length === 0) {
      return [];
    }
    
    const result = [];
    
    // Get product details for savings calculation
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('yearly_units')
      .eq('id', productId)
      .single();
      
    const yearlyUnits = product?.yearly_units || 1;
    
    // Process each alternative classification
    for (const alt of classifications) {
      try {
        // Create a scenario engine to compare classifications
        const scenarioEngine = new ScenarioEngine();
        
        // Compare with a standard product value for consistency
        const comparison = await scenarioEngine.compareClassifications({
          baseClassificationId: currentClassification.id,
          alternativeClassificationId: alt.id,
          destinationCountry: 'US', // Default to US for comparison
          productValue: 100, // Standard value for comparison
          yearlyUnits
        }, supabase);
        
        // If alternative has lower duty, add to results
        if (comparison.potentialSaving > 0) {
          result.push({
            classificationId: alt.id,
            hsCode: alt.hs8 || alt.hs6,
            confidenceScore: alt.confidence_score || 0,
            potentialSaving: comparison.potentialYearlySaving,
            justification: this.generateJustification(
              currentClassification,
              alt,
              comparison
            )
          });
        }
      } catch (error) {
        console.error(`Error comparing classification ${alt.id}:`, error);
        // Continue with next classification
      }
    }
    
    // Sort by potential saving (highest first)
    return result.sort((a, b) => b.potentialSaving - a.potentialSaving);
  }
  
  /**
   * Generate justification text for a recommendation
   */
  private generateJustification(
    current: { hs6: string, hs8?: string },
    alternative: { hs6: string, hs8?: string, source: string },
    comparison: any
  ): string {
    const currentHs = current.hs8 || current.hs6;
    const alternativeHs = alternative.hs8 || alternative.hs6;
    
    return `Reclassifying from ${currentHs} to ${alternativeHs} could reduce duty rate from ${comparison.baseBreakdown.dutyPercentage}% to ${comparison.alternativeBreakdown.dutyPercentage}%, saving approximately $${comparison.potentialYearlySaving.toFixed(2)} annually based on your current volume. This alternative classification was identified via ${alternative.source}.`;
  }
  
  /**
   * Store recommendations in the database
   * @param recommendations - List of optimization recommendations
   * @param workspaceId - Workspace ID
   * @param supabase - Supabase client
   * @returns Number of recommendations stored
   */
  async storeRecommendations(
    recommendations: OptimizationRecommendation[],
    workspaceId: string,
    supabase: any
  ): Promise<number> {
    if (recommendations.length === 0) {
      return 0;
    }
    
    // Prepare data for insertion
    const data = recommendations.map(rec => ({
      workspace_id: workspaceId,
      product_id: rec.productId,
      current_classification_id: rec.currentClassificationId,
      recommended_classification_id: rec.recommendedClassificationId,
      confidence_score: rec.confidenceScore,
      potential_saving: rec.potentialSaving,
      justification: rec.justification,
      status: 'pending'
    }));
    
    // Insert recommendations
    const { data: inserted, error } = await supabase
      .from('optimization_recommendations')
      .insert(data)
      .select('id');
      
    if (error) {
      console.error('Failed to store recommendations:', error);
      throw new Error(`Failed to store recommendations: ${error.message}`);
    }
    
    return inserted.length;
  }
}

// Import ScenarioEngine at the top of the file
import { ScenarioEngine } from './scenario-engine';
