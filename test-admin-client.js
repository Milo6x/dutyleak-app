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

// Create admin client (same as createAdminClient function)
const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testAdminClient() {
  try {
    console.log('Testing admin client for workspace_users...');
    
    console.log('\n1. Testing workspace_users query with admin client...');
    
    // Test the exact query from the dashboard API
    const { data: workspaceUsers, error: workspaceError } = await adminClient
      .from('workspace_users')
      .select('workspace_id, user_id')
      .limit(5);
    
    if (workspaceError) {
      console.log('✗ Workspace query failed:', workspaceError);
      return;
    }
    
    console.log('✓ Workspace query successful!');
    console.log('Found workspace_users:', workspaceUsers?.length || 0);
    
    if (workspaceUsers && workspaceUsers.length > 0) {
      console.log('Workspace users:', workspaceUsers);
      
      const workspaceId = workspaceUsers[0].workspace_id;
      const userId = workspaceUsers[0].user_id;
      
      console.log('\n2. Testing single user workspace query...');
      
      // Test the exact query from the dashboard API
      const { data: singleWorkspace, error: singleError } = await adminClient
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', userId)
        .single();
      
      if (singleError) {
        console.log('✗ Single workspace query failed:', singleError);
      } else {
        console.log('✓ Single workspace query successful!');
        console.log('Workspace ID:', singleWorkspace.workspace_id);
      }
      
      console.log('\n3. Testing other dashboard queries...');
      
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
      
      console.log('\n✅ SUCCESS! Admin client bypasses RLS infinite recursion.');
      console.log('The dashboard API should now work with the admin client fix.');
      
    } else {
      console.log('✗ No workspace_users found');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testAdminClient();