// Mock OpenAI SDK for development
// Install the real package with: npm install openai

export default class OpenAI {
  constructor(options?: { apiKey?: string }) {
    console.warn('Using mock OpenAI client. Install openai package for production use.');
  }

  chat = {
    completions: {
      create: async (params: any) => {
        console.warn('Mock OpenAI API call:', params);
        return {
          id: 'chatcmpl-mock',
          object: 'chat.completion',
          created: Date.now(),
          model: params.model || 'gpt-3.5-turbo',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'Mock response from OpenAI API. Please install openai package for actual functionality.'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        };
      }
    }
  };
}