export interface OpenAIClassificationResult {
  success: boolean;
  hsCode?: string;
  confidenceScore?: number;
  rulingReference?: string;
  error?: string;
}

interface ChatCompletionContentPartText {
  type: 'text';
  text: string;
}

interface ChatCompletionContentPartImage {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

type ChatCompletionContentPart = ChatCompletionContentPartText | ChatCompletionContentPartImage;

export class OpenAIClient {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    
    if (!this.apiKey) {
      console.warn('OPENAI_API_KEY environment variable not set');
    }
  }

  /**
   * Classify a product using OpenAI
   * @param productName - Name of the product
   * @param productDescription - Description of the product
   * @param imageUrl - Optional URL to product image for vision-based classification
   * @returns Classification result with HS code and confidence score
   */
  async classifyProduct(
    productName: string,
    productDescription?: string,
    imageUrl?: string
  ): Promise<OpenAIClassificationResult> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured'
        };
      }

      const userMessageContent: ChatCompletionContentPart[] = [
        {
          type: 'text',
          text: `Please classify the following product:\n\nProduct Name: ${productName}\n${productDescription ? `Product Description: ${productDescription}\n` : ''}\n\nProvide the HS code, confidence score, and brief explanation.`
        }
      ];

      // Add image content if available
      if (imageUrl) {
        userMessageContent.push({
          type: 'image_url',
          image_url: {
            url: imageUrl
          }
        });
      }

      const messages = [
        {
          role: 'system',
          content: 'You are an expert in HS (Harmonized System) classification for international trade. Your task is to determine the most accurate HS code for a product based on its name, description, and image if available. Provide the HS code at the 6-digit level (or 8-digit if you are highly confident), along with a confidence score from 0 to 1.'
        },
        {
          role: 'user',
          content: userMessageContent
        }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.2,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error?.message || `API error: ${response.status}`
        };
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return {
          success: false,
          error: 'No content in OpenAI response'
        };
      }

      // Extract HS code and confidence from the response
      // This is a simple regex approach - in production, you might want more robust parsing
      const hsCodeMatch = content.match(/HS Code:?\s*(\d{6,10})/i);
      const confidenceMatch = content.match(/Confidence:?\s*(0\.\d+|1\.0|1)/i);
      
      if (!hsCodeMatch) {
        return {
          success: false,
          error: 'Could not extract HS code from OpenAI response'
        };
      }

      return {
        success: true,
        hsCode: hsCodeMatch[1],
        confidenceScore: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.6,
        rulingReference: 'AI-assisted classification'
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }
}
