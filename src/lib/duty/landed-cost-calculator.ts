import { createDutyLeakServerClient } from '../supabase/server';
import { EnhancedDutyEngine, DutyCalculationRequest } from './enhanced-duty-engine';
import { FbaFeeCalculator } from '../amazon/fba-fee-calculator';
import { MultiCountryRuleManager } from './multi-country-rules';

export interface LandedCostRequest {
  productId: string;
  hsCode: string;
  productValue: number;
  quantity?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  originCountry: string;
  destinationCountry?: string;
  shippingMethod?: string;
  currency?: string;
  includeInsurance?: boolean;
  insuranceValue?: number;
  customsValue?: number;
}

export interface LandedCostCalculation {
  dutyRate: number;
  dutyAmount: number;
  taxRate: number;
  taxAmount: number;
  shippingCost: number;
  insuranceCost: number;
  brokerFees: number;
  otherFees: number;
  totalLandedCost: number;
  savingsAmount?: number;
  savingsPercentage?: number;
  confidenceScore: number;
  dataSource: string;
  fbaFeeAmount?: number;
  tradeAgreementApplied?: string;
  preferentialTreatment?: boolean;
  breakdown: {
    productValue: number;
    quantity: number;
    dutyableValue: number;
    dutyCalculation: {
      rate: number;
      amount: number;
      basis: string;
    };
    taxCalculation: {
      rate: number;
      amount: number;
      basis: string;
    };
    fees: {
      shipping: number;
      insurance: number;
      broker: number;
      other: number;
      fba: number;
    };
  };
}

export interface LandedCostResult {
  success: boolean;
  calculation?: LandedCostCalculation;
  error?: string;
}

export interface LandedCostCalculatorOptions {
  productValue: number;
  shippingCost: number;
  insuranceCost: number;
  dutyPercentage: number;
  vatPercentage: number;
  fbaFeeAmount?: number;
}

export interface BasicLandedCostResult {
  dutyAmount: number;
  vatAmount: number;
  fbaFeeAmount: number;
  totalLandedCost: number;
  effectiveDutyRate: number;
  breakdown: {
    productValue: number;
    shippingCost: number;
    insuranceCost: number;
    dutyableValue: number;
    dutyAmount: number;
    vatableValue: number;
    vatAmount: number;
    fbaFeeAmount: number;
  };
}

// Duty rates database (simplified - in production this would come from external APIs)
const DUTY_RATES: { [hsCode: string]: number } = {
  // Electronics
  '8517': 0.0,    // Phones
  '8471': 0.0,    // Computers
  '8528': 5.3,    // Monitors/TVs
  
  // Textiles
  '6109': 16.5,   // T-shirts
  '6203': 16.6,   // Men's suits
  '6204': 16.0,   // Women's suits
  
  // Toys
  '9503': 0.0,    // Toys
  
  // Default
  'default': 5.0
};

// Tax rates by country
const TAX_RATES: { [country: string]: number } = {
  'US': 0.0,      // No federal VAT
  'GB': 20.0,     // UK VAT
  'DE': 19.0,     // German VAT
  'FR': 20.0,     // French VAT
  'CA': 5.0,      // Canadian GST
  'default': 10.0
};

// Shipping cost estimates by method
const SHIPPING_COSTS: { [method: string]: { [weight: string]: number } } = {
  'standard': {
    'light': 15,    // < 1kg
    'medium': 25,   // 1-5kg
    'heavy': 45     // > 5kg
  },
  'express': {
    'light': 35,
    'medium': 55,
    'heavy': 85
  },
  'economy': {
    'light': 8,
    'medium': 15,
    'heavy': 25
  }
};

export class LandedCostCalculator {
  private options: LandedCostCalculatorOptions;

  constructor(options: LandedCostCalculatorOptions) {
    this.options = {
      productValue: options.productValue,
      shippingCost: options.shippingCost || 0,
      insuranceCost: options.insuranceCost || 0,
      dutyPercentage: options.dutyPercentage || 0,
      vatPercentage: options.vatPercentage || 0,
      fbaFeeAmount: options.fbaFeeAmount || 0
    };
  }

