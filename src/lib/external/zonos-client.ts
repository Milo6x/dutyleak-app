export interface ZonosClassificationResult {
  success: boolean;
  hsCode?: string;
  confidenceScore?: number;
  rulingReference?: string;
  error?: string;
}

export class ZonosClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ZONOS_API_KEY || '';
    this.baseUrl = 'https://api.zonos.com/v1';
    
    if (!this.apiKey) {
      console.warn('ZONOS_API_KEY environment variable not set');
    }
  }

  /**
   * Classify a product using the Zonos API
   * @param productName - Name of the product
   * @param productDescription - Description of the product
   * @param existingHsCode - Optional existing HS code for reference
   * @returns Classification result with HS code and confidence score
   */
  async classifyProduct(
    productName: string,
    productDescription?: string,
    existingHsCode?: string
  ): Promise<ZonosClassificationResult> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'Zonos API key not configured'
        };
      }

      const response = await fetch(`${this.baseUrl}/classification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          product: {
            name: productName,
            description: productDescription || '',
            reference_hs_code: existingHsCode || ''
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.message || `API error: ${response.status}`
        };
      }

      const data = await response.json();
      
      // Extract the relevant data from the Zonos response
      // Note: This is a simplified example, actual Zonos API response structure may differ
      return {
        success: true,
        hsCode: data.hs_code,
        confidenceScore: data.confidence_score,
        rulingReference: data.ruling_reference
      };
    } catch (error) {
      console.error('Zonos API error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }
}
