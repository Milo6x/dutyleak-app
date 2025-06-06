export interface UsitcDutyRateResult {
  dutyPercentage: number;
  vatPercentage?: number;
  effectiveDate?: string;
  expiryDate?: string;
}

export interface UsitcResponse {
  success: boolean;
  rates?: UsitcDutyRateResult[];
  error?: string;
}

export class UsitcClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://dataweb.usitc.gov/api/';
  }

  /**
   * Get duty rates from the USITC DataWeb API for US imports
   * @param hsCode - HS code (6 or 8 digits)
   * @param originCountry - Optional origin country code for preferential rates
   * @returns Duty rates information
   */
  async getDutyRates(
    hsCode: string,
    originCountry?: string
  ): Promise<UsitcResponse> {
    try {
      // In a real implementation, this would make an actual API call to USITC DataWeb
      // For this example, we'll simulate the response based on common US duty rates
      
      // Validate inputs
      if (!hsCode || hsCode.length < 6) {
        return {
          success: false,
          error: 'Invalid HS code. Must be at least 6 digits.'
        };
      }
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate a realistic duty rate based on the HS code
      // This is a simplified example - real rates would come from the USITC DataWeb API
      const hsPrefix = hsCode.substring(0, 2);
      let dutyPercentage = 0;
      
      // Assign different duty rates based on HS chapter
      if (['01', '02', '03', '04'].includes(hsPrefix)) {
        // Agricultural products
        dutyPercentage = 6.8;
      } else if (['28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38'].includes(hsPrefix)) {
        // Chemicals
        dutyPercentage = 3.7;
      } else if (['84', '85'].includes(hsPrefix)) {
        // Machinery and electrical equipment
        dutyPercentage = 2.5;
      } else if (['87'].includes(hsPrefix)) {
        // Vehicles
        dutyPercentage = 2.5;
      } else if (['61', '62'].includes(hsPrefix)) {
        // Apparel
        dutyPercentage = 16.5;
      } else {
        // Default rate for other products
        dutyPercentage = 4.0;
      }
      
      // Apply preferential rate if origin country is specified and has a trade agreement
      if (originCountry) {
        // Countries with free trade agreements with the US
        const ftaCountries = ['CA', 'MX', 'AU', 'SG', 'CL', 'KR', 'CO', 'PA', 'PE'];
        if (ftaCountries.includes(originCountry)) {
          dutyPercentage = 0; // Duty-free for FTA partners
        }
        
        // GSP beneficiary countries (simplified list)
        const gspCountries = ['BR', 'IN', 'ID', 'TH', 'PH', 'ZA'];
        if (gspCountries.includes(originCountry) && dutyPercentage > 0) {
          dutyPercentage = 0; // Duty-free for GSP eligible products
        }
      }
      
      // US doesn't have VAT but has sales tax which varies by state
      // For this example, we'll use 0 as it's not applied at import
      const vatPercentage = 0;
      
      return {
        success: true,
        rates: [
          {
            dutyPercentage: parseFloat(dutyPercentage.toFixed(2)),
            vatPercentage,
            effectiveDate: new Date().toISOString().split('T')[0], // Current date
            expiryDate: undefined // No expiry for this example
          }
        ]
      };
    } catch (error) {
      console.error('USITC API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
