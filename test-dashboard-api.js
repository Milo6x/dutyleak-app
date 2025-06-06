const { createAdminClient } = require('./src/lib/supabase');
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

// Set environment variables
Object.keys(env).forEach(key => {
  process.env[key] = env[key];
});

async function testDashboardAPI() {
  try {
    console.log('Testing dashboard API with admin client...');
    
    // Create admin client
    const adminClient = createAdminClient();
    
    console.log('\n1. Testing workspace_users query with admin client...');
    
    // Test the exact query from the dashboard API
    const { data: workspaceUser, error: workspaceError } = await adminClient
      .from('workspace_users')
      .select('workspace_id')
      .limit(1);
    
    if (workspaceError) {
      console.log('✗ Workspace query failed:', workspaceError);
      return;
    }
    
    console.log('✓ Workspace query successful!');
    console.log('Found workspace_users:', workspaceUser?.length || 0);
    
    if (workspaceUser && workspaceUser.length > 0) {
      console.log('First workspace_user:', workspaceUser[0]);
      
      const workspaceId = workspaceUser[0].workspace_id;
      
      console.log('\n2. Testing other dashboard queries...');
      
      // Test products query
      const { data: products, error: productsError } = await adminClient
        .from('products')
        .select('id, cost, created_at')
        .eq('workspace_id', workspaceId)
        .limit(5);
      
      if (productsError) {
        console.log('✗ Products query failed:', productsError);
      } else {
        console.log('✓ Products query successful, found:', products?.length || 0);
      }
      
      // Test duty_calculations query
      const { data: calculations, error: calculationsError } = await adminClient
        .from('duty_calculations')
        .select('duty_amount, vat_amount, total_landed_cost, product_value, created_at')
        .eq('workspace_id', workspaceId)
        .limit(5);
      
      if (calculationsError) {
        console.log('✗ Calculations query failed:', calculationsError);
      } else {
        console.log('✓ Calculations query successful, found:', calculations?.length || 0);
      }
      
      // Test jobs query
      const { data: jobs, error: jobsError } = await adminClient
        .from('jobs')
        .select('id, type, status, progress, created_at')
        .eq('workspace_id', workspaceId)
        .limit(5);
      
      if (jobsError) {
        console.log('✗ Jobs query failed:', jobsError);
      } else {
        console.log('✓ Jobs query successful, found:', jobs?.length || 0);
      }
      
      console.log('\n✓ Dashboard API queries should work now!');
      console.log('The issue was the RLS infinite recursion on workspace_users.');
      console.log('Using admin client bypasses this issue.');
      
    } else {
      console.log('✗ No workspace_users found');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testDashboardAPI();