  /**
   * Calculate basic landed cost including duty, VAT/tax, and FBA fees
   * @returns Basic landed cost calculation result
   */
  calculate(): BasicLandedCostResult {
    const { productValue, shippingCost, insuranceCost, dutyPercentage, vatPercentage, fbaFeeAmount } = this.options;
    
    // Calculate dutyable value (CIF - Cost, Insurance, Freight)
    const dutyableValue = productValue + shippingCost + insuranceCost;
    
    // Calculate duty amount
    const dutyAmount = (dutyableValue * dutyPercentage) / 100;
    
    // Calculate vatable value (CIF + duty)
    const vatableValue = dutyableValue + dutyAmount;
    
    // Calculate VAT/tax amount
    const vatAmount = (vatableValue * vatPercentage) / 100;
    
    // Calculate total landed cost (including FBA fees)
    const totalLandedCost = dutyableValue + dutyAmount + vatAmount + (fbaFeeAmount || 0);
    
    // Calculate effective duty rate (as percentage of product value)
    const effectiveDutyRate = (dutyAmount / productValue) * 100;
    
    return {
      dutyAmount: parseFloat(dutyAmount.toFixed(2)),
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      fbaFeeAmount: parseFloat((fbaFeeAmount || 0).toFixed(2)),
      totalLandedCost: parseFloat(totalLandedCost.toFixed(2)),
      effectiveDutyRate: parseFloat(effectiveDutyRate.toFixed(2)),
      breakdown: {
        productValue,
        shippingCost,
        insuranceCost,
        dutyableValue: parseFloat(dutyableValue.toFixed(2)),
        dutyAmount: parseFloat(dutyAmount.toFixed(2)),
        vatableValue: parseFloat(vatableValue.toFixed(2)),
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        fbaFeeAmount: parseFloat((fbaFeeAmount || 0).toFixed(2))
      }
    };
  }

