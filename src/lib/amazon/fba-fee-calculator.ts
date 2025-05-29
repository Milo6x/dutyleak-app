export interface FbaFeeCalculatorOptions {
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'in' | 'cm';
  };
  weight?: {
    value: number;
    unit: 'lb' | 'oz' | 'kg' | 'g';
  };
  category?: string;
  asin?: string;
  tier?: 'standard' | 'oversize' | 'special';
}

export interface FbaFeeResult {
  fbaFee: number;
  breakdown: {
    fulfillmentFee: number;
    storageFee: number;
    otherFees: number;
  };
}

export class FbaFeeCalculator {
  /**
   * Calculate FBA fees based on product dimensions, weight, and category
   * @param options - FBA fee calculation options
   * @returns FBA fee calculation result
   */
  calculate(options: FbaFeeCalculatorOptions): FbaFeeResult {
    // Convert dimensions to inches if needed
    const dimensions = this.normalizeDimensions(options.dimensions);
    
    // Convert weight to pounds if needed
    const weight = this.normalizeWeight(options.weight);
    
    // Determine product tier
    const tier = options.tier || this.determineTier(dimensions, weight);
    
    // Calculate fulfillment fee
    const fulfillmentFee = this.calculateFulfillmentFee(tier, weight, options.category);
    
    // Calculate storage fee (monthly, prorated to daily)
    const storageFee = this.calculateStorageFee(tier, dimensions);
    
    // Calculate other fees (referral, etc.)
    const otherFees = this.calculateOtherFees(options.category);
    
    // Calculate total FBA fee
    const fbaFee = fulfillmentFee + storageFee + otherFees;
    
    return {
      fbaFee: parseFloat(fbaFee.toFixed(2)),
      breakdown: {
        fulfillmentFee: parseFloat(fulfillmentFee.toFixed(2)),
        storageFee: parseFloat(storageFee.toFixed(2)),
        otherFees: parseFloat(otherFees.toFixed(2))
      }
    };
  }
  
  /**
   * Normalize dimensions to inches
   */
  private normalizeDimensions(dimensions?: { length: number; width: number; height: number; unit: 'in' | 'cm' }) {
    if (!dimensions) {
      return { length: 0, width: 0, height: 0 };
    }
    
    if (dimensions.unit === 'cm') {
      return {
        length: dimensions.length / 2.54,
        width: dimensions.width / 2.54,
        height: dimensions.height / 2.54
      };
    }
    
    return {
      length: dimensions.length,
      width: dimensions.width,
      height: dimensions.height
    };
  }
  
  /**
   * Normalize weight to pounds
   */
  private normalizeWeight(weight?: { value: number; unit: 'lb' | 'oz' | 'kg' | 'g' }) {
    if (!weight) {
      return 0;
    }
    
    switch (weight.unit) {
      case 'oz':
        return weight.value / 16;
      case 'kg':
        return weight.value * 2.20462;
      case 'g':
        return weight.value * 0.00220462;
      default:
        return weight.value;
    }
  }
  
  /**
   * Determine product tier based on dimensions and weight
   */
  private determineTier(dimensions: { length: number; width: number; height: number }, weight: number): 'standard' | 'oversize' | 'special' {
    // Sort dimensions to get longest side
    const sides = [dimensions.length, dimensions.width, dimensions.height].sort((a, b) => b - a);
    const longestSide = sides[0];
    const medianSide = sides[1];
    const shortestSide = sides[2];
    
    // Calculate dimensional weight and girth
    const dimensionalWeight = (dimensions.length * dimensions.width * dimensions.height) / 166;
    const girth = 2 * (medianSide + shortestSide);
    
    // Standard size criteria
    if (
      weight <= 20 &&
      longestSide <= 18 &&
      medianSide <= 14 &&
      shortestSide <= 8
    ) {
      return 'standard';
    }
    
    // Special oversize criteria
    if (
      weight > 70 ||
      longestSide > 108 ||
      girth > 165
    ) {
      return 'special';
    }
    
    // Default to regular oversize
    return 'oversize';
  }
  
