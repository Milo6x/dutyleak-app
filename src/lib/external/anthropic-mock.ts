// Mock Anthropic SDK for development
// Install the real package with: npm install @anthropic-ai/sdk

export default class Anthropic {
  constructor(options?: { apiKey?: string }) {
    console.warn('Using mock Anthropic client. Install @anthropic-ai/sdk for production use.');
  }

  messages = {
    create: async (params: any) => {
      console.warn('Mock Anthropic API call:', params);
      return {
        content: [{
          type: 'text',
          text: 'Mock response from Anthropic API. Please install @anthropic-ai/sdk for actual functionality.'
        }],
        model: params.model || 'claude-3-sonnet-20240229',
        role: 'assistant',
        stop_reason: 'end_turn',
        stop_sequence: null,
        type: 'message',
        usage: {
          input_tokens: 10,
          output_tokens: 20
        }
      };
    }
  };
}