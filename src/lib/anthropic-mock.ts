// Mock Anthropic SDK module to resolve import issues
// This is a temporary solution until the actual @anthropic-ai/sdk package is installed

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface MessageResponse {
  content: Array<{
    type: 'text'
    text: string
  }>
}

export class Anthropic {
  constructor(config: { apiKey: string; dangerouslyAllowBrowser?: boolean }) {
    // Mock constructor
  }

  messages = {
    create: async (params: any): Promise<MessageResponse> => {
      // Mock implementation
      throw new Error('Anthropic SDK not installed. Please install with: npm install @anthropic-ai/sdk')
    }
  }
}

export default Anthropic