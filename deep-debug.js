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
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const adminSupabase = serviceKey ? createClient(supabaseUrl, serviceKey) : null;

async function deepDebug() {
  try {
    console.log('=== DEEP DEBUG SESSION ===\n');
    
    // 1. Check all users in auth.users
    console.log('1. Checking auth.users table...');
    if (adminSupabase) {
      const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();
      console.log('Auth users:', authUsers?.users?.length || 0);
      authUsers?.users?.forEach((user, i) => {
        console.log(`  User ${i + 1}: ${user.id} - ${user.email}`);
      });
      if (authError) console.log('Auth error:', authError);
    } else {
      console.log('  No service key - skipping auth.users check');
    }
    
    // 2. Check profiles table
    console.log('\n2. Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    console.log('Profiles count:', profiles?.length || 0);
    profiles?.forEach((profile, i) => {
      console.log(`  Profile ${i + 1}: ${profile.id} - ${profile.full_name}`);
    });
    if (profilesError) console.log('Profiles error:', profilesError);
    
    // 3. Check workspaces table
    console.log('\n3. Checking workspaces table...');
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('*');
    console.log('Workspaces count:', workspaces?.length || 0);
    workspaces?.forEach((workspace, i) => {
      console.log(`  Workspace ${i + 1}: ${workspace.id} - ${workspace.name}`);
    });
    if (workspacesError) console.log('Workspaces error:', workspacesError);
    
    // 4. Check workspace_users table
    console.log('\n4. Checking workspace_users table...');
    const { data: workspaceUsers, error: workspaceUsersError } = await supabase
      .from('workspace_users')
      .select('*');
    console.log('Workspace users count:', workspaceUsers?.length || 0);
    workspaceUsers?.forEach((wu, i) => {
      console.log(`  WU ${i + 1}: user_id=${wu.user_id}, workspace_id=${wu.workspace_id}, role=${wu.role}`);
    });
    if (workspaceUsersError) console.log('Workspace users error:', workspaceUsersError);
    
    // 5. Check current session
    console.log('\n5. Checking current session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('Session exists:', !!sessionData?.session);
    if (sessionData?.session) {
      console.log('Session user ID:', sessionData.session.user.id);
      console.log('Session user email:', sessionData.session.user.email);
      
      // 6. Check workspace for current user
      console.log('\n6. Checking workspace for current user...');
      const { data: userWorkspace, error: userWorkspaceError } = await supabase
        .from('workspace_users')
        .select('workspace_id, role')
        .eq('user_id', sessionData.session.user.id)
        .single();
      
      console.log('User workspace data:', userWorkspace);
      if (userWorkspaceError) console.log('User workspace error:', userWorkspaceError);
      
      if (userWorkspace?.workspace_id) {
        const { data: workspace, error: wsError } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', userWorkspace.workspace_id)
          .single();
        console.log('Workspace details:', workspace);
        if (wsError) console.log('Workspace fetch error:', wsError);
      }
    } else {
      console.log('No active session');
      if (sessionError) console.log('Session error:', sessionError);
    }
    
    // 7. Test API endpoint directly
    console.log('\n7. Testing dashboard stats API...');
    try {
      const response = await fetch('http://localhost:3000/api/dashboard/stats');
      const result = await response.text();
      console.log('API Response status:', response.status);
      console.log('API Response:', result);
    } catch (apiError) {
      console.log('API Error:', apiError.message);
    }
    
    // 8. Check RLS policies
    console.log('\n8. Checking RLS policies...');
    if (adminSupabase) {
      const { data: policies, error: policiesError } = await adminSupabase
        .from('information_schema.table_privileges')
        .select('*')
        .eq('table_name', 'workspace_users');
      console.log('Policies check:', policies?.length || 0, 'entries');
      if (policiesError) console.log('Policies error:', policiesError);
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('Deep debug error:', error);
  }
}

deepDebug();