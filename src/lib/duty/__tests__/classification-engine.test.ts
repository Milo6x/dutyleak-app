import { ClassificationEngine, ClassificationRequest, ClassificationResult } from '../classification-engine';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock external clients
// ZonosClient is used by ClassificationEngine, but not OpenAIClient or AnthropicClient directly by the current engine code.
// The engine's classifyProduct method calls this.zonosClient.classifyProduct and this.openaiClient.classifyProduct.
// The test mocks were for a different engine structure.
jest.mock('@/lib/external/zonos-client', () => ({
  ZonosClient: jest.fn().mockImplementation(() => ({
    classifyProduct: jest.fn().mockResolvedValue({ success: false, error: 'Zonos not configured/failed' }), // Default mock
  })),
}));
jest.mock('@/lib/external/openai-client', () => ({
  OpenAIClient: jest.fn().mockImplementation(() => ({
    // getEmbeddings: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]), // Not directly used by current classifyProduct
    classifyProduct: jest.fn().mockResolvedValue({ success: true, hsCode: '123456', confidenceScore: 0.9, reasoning: 'AI reasoning' }),
  })),
}));

// Mock Supabase client
const mockSupabaseClientInstance = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: { id: 'prod_test123', workspace_id: 'ws_123' }, error: null }), // Mock product fetch
  rpc: jest.fn(), // Not used by current classifyProduct
};

describe('ClassificationEngine', () => {
  let classificationEngine: ClassificationEngine;
  let supabaseMock: any;
  let ZonosClientMock: any;
  let OpenAIClientMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    supabaseMock = { ...mockSupabaseClientInstance };
    
    // Import mocks inside beforeEach or at top level after jest.mock calls
    const { ZonosClient } = require('@/lib/external/zonos-client');
    const { OpenAIClient } = require('@/lib/external/openai-client');
    ZonosClientMock = ZonosClient;
    OpenAIClientMock = OpenAIClient;

    // Default mock implementations for AI clients for each test run
    (ZonosClientMock as jest.Mock).mockImplementation(() => ({
      classifyProduct: jest.fn().mockResolvedValue({ success: false, error: 'Zonos mock error' }),
    }));
    (OpenAIClientMock as jest.Mock).mockImplementation(() => ({
      classifyProduct: jest.fn().mockResolvedValue({ success: true, hsCode: '123456', confidenceScore: 0.9 }),
    }));
    
    // Mock successful insert for classifications
    supabaseMock.from.mockImplementation((tableName: string) => {
      if (tableName === 'classifications') {
        return {
          ...mockSupabaseClientInstance, // spread other methods
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'classification_new_id' }, error: null }),
        };
      }
      return mockSupabaseClientInstance; // default for other tables like 'products'
    });


    classificationEngine = new ClassificationEngine(0.7); // Use default confidence or specify
  });

  describe('classifyProduct method', () => {
    const request: ClassificationRequest = {
      productId: 'prod_test123',
      productName: 'Test Product Name',
      productDescription: 'Detailed description of the test product.',
      // category and originCountry are not part of ClassificationRequest
    };

    it('should attempt Zonos then fallback to OpenAI if Zonos fails', async () => {
      const result = await classificationEngine.classifyProduct(request, supabaseMock as SupabaseClient);
      
      expect(ZonosClientMock().classifyProduct).toHaveBeenCalled();
      expect(OpenAIClientMock().classifyProduct).toHaveBeenCalled();
      expect(result.hsCode).toBe('123456'); // From OpenAI mock
      expect(result.confidenceScore).toBe(0.9);
      expect(result.source).toBe('openai');
      expect(result.success).toBe(true);
    });

    it('should use Zonos result if successful', async () => {
      (ZonosClientMock as jest.Mock).mockImplementationOnce(() => ({
        classifyProduct: jest.fn().mockResolvedValue({ success: true, hsCode: '789012', confidenceScore: 0.95 }),
      }));

      const result = await classificationEngine.classifyProduct(request, supabaseMock as SupabaseClient);
      
      expect(ZonosClientMock().classifyProduct).toHaveBeenCalled();
      expect(OpenAIClientMock().classifyProduct).not.toHaveBeenCalled(); // OpenAI should not be called
      expect(result.hsCode).toBe('789012');
      expect(result.confidenceScore).toBe(0.95);
      expect(result.source).toBe('zonos');
      expect(result.success).toBe(true);
    });
    
    it('should handle product not found or access denied', async () => {
      supabaseMock.from.mockImplementation((tableName: string) => {
        if (tableName === 'products') {
          return { ...mockSupabaseClientInstance, single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }) };
        }
        return mockSupabaseClientInstance;
      });
      const result = await classificationEngine.classifyProduct(request, supabaseMock as SupabaseClient);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found or access denied');
    });

    it('should return error if all classification services fail', async () => {
      (ZonosClientMock as jest.Mock).mockImplementationOnce(() => ({
        classifyProduct: jest.fn().mockResolvedValue({ success: false, error: 'Zonos failed' }),
      }));
      (OpenAIClientMock as jest.Mock).mockImplementationOnce(() => ({
        classifyProduct: jest.fn().mockResolvedValue({ success: false, error: 'OpenAI failed' }),
      }));

      const result = await classificationEngine.classifyProduct(request, supabaseMock as SupabaseClient);
      expect(result.success).toBe(false);
      expect(result.error).toBe('All classification services failed'); // Or the error from the last one tried
    });
    
    it('should handle error during classification storage', async () => {
      supabaseMock.from.mockImplementation((tableName: string) => {
        if (tableName === 'classifications') {
          return { ...mockSupabaseClientInstance, insert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: {message: 'Insert failed'} }) };
        }
        if (tableName === 'products') {
             return { ...mockSupabaseClientInstance, single: jest.fn().mockResolvedValue({ data: { id: 'prod_test123', workspace_id: 'ws_123' }, error: null }) };
        }
        return mockSupabaseClientInstance;
      });

      const result = await classificationEngine.classifyProduct(request, supabaseMock as SupabaseClient);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to store classification');
    });


    // TODO: Add tests for classifyBatch method
    // TODO: Add tests for different input variations (missing description, etc.)
    // TODO: Add tests for flagging system interaction (forceReview, reviewReason, automatic flagging)
  });
});
