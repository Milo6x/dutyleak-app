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
  currency?: string; // Original currency of productValue, etc.
  targetCurrency?: string; // Desired output currency
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
  currency: string; // Currency of the totalLandedCost and amounts
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

// Mock exchange rates relative to USD
const MOCK_EXCHANGE_RATES: { [currency: string]: number } = {
  'USD': 1.0,
  'EUR': 0.92, // 1 USD = 0.92 EUR
  'GBP': 0.79, // 1 USD = 0.79 GBP
  'CAD': 1.37, // 1 USD = 1.37 CAD
  'AUD': 1.50, // 1 USD = 1.50 AUD
  'JPY': 157.0, // 1 USD = 157 JPY
  'CNY': 7.25  // 1 USD = 7.25 CNY
};

function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;

  const rateFromUSD = MOCK_EXCHANGE_RATES[fromCurrency.toUpperCase()];
  const rateToUSD = MOCK_EXCHANGE_RATES[toCurrency.toUpperCase()];

  if (rateFromUSD === undefined || rateToUSD === undefined) {
    console.warn(`Currency conversion not supported for ${fromCurrency} to ${toCurrency}. Returning original amount.`);
    return amount; // Or throw error
  }

  // Convert amount to USD, then to target currency
  const amountInUSD = amount / rateFromUSD;
  return amountInUSD * rateToUSD;
}


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
        currency = 'USD', // Source currency of monetary inputs like productValue
        targetCurrency = 'USD', // Desired output currency
        includeInsurance = false,
        insuranceValue,
        customsValue
      } = request;

      // Convert monetary inputs to a base currency (USD for this example)
      const baseCurrency = 'USD';
      const productValueBase = convertCurrency(productValue, currency, baseCurrency);
      const insuranceValueBase = insuranceValue ? convertCurrency(insuranceValue, currency, baseCurrency) : productValueBase;
      const customsValueBase = customsValue ? convertCurrency(customsValue, currency, baseCurrency) : productValueBase;
      
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
      const shippingCost = baseShippingCost * quantity; // Assuming shipping costs are in baseCurrency or need conversion
      const shippingCostBase = convertCurrency(shippingCost, currency, baseCurrency); // Example if shipping was in source currency

      // Calculate insurance cost in base currency
      const insuranceCostBase = includeInsurance ? insuranceValueBase * 0.005 : 0;

      // Calculate FBA fees if dimensions are provided (assuming FBA fees are calculated/returned in baseCurrency)
      let fbaFeeAmountBase = 0;
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
          fbaFeeAmountBase = fbaResult.fbaFee || 0; // Assuming fbaResult.fbaFee is in baseCurrency
        } catch (error) {
          console.warn('FBA fee calculation failed:', error);
          // Continue without FBA fees
        }
      }

      // Calculate additional fees from MultiCountryRuleManager (assuming amounts are in baseCurrency or need conversion)
      const additionalFeesRaw = dutyRuleResult?.additionalFees || [];
      let brokerFeesBase = (productValueBase + shippingCostBase) * 0.03; // Default broker fee in base currency
      let otherFeesBase = convertCurrency(25, 'USD', baseCurrency); // Base handling fee in base currency
      
      additionalFeesRaw.forEach(fee => {
        // Assuming fee.amount is in a standard currency (e.g. USD) or needs context for conversion
        const feeAmountBase = fee.amount; // Placeholder: Needs proper currency handling for each fee type
        if (fee.type === 'broker') {
          brokerFeesBase = feeAmountBase;
        } else if (fee.type === 'mpf' || fee.type === 'hmf' || fee.type === 'customs') {
          otherFeesBase += feeAmountBase;
        }
      });

      // Calculate dutyable value in base currency
      const dutyableValueBase = (customsValueBase * quantity) + shippingCostBase + insuranceCostBase;

      // Calculate duty amount in base currency
      const dutyAmountBase = (dutyableValueBase * dutyRate) / 100;

      // Calculate taxable value in base currency
      const taxableValueBase = dutyableValueBase + dutyAmountBase;

      // Calculate tax amount in base currency
      const taxAmountBase = (taxableValueBase * taxRate) / 100;

      // Calculate total landed cost in base currency
      const totalLandedCostBase = dutyableValueBase + dutyAmountBase + taxAmountBase + brokerFeesBase + otherFeesBase + fbaFeeAmountBase;

      // Convert final amounts to targetCurrency
      const finalDutyAmount = convertCurrency(dutyAmountBase, baseCurrency, targetCurrency);
      const finalTaxAmount = convertCurrency(taxAmountBase, baseCurrency, targetCurrency);
      const finalShippingCost = convertCurrency(shippingCostBase, baseCurrency, targetCurrency);
      const finalInsuranceCost = convertCurrency(insuranceCostBase, baseCurrency, targetCurrency);
      const finalBrokerFees = convertCurrency(brokerFeesBase, baseCurrency, targetCurrency);
      const finalOtherFees = convertCurrency(otherFeesBase, baseCurrency, targetCurrency);
      const finalFbaFeeAmount = convertCurrency(fbaFeeAmountBase, baseCurrency, targetCurrency);
      const finalTotalLandedCost = convertCurrency(totalLandedCostBase, baseCurrency, targetCurrency);
      const finalProductValueForBreakdown = convertCurrency(productValueBase, baseCurrency, targetCurrency);
      const finalDutyableValue = convertCurrency(dutyableValueBase, baseCurrency, targetCurrency);


      // Calculate potential savings (simplified - would compare with current supplier)
      const currentCostBase = productValueBase * quantity * 1.3; // Assume 30% markup in base currency
      const savingsAmountBase = Math.max(0, currentCostBase - totalLandedCostBase);
      const finalSavingsAmount = convertCurrency(savingsAmountBase, baseCurrency, targetCurrency);
      const savingsPercentage = currentCostBase > 0 ? (savingsAmountBase / currentCostBase) * 100 : 0;

      // Enhanced confidence score based on data availability and source
      let confidenceScore = dutyRuleResult?.confidence || 0.7; 
      if (DUTY_RATES[hsCode]) {confidenceScore += 0.1;} 
      if (weight && weight > 0) {confidenceScore += 0.05;} 
      if (dimensions && fbaFeeAmountBase > 0) {confidenceScore += 0.1;} 
      if (dutyRuleResult?.preferentialTreatment) {confidenceScore += 0.05;} 
      confidenceScore = Math.min(1.0, confidenceScore);
      
      const dataSource = dutyRuleResult?.source === 'database' ? 'Enhanced Multi-Country Database' : 
                        dutyRuleResult?.source === 'external_api' ? 'External Trade API' : 
                        'Internal Database';

      const calculation: LandedCostCalculation = {
        dutyRate,
        dutyAmount: parseFloat(finalDutyAmount.toFixed(2)),
        taxRate,
        taxAmount: parseFloat(finalTaxAmount.toFixed(2)),
        shippingCost: parseFloat(finalShippingCost.toFixed(2)),
        insuranceCost: parseFloat(finalInsuranceCost.toFixed(2)),
        brokerFees: parseFloat(finalBrokerFees.toFixed(2)),
        otherFees: parseFloat(finalOtherFees.toFixed(2)),
        totalLandedCost: parseFloat(finalTotalLandedCost.toFixed(2)),
        currency: targetCurrency,
        savingsAmount: parseFloat(finalSavingsAmount.toFixed(2)),
        savingsPercentage: parseFloat(savingsPercentage.toFixed(2)),
        confidenceScore: parseFloat(confidenceScore.toFixed(2)),
        dataSource,
        fbaFeeAmount: parseFloat(finalFbaFeeAmount.toFixed(2)),
        tradeAgreementApplied: dutyRuleResult?.tradeAgreementApplied,
        preferentialTreatment: dutyRuleResult?.preferentialTreatment || false,
        breakdown: {
          productValue: parseFloat(finalProductValueForBreakdown.toFixed(2)), // Product value in target currency
          quantity,
          dutyableValue: parseFloat(finalDutyableValue.toFixed(2)), // Dutyable value in target currency
          dutyCalculation: {
            rate: dutyRate,
            amount: parseFloat(finalDutyAmount.toFixed(2)),
            basis: 'CIF Value'
          },
          taxCalculation: {
            rate: taxRate,
            amount: parseFloat(finalTaxAmount.toFixed(2)),
            basis: 'CIF + Duty'
          },
          fees: {
            shipping: parseFloat(finalShippingCost.toFixed(2)),
            insurance: parseFloat(finalInsuranceCost.toFixed(2)),
            broker: parseFloat(finalBrokerFees.toFixed(2)),
            other: parseFloat(finalOtherFees.toFixed(2)),
            fba: parseFloat(finalFbaFeeAmount.toFixed(2))
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
