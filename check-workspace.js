const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local file manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
envLines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWorkspaces() {
  console.log('Checking workspace_users table...');
  const { data: workspaceUsers, error: workspaceUsersError } = await supabase
    .from('workspace_users')
    .select('*');
  
  console.log('Workspace users:', workspaceUsers);
  if (workspaceUsersError) console.log('Workspace users error:', workspaceUsersError);
  
  console.log('\nChecking workspaces table...');
  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('*');
  
  console.log('Workspaces:', workspaces);
  if (workspacesError) console.log('Workspaces error:', workspacesError);
  
  console.log('\nChecking profiles table...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');
  
  console.log('Profiles:', profiles);
  if (profilesError) console.log('Profiles error:', profilesError);
}

checkWorkspaces().catch(console.error);