import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Mock the API route handler
vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

// Mock Supabase client
const mockSupabaseSelect = vi.fn();
const mockSupabaseFrom = vi.fn().mockReturnValue({
  select: mockSupabaseSelect
});

const mockSupabaseAuth = {
  getSession: vi.fn()
};

const mockCreateDutyLeakServerClient = vi.fn().mockReturnValue({
  from: mockSupabaseFrom,
  auth: mockSupabaseAuth
});

vi.mock('@/lib/supabase', () => ({
  createDutyLeakServerClient: () => mockCreateDutyLeakServerClient()
}));

// Import the API route handler
import { GET } from '../../../app/api/health/route';

describe('Health API Route', () => {
  let req: NextRequest;
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Mock cookies
    (cookies as any).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: 'test-cookie' })
    });
    
    // Mock request
    req = new NextRequest('https://example.com/api/health');
    
    // Mock environment variables
    process.env.ZONOS_API_KEY = 'test-zonos-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    
    // Mock Supabase auth session
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        }
      }
    });
    
    // Mock Supabase query result
    mockSupabaseSelect.mockResolvedValue({
      data: [{ id: 'test-workspace-id', name: 'Test Workspace' }],
      error: null
    });
  });
  
  it('should return healthy status when all systems are operational', async () => {
    const response = await GET(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: 'healthy',
      timestamp: expect.any(String),
      database: 'connected',
      user: {
        id: 'test-user-id',
        email: 'test@example.com'
      },
      externalApiStatus: {
        zonos: 'configured',
        openai: 'configured',
        taric: 'simulated',
        usitc: 'simulated'
      }
    });
    
    // Verify Supabase was called correctly
    expect(mockSupabaseFrom).toHaveBeenCalledWith('workspaces');
    expect(mockSupabaseSelect).toHaveBeenCalledWith('id, name');
  });
  
  it('should return unauthorized when not authenticated', async () => {
    // Mock unauthenticated session
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null }
    });
    
    const response = await GET(req);
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data).toEqual({
      error: 'Unauthorized'
    });
  });
  
  it('should return error when database connection fails', async () => {
    // Mock database error
    mockSupabaseSelect.mockResolvedValue({
      data: null,
      error: { message: 'Database connection error' }
    });
    
    const response = await GET(req);
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Database connection error',
      details: 'Database connection error'
    });
  });
  
  it('should show external APIs as not configured when keys are missing', async () => {
    // Remove API keys
    delete process.env.ZONOS_API_KEY;
    delete process.env.OPENAI_API_KEY;
    
    const response = await GET(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.externalApiStatus).toEqual({
      zonos: 'not configured',
      openai: 'not configured',
      taric: 'simulated',
      usitc: 'simulated'
    });
  });
});
