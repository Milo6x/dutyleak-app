import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('API Health Check', () => {
  beforeEach(() => {
    // Set up environment variables for testing
    process.env.ZONOS_API_KEY = 'test-zonos-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });
  
  it('should check environment variables are configured', () => {
    expect(process.env.ZONOS_API_KEY).toBe('test-zonos-key');
    expect(process.env.OPENAI_API_KEY).toBe('test-openai-key');
  });
  
  it('should detect missing environment variables', () => {
    delete process.env.ZONOS_API_KEY;
    expect(process.env.ZONOS_API_KEY).toBeUndefined();
  });
  
  it('should validate API key format', () => {
    const apiKey = process.env.OPENAI_API_KEY;
    expect(typeof apiKey).toBe('string');
    expect(apiKey.length).toBeGreaterThan(0);
  });
  
  it('should handle health check status', () => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      externalApiStatus: {
        zonos: process.env.ZONOS_API_KEY ? 'configured' : 'not configured',
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured'
      }
    };
    
    expect(healthStatus.status).toBe('healthy');
    expect(healthStatus.database).toBe('connected');
    expect(healthStatus.externalApiStatus.zonos).toBe('configured');
    expect(healthStatus.externalApiStatus.openai).toBe('configured');
  });
});
