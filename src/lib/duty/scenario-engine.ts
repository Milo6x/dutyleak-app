export interface ScenarioEngineOptions {
  baseClassificationId: string;
  alternativeClassificationId: string;
  destinationCountry: string;
  productValue: number;
  shippingCost?: number;
  insuranceCost?: number;
  fbaFeeAmount?: number;
  yearlyUnits?: number;
}

export interface ScenarioResult {
  baseDutyAmount: number;
  alternativeDutyAmount: number;
  potentialSaving: number;
  potentialYearlySaving: number;
  baseBreakdown: {
    dutyPercentage: number;
    vatPercentage: number;
    dutyAmount: number;
    vatAmount: number;
    totalTaxes: number;
  };
  alternativeBreakdown: {
    dutyPercentage: number;
    vatPercentage: number;
    dutyAmount: number;
    vatAmount: number;
    totalTaxes: number;
  };
}

export class ScenarioEngine {
  /**
   * Compare duty rates and calculate potential savings between two classifications
   * @param options - Scenario options
   * @returns Scenario comparison result
   */
  async compareClassifications(options: ScenarioEngineOptions, supabase: any): Promise<ScenarioResult> {
    // Get base classification details
    const { data: baseClassification, error: baseError } = await supabase
      .from('classifications')
      .select('id, hs6, hs8')
      .eq('id', options.baseClassificationId)
      .single();
      
    if (baseError || !baseClassification) {
      throw new Error(`Base classification not found: ${baseError?.message || 'Unknown error'}`);
    }
    
    // Get alternative classification details
    const { data: altClassification, error: altError } = await supabase
      .from('classifications')
      .select('id, hs6, hs8')
      .eq('id', options.alternativeClassificationId)
      .single();
      
    if (altError || !altClassification) {
      throw new Error(`Alternative classification not found: ${altError?.message || 'Unknown error'}`);
    }
    
    // Get base duty rates
    const { data: baseDutyRates, error: baseDutyError } = await supabase
      .from('duty_rates')
      .select('duty_percentage, vat_percentage')
      .eq('classification_id', options.baseClassificationId)
      .eq('country_code', options.destinationCountry)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();
      
    if (baseDutyError || !baseDutyRates) {
      throw new Error(`Base duty rates not found: ${baseDutyError?.message || 'Unknown error'}`);
    }
    
    // Get alternative duty rates
    const { data: altDutyRates, error: altDutyError } = await supabase
      .from('duty_rates')
      .select('duty_percentage, vat_percentage')
      .eq('classification_id', options.alternativeClassificationId)
      .eq('country_code', options.destinationCountry)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();
      
    if (altDutyError || !altDutyRates) {
      throw new Error(`Alternative duty rates not found: ${altDutyError?.message || 'Unknown error'}`);
    }
    
    // Calculate dutyable value
    const dutyableValue = options.productValue + (options.shippingCost || 0) + (options.insuranceCost || 0);
    
    // Calculate base duty and VAT
    const baseDutyAmount = (dutyableValue * baseDutyRates.duty_percentage) / 100;
    const baseVatableValue = dutyableValue + baseDutyAmount;
    const baseVatAmount = (baseVatableValue * baseDutyRates.vat_percentage) / 100;
    const baseTotalTaxes = baseDutyAmount + baseVatAmount;
    
    // Calculate alternative duty and VAT
    const altDutyAmount = (dutyableValue * altDutyRates.duty_percentage) / 100;
    const altVatableValue = dutyableValue + altDutyAmount;
    const altVatAmount = (altVatableValue * altDutyRates.vat_percentage) / 100;
    const altTotalTaxes = altDutyAmount + altVatAmount;
    
    // Calculate savings
    const savingPerUnit = baseTotalTaxes - altTotalTaxes;
    const yearlySaving = options.yearlyUnits ? savingPerUnit * options.yearlyUnits : savingPerUnit;
    
    return {
      baseDutyAmount: parseFloat(baseDutyAmount.toFixed(2)),
      alternativeDutyAmount: parseFloat(altDutyAmount.toFixed(2)),
      potentialSaving: parseFloat(savingPerUnit.toFixed(2)),
      potentialYearlySaving: parseFloat(yearlySaving.toFixed(2)),
      baseBreakdown: {
        dutyPercentage: baseDutyRates.duty_percentage,
        vatPercentage: baseDutyRates.vat_percentage,
        dutyAmount: parseFloat(baseDutyAmount.toFixed(2)),
        vatAmount: parseFloat(baseVatAmount.toFixed(2)),
        totalTaxes: parseFloat(baseTotalTaxes.toFixed(2))
      },
      alternativeBreakdown: {
        dutyPercentage: altDutyRates.duty_percentage,
        vatPercentage: altDutyRates.vat_percentage,
        dutyAmount: parseFloat(altDutyAmount.toFixed(2)),
        vatAmount: parseFloat(altVatAmount.toFixed(2)),
        totalTaxes: parseFloat(altTotalTaxes.toFixed(2))
      }
    };
  }
  
  /**
   * Create a new scenario in the database
   * @param options - Scenario options
   * @param name - Scenario name
   * @param description - Scenario description
   * @param workspaceId - Workspace ID
   * @param supabase - Supabase client
   * @returns Created scenario ID
   */
  async createScenario(
    options: ScenarioEngineOptions,
    name: string,
    description: string,
    workspaceId: string,
    supabase: any
  ): Promise<string> {
    // Compare classifications to get duty amounts and savings
    const comparison = await this.compareClassifications(options, supabase);
    
    // Create scenario in database
    const { data: scenario, error } = await supabase
      .from('duty_scenarios')
      .insert({
        workspace_id: workspaceId,
        name,
        description,
        base_classification_id: options.baseClassificationId,
        alternative_classification_id: options.alternativeClassificationId,
        destination_country: options.destinationCountry,
        product_value: options.productValue,
        shipping_cost: options.shippingCost || 0,
        insurance_cost: options.insuranceCost || 0,
        fba_fee_amount: options.fbaFeeAmount || 0,
        yearly_units: options.yearlyUnits || 0,
        base_duty_amount: comparison.baseDutyAmount,
        alternative_duty_amount: comparison.alternativeDutyAmount,
        potential_saving: comparison.potentialYearlySaving,
        status: 'active'
      })
      .select('id')
      .single();
      
    if (error) {
      throw new Error(`Failed to create scenario: ${error.message}`);
    }
    
    return scenario.id;
  }
}