  /**
   * Advanced landed cost calculation with HS code lookup and comprehensive fees
   */
  static async calculateLandedCost(request: LandedCostRequest): Promise<LandedCostResult> {
    try {
      const {
        productId,
        hsCode,
        productValue,
        quantity = 1,
        weight = 1,
        dimensions,
        originCountry,
        destinationCountry = 'US',
        shippingMethod = 'standard',
        currency = 'USD',
        includeInsurance = false,
        insuranceValue,
        customsValue
      } = request;

      // Initialize MultiCountryRuleManager for enhanced duty calculations
      const ruleManager = new MultiCountryRuleManager();
      
      // Get enhanced duty and tax rates using MultiCountryRuleManager
      const dutyRuleResult = await ruleManager.getDutyRules({
        hsCode,
        destinationCountry,
        originCountry,
        productValue: productValue * quantity,
        effectiveDate: new Date().toISOString()
      });

      // Fallback to static rates if enhanced rules not available
      const hsPrefix = hsCode.substring(0, 4);
      const dutyRate = dutyRuleResult?.dutyRate ?? (DUTY_RATES[hsPrefix] || DUTY_RATES[hsCode] || DUTY_RATES['default']);
      const taxRate = dutyRuleResult?.taxRate ?? (TAX_RATES[destinationCountry] || TAX_RATES['default']);

      // Calculate shipping cost based on weight and method
      const weightCategory = weight < 1 ? 'light' : weight <= 5 ? 'medium' : 'heavy';
      const baseShippingCost = SHIPPING_COSTS[shippingMethod]?.[weightCategory] || SHIPPING_COSTS['standard'][weightCategory];
      const shippingCost = baseShippingCost * quantity;

      // Calculate insurance cost
      const insuranceCost = includeInsurance ? (insuranceValue || productValue) * 0.005 : 0;

      // Calculate FBA fees if dimensions are provided
      let fbaFeeAmount = 0;
      if (dimensions && dimensions.length > 0 && dimensions.width > 0 && dimensions.height > 0) {
        try {
          const fbaCalculator = new FbaFeeCalculator();
          const fbaResult = fbaCalculator.calculate({
            dimensions: {
              ...dimensions,
              unit: 'cm' as const
            },
            weight: {
              value: weight || 0,
              unit: 'kg' as const
            },
            category: 'general' // Default category
          });
          fbaFeeAmount = fbaResult.fbaFee || 0;
        } catch (error) {
          console.warn('FBA fee calculation failed:', error);
          // Continue without FBA fees
        }
      }

      // Calculate additional fees from MultiCountryRuleManager
      const additionalFees = dutyRuleResult?.additionalFees || [];
      let brokerFees = (productValue + shippingCost) * 0.03; // Default broker fee
      let otherFees = 25; // Base handling fee
      
      // Apply enhanced fees from rule manager
      additionalFees.forEach(fee => {
        if (fee.type === 'broker') {
          brokerFees = fee.amount;
        } else if (fee.type === 'mpf' || fee.type === 'hmf' || fee.type === 'customs') {
          otherFees += fee.amount;
        }
      });

      // Calculate dutyable value
      const dutyableValue = (customsValue || productValue) * quantity + shippingCost + insuranceCost;

      // Calculate duty amount
      const dutyAmount = (dutyableValue * dutyRate) / 100;

      // Calculate taxable value (dutyable value + duty)
      const taxableValue = dutyableValue + dutyAmount;

      // Calculate tax amount
      const taxAmount = (taxableValue * taxRate) / 100;

      // Calculate total landed cost (including FBA fees)
      const totalLandedCost = dutyableValue + dutyAmount + taxAmount + brokerFees + otherFees + fbaFeeAmount;

      // Calculate potential savings (simplified - would compare with current supplier)
      const currentCost = productValue * quantity * 1.3; // Assume 30% markup
      const savingsAmount = Math.max(0, currentCost - totalLandedCost);
      const savingsPercentage = currentCost > 0 ? (savingsAmount / currentCost) * 100 : 0;

      // Enhanced confidence score based on data availability and source
      let confidenceScore = dutyRuleResult?.confidence || 0.7; // Use rule manager confidence or base
      if (DUTY_RATES[hsCode]) {confidenceScore += 0.1;} // Exact HS code match in static data
      if (weight && weight > 0) {confidenceScore += 0.05;} // Weight provided
      if (dimensions && fbaFeeAmount > 0) {confidenceScore += 0.1;} // FBA calculation available
      if (dutyRuleResult?.preferentialTreatment) {confidenceScore += 0.05;} // Trade agreement benefits
      confidenceScore = Math.min(1.0, confidenceScore);
      
      // Determine data source
      const dataSource = dutyRuleResult?.source === 'database' ? 'Enhanced Multi-Country Database' : 
                        dutyRuleResult?.source === 'external_api' ? 'External Trade API' : 
                        'Internal Database';

      const calculation: LandedCostCalculation = {
        dutyRate,
        dutyAmount: parseFloat(dutyAmount.toFixed(2)),
        taxRate,
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        shippingCost: parseFloat(shippingCost.toFixed(2)),
        insuranceCost: parseFloat(insuranceCost.toFixed(2)),
        brokerFees: parseFloat(brokerFees.toFixed(2)),
        otherFees: parseFloat(otherFees.toFixed(2)),
        totalLandedCost: parseFloat(totalLandedCost.toFixed(2)),
        savingsAmount: parseFloat(savingsAmount.toFixed(2)),
        savingsPercentage: parseFloat(savingsPercentage.toFixed(2)),
        confidenceScore: parseFloat(confidenceScore.toFixed(2)),
        dataSource,
        fbaFeeAmount: parseFloat(fbaFeeAmount.toFixed(2)),
        tradeAgreementApplied: dutyRuleResult?.tradeAgreementApplied,
        preferentialTreatment: dutyRuleResult?.preferentialTreatment || false,
        breakdown: {
          productValue,
          quantity,
          dutyableValue: parseFloat(dutyableValue.toFixed(2)),
          dutyCalculation: {
            rate: dutyRate,
            amount: parseFloat(dutyAmount.toFixed(2)),
            basis: 'CIF Value'
          },
          taxCalculation: {
            rate: taxRate,
            amount: parseFloat(taxAmount.toFixed(2)),
            basis: 'CIF + Duty'
          },
          fees: {
            shipping: parseFloat(shippingCost.toFixed(2)),
            insurance: parseFloat(insuranceCost.toFixed(2)),
            broker: parseFloat(brokerFees.toFixed(2)),
            other: parseFloat(otherFees.toFixed(2)),
            fba: parseFloat(fbaFeeAmount.toFixed(2))
          }
        }
      };

      return {
        success: true,
        calculation
      };

    } catch (error) {
      console.error('Error calculating landed cost:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Export singleton instance
export const landedCostCalculator = new LandedCostCalculator({
  productValue: 0,
  shippingCost: 0,
  insuranceCost: 0,
  dutyPercentage: 0,
  vatPercentage: 0
});

// Note: Use LandedCostCalculator.calculateLandedCost for advanced calculations
// The instance is available for basic calculations only
