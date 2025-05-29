import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZonosClient } from '../zonos-client';

// Mock fetch
global.fetch = vi.fn();

describe('ZonosClient', () => {
  let client: ZonosClient;
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Set environment variable for testing
    process.env.ZONOS_API_KEY = 'test-api-key';
    
    // Create client
    client = new ZonosClient();
  });
  
  it('should successfully classify a product', async () => {
    // Mock successful response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hs_code: '847130',
        confidence_score: 0.85,
        ruling_reference: 'Test ruling'
      })
    });
    
    const result = await client.classifyProduct('Laptop Computer', 'Portable computing device');
    
    // Verify fetch was called with correct parameters
    expect(fetch).toHaveBeenCalledWith('https://api.zonos.com/v1/classification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-api-key'
      },
      body: JSON.stringify({
        product: {
          name: 'Laptop Computer',
          description: 'Portable computing device',
          reference_hs_code: ''
        }
      })
    });
    
    // Verify result
    expect(result).toEqual({
      success: true,
      hsCode: '847130',
      confidenceScore: 0.85,
      rulingReference: 'Test ruling'
    });
  });
  
  it('should handle API errors', async () => {
    // Mock error response
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        message: 'Invalid API key'
      })
    });
    
    const result = await client.classifyProduct('Laptop Computer');
    
    // Verify result
    expect(result).toEqual({
      success: false,
      error: 'Invalid API key'
    });
  });
  
  it('should handle network errors', async () => {
    // Mock network error
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));
    
    const result = await client.classifyProduct('Laptop Computer');
    
    // Verify result
    expect(result).toEqual({
      success: false,
      error: 'Network error'
    });
  });
  
  it('should handle missing API key', async () => {
    // Remove API key
    delete process.env.ZONOS_API_KEY;
    
    // Create new client with no API key
    const noKeyClient = new ZonosClient();
    
    const result = await noKeyClient.classifyProduct('Laptop Computer');
    
    // Verify result
    expect(result).toEqual({
      success: false,
      error: 'Zonos API key not configured'
    });
    
    // Verify fetch was not called
    expect(fetch).not.toHaveBeenCalled();
  });
});