  /**
   * Calculate fulfillment fee based on tier, weight, and category
   */
  private calculateFulfillmentFee(tier: 'standard' | 'oversize' | 'special', weight: number, category?: string): number {
    // Base rates (simplified for example)
    if (tier === 'standard') {
      if (weight <= 1) return 3.22;
      if (weight <= 2) return 3.40;
      if (weight <= 3) return 3.58;
      if (weight <= 4) return 3.76;
      if (weight <= 5) return 3.94;
      if (weight <= 6) return 4.12;
      if (weight <= 7) return 4.30;
      if (weight <= 8) return 4.48;
      if (weight <= 9) return 4.66;
      if (weight <= 10) return 4.84;
      if (weight <= 15) return 5.02;
      if (weight <= 20) return 5.20;
      return 5.38; // Over 20 lbs
    }
    
    if (tier === 'oversize') {
      if (weight <= 5) return 8.26;
      if (weight <= 10) return 9.79;
      if (weight <= 20) return 13.05;
      if (weight <= 40) return 17.39;
      if (weight <= 70) return 26.57;
      return 26.57; // Over 70 lbs
    }
    
    if (tier === 'special') {
      // Special oversize has a base rate plus per-pound fee
      return 89.98 + Math.max(0, weight - 90) * 0.38;
    }
    
    return 0;
  }
  
  /**
   * Calculate storage fee based on tier and dimensions
   */
  private calculateStorageFee(tier: 'standard' | 'oversize' | 'special', dimensions: { length: number; width: number; height: number }): number {
    // Calculate cubic feet
    const cubicFeet = (dimensions.length * dimensions.width * dimensions.height) / 1728;
    
    // Monthly storage rates per cubic foot (simplified)
    const monthlyRate = tier === 'standard' ? 0.75 : 0.48;
    
    // Prorate to daily rate (assuming 30 days per month)
    return (cubicFeet * monthlyRate) / 30;
  }
  
  /**
   * Calculate other fees based on category
   */
  private calculateOtherFees(category?: string): number {
    // Simplified example - in reality, this would include referral fees, etc.
    if (!category) return 0;
    
    switch (category.toLowerCase()) {
      case 'electronics':
        return 0.8;
      case 'clothing':
        return 0.5;
      case 'toys':
        return 0.6;
      default:
        return 0.4;
    }
  }
  
  /**
   * Fetch FBA fees from Amazon SP-API for a specific ASIN
   * @param asin - Amazon ASIN
   * @returns Promise with FBA fee result
   */
  async fetchFbaFeeByAsin(asin: string): Promise<FbaFeeResult> {
    try {
      // In a real implementation, this would call the Amazon SP-API
      // For this example, we'll return a simulated response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate a realistic FBA fee based on the ASIN
      // This is a simplified example - real fees would come from the SP-API
      const fulfillmentFee = 3.5 + (parseInt(asin.charAt(asin.length - 1), 36) % 5);
      const storageFee = 0.2 + (parseInt(asin.charAt(asin.length - 2), 36) % 3) / 10;
      const otherFees = 0.3 + (parseInt(asin.charAt(asin.length - 3), 36) % 4) / 10;
      const fbaFee = fulfillmentFee + storageFee + otherFees;
      
      return {
        fbaFee: parseFloat(fbaFee.toFixed(2)),
        breakdown: {
          fulfillmentFee: parseFloat(fulfillmentFee.toFixed(2)),
          storageFee: parseFloat(storageFee.toFixed(2)),
          otherFees: parseFloat(otherFees.toFixed(2))
        }
      };
    } catch (error) {
      console.error('Error fetching FBA fees from SP-API:', error);
      
      // Return default values if API call fails
      return {
        fbaFee: 4.5,
        breakdown: {
          fulfillmentFee: 3.5,
          storageFee: 0.5,
          otherFees: 0.5
        }
      };
    }
  }
}
