import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server' // For potential user/workspace context
// import { cookies } from 'next/headers'; // If needed for auth context

interface PerformanceStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  latest: number;
}

interface MetricPayload {
  metric_name: string;
  stats: PerformanceStats;
  timestamp: string; // ISO string
  // Potentially add user_agent, user_id, workspace_id if sent from client or derived here
}

export async function POST(request: NextRequest) {
  try {
    const payload: MetricPayload = await request.json();

    // Log the received metric data
    console.log('Received client performance metric:', JSON.stringify(payload, null, 2));

    // TODO: Store the metric data in a persistent store, e.g., a Supabase table.
    // Example Supabase table schema:
    // CREATE TABLE client_performance_metrics (
    //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    //   created_at TIMESTAMPTZ DEFAULT now(),
    //   metric_name TEXT NOT NULL,
    //   count INTEGER,
    //   avg_value FLOAT,
    //   min_value FLOAT,
    //   max_value FLOAT,
    //   latest_value FLOAT,
    //   metric_timestamp TIMESTAMPTZ,
    //   user_agent TEXT,
    //   user_id UUID REFERENCES auth.users(id),
    //   workspace_id UUID REFERENCES workspaces(id), // Assuming a workspaces table
    //   raw_stats JSONB
    // );

    // Example insertion (requires Supabase client and auth context if storing user/workspace):
    /*
    const supabase = createDutyLeakServerClient();
    const { data: { user } } = await supabase.auth.getUser(); // Example: get user context
    // const workspaceId = ... // get workspace context if available

    const { error } = await supabase.from('client_performance_metrics').insert({
      metric_name: payload.metric_name,
      count: payload.stats.count,
      avg_value: payload.stats.avg,
      min_value: payload.stats.min,
      max_value: payload.stats.max,
      latest_value: payload.stats.latest,
      metric_timestamp: payload.timestamp,
      // user_id: user?.id,
      // workspace_id: workspaceId,
      raw_stats: payload.stats,
      user_agent: request.headers.get('user-agent')
    });

    if (error) {
      console.error('Error storing client performance metric:', error);
      // Still return 202 to client as client-side should fail silently
    }
    */

    // Respond with 202 Accepted, as the client doesn't need to wait for storage.
    return NextResponse.json({ success: true, message: 'Metric received' }, { status: 202 });

  } catch (error) {
    console.error('Error processing /api/metrics request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
