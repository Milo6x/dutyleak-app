const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables
const envContent = fs.readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
const env = {};

envLines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function manualRLSFix() {
  try {
    console.log('Attempting manual RLS policy fix...');
    
    // First, let's try to disable RLS temporarily to fix the policies
    console.log('\n1. Attempting to disable RLS on workspace_users...');
    
    // Try using the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      },
      body: JSON.stringify({
        query: 'ALTER TABLE public.workspace_users DISABLE ROW LEVEL SECURITY;'
      })
    });
    
    if (response.ok) {
      console.log('✓ RLS disabled');
    } else {
      console.log('✗ Could not disable RLS:', await response.text());
    }
    
    // Now try to test the workspace_users table access
    console.log('\n2. Testing workspace_users access...');
    const { data: testData, error: testError } = await supabase
      .from('workspace_users')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('✗ Still getting error:', testError);
    } else {
      console.log('✓ Can access workspace_users:', testData?.length || 0, 'records');
    }
    
    // Try to re-enable RLS with fixed policies
    console.log('\n3. Re-enabling RLS with fixed policies...');
    
    const enableResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      },
      body: JSON.stringify({
        query: `
          ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;
          
          DROP POLICY IF EXISTS "workspace_users_select" ON public.workspace_users;
          CREATE POLICY "workspace_users_select" ON public.workspace_users 
          FOR SELECT USING (user_id = auth.uid());
          
          DROP POLICY IF EXISTS "workspace_users_insert" ON public.workspace_users;
          CREATE POLICY "workspace_users_insert" ON public.workspace_users 
          FOR INSERT WITH CHECK (user_id = auth.uid());
        `
      })
    });
    
    if (enableResponse.ok) {
      console.log('✓ RLS re-enabled with fixed policies');
    } else {
      console.log('✗ Could not re-enable RLS:', await enableResponse.text());
    }
    
    console.log('\n4. Final test...');
    const { data: finalData, error: finalError } = await supabase
      .from('workspace_users')
      .select('*')
      .limit(1);
    
    if (finalError) {
      console.log('✗ Still getting error:', finalError);
    } else {
      console.log('✓ Success! Can access workspace_users');
    }
    
  } catch (error) {
    console.error('Manual fix error:', error);
  }
}

manualRLSFix();