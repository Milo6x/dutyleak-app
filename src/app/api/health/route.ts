import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// This is a simple test endpoint to validate the API functionality
export async function GET(req: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient();
    
    // Check authentication
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('workspaces')
      .select('id, name')
      .limit(1);

    if (testError) {
      return NextResponse.json(
        { error: 'Database connection error', details: testError.message },
        { status: 500 }
      );
    }

    // Test external API clients
    const externalApiStatus = {
      zonos: process.env.ZONOS_API_KEY ? 'configured' : 'not configured',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
      taric: 'simulated',
      usitc: 'simulated'
    };

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      user: {
        id: user.id,
        email: user.email
      },
      externalApiStatus
    });
    
  } catch (error) {
    console.error('Health check API error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
