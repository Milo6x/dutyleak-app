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

async function fixWorkspaceUsers() {
  console.log('Getting profiles and workspaces...');
  
  const { data: profiles } = await supabase.from('profiles').select('*');
  const { data: workspaces } = await supabase.from('workspaces').select('*');
  
  console.log('Profiles:', profiles.length);
  console.log('Workspaces:', workspaces.length);
  
  // Create workspace_users records
  for (let i = 0; i < profiles.length && i < workspaces.length; i++) {
    const profile = profiles[i];
    const workspace = workspaces[i];
    
    console.log(`Creating workspace_user for ${profile.full_name} -> ${workspace.name}`);
    
    const { data, error } = await supabase
      .from('workspace_users')
      .insert({
        workspace_id: workspace.id,
        user_id: profile.id,
        role: 'admin'
      });
    
    if (error) {
      console.error('Error creating workspace_user:', error);
    } else {
      console.log('Successfully created workspace_user');
    }
  }
  
  // Verify the fix
  const { data: workspaceUsers } = await supabase.from('workspace_users').select('*');
  console.log('\nWorkspace users after fix:', workspaceUsers);
}

fixWorkspaceUsers().catch(console.error);