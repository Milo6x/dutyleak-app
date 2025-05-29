export interface TaricDutyRateResult {
  dutyPercentage: number;
  vatPercentage?: number;
  effectiveDate?: string;
  expiryDate?: string;
}

export interface TaricResponse {
  success: boolean;
  rates?: TaricDutyRateResult[];
  error?: string;
}

export class TaricClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp';
  }

  /**
   * Get duty rates from the TARIC database for EU countries
   * @param hsCode - HS code (6 or 8 digits)
   * @param destinationCountry - Destination country code (EU country)
   * @param originCountry - Optional origin country code for preferential rates
   * @returns Duty rates information
   */
  async getDutyRates(
    hsCode: string,
    destinationCountry: string,
    originCountry?: string
  ): Promise<TaricResponse> {
    try {
      // In a real implementation, this would make an actual API call to TARIC
      // For this example, we'll simulate the response based on common duty rates
      
      // Validate inputs
      if (!hsCode || hsCode.length < 6) {
        return {
          success: false,
          error: 'Invalid HS code. Must be at least 6 digits.'
        };
      }
      
      // Check if destination is an EU country
      const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 
                          'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
      
      if (!euCountries.includes(destinationCountry) && destinationCountry !== 'GB') {
        return {
          success: false,
          error: 'Destination country must be an EU country or GB for TARIC rates.'
        };
      }
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate a realistic duty rate based on the HS code
      // This is a simplified example - real rates would come from the TARIC database
      const hsPrefix = hsCode.substring(0, 2);
      let dutyPercentage = 0;
      
      // Assign different duty rates based on HS chapter
      if (['01', '02', '03', '04'].includes(hsPrefix)) {
        // Agricultural products
        dutyPercentage = 12.5;
      } else if (['28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38'].includes(hsPrefix)) {
        // Chemicals
        dutyPercentage = 6.5;
      } else if (['84', '85'].includes(hsPrefix)) {
        // Machinery and electrical equipment
        dutyPercentage = 2.7;
      } else if (['87'].includes(hsPrefix)) {
        // Vehicles
        dutyPercentage = 10.0;
      } else if (['61', '62'].includes(hsPrefix)) {
        // Apparel
        dutyPercentage = 12.0;
      } else {
        // Default rate for other products
        dutyPercentage = 4.5;
      }
      
      // Apply preferential rate if origin country is specified and has a trade agreement
      if (originCountry) {
        const preferentialCountries = ['CH', 'NO', 'IS', 'CA', 'JP', 'KR', 'SG'];
        if (preferentialCountries.includes(originCountry)) {
          dutyPercentage = dutyPercentage * 0.5; // 50% reduction for preferential partners
        }
      }
      
      // Get VAT rate based on destination country
      const vatRates: Record<string, number> = {
        'AT': 20, 'BE': 21, 'BG': 20, 'HR': 25, 'CY': 19, 'CZ': 21, 'DK': 25,
        'EE': 20, 'FI': 24, 'FR': 20, 'DE': 19, 'GR': 24, 'HU': 27, 'IE': 23,
        'IT': 22, 'LV': 21, 'LT': 21, 'LU': 17, 'MT': 18, 'NL': 21, 'PL': 23,
        'PT': 23, 'RO': 19, 'SK': 20, 'SI': 22, 'ES': 21, 'SE': 25, 'GB': 20
      };
      
      const vatPercentage = vatRates[destinationCountry] || 20;
      
      return {
        success: true,
        rates: [
          {
            dutyPercentage: parseFloat(dutyPercentage.toFixed(2)),
            vatPercentage,
            effectiveDate: new Date().toISOString().split('T')[0], // Current date
            expiryDate: null // No expiry for this example
          }
        ]
      };
    } catch (error) {
      console.error('TARIC API error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }
}
