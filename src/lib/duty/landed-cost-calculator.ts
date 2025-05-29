export interface LandedCostCalculatorOptions {
  productValue: number;
  shippingCost: number;
  insuranceCost: number;
  dutyPercentage: number;
  vatPercentage: number;
  fbaFeeAmount?: number; // NEW: FBA fee amount
}

export interface LandedCostResult {
  dutyAmount: number;
  vatAmount: number;
  fbaFeeAmount: number; // NEW: FBA fee amount
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
    fbaFeeAmount: number; // NEW: FBA fee amount
  };
}

export class LandedCostCalculator {
  private options: LandedCostCalculatorOptions;

  constructor(options: LandedCostCalculatorOptions) {
    this.options = {
      productValue: options.productValue,
      shippingCost: options.shippingCost || 0,
      insuranceCost: options.insuranceCost || 0,
      dutyPercentage: options.dutyPercentage || 0,
      vatPercentage: options.vatPercentage || 0,
      fbaFeeAmount: options.fbaFeeAmount || 0 // NEW: Default to 0 if not provided
    };
  }

  /**
   * Calculate landed cost including duty, VAT/tax, and FBA fees
   * @returns Landed cost calculation result
   */
  calculate(): LandedCostResult {
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
      fbaFeeAmount: parseFloat((fbaFeeAmount || 0).toFixed(2)), // NEW: Include FBA fee in result
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
        fbaFeeAmount: parseFloat((fbaFeeAmount || 0).toFixed(2)) // NEW: Include FBA fee in breakdown
      }
    };
  }
}
