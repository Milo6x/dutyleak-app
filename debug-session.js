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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSession() {
  try {
    console.log('Checking current session...');
    
    // Try to get session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('Session data:', sessionData);
    console.log('Session error:', sessionError);
    
    if (sessionData?.session) {
      const userId = sessionData.session.user.id;
      console.log('\nUser ID from session:', userId);
      
      // Check workspace_users for this user
      const { data: workspaceUser, error: workspaceError } = await supabase
        .from('workspace_users')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      console.log('\nWorkspace user data:', workspaceUser);
      console.log('Workspace user error:', workspaceError);
    } else {
      console.log('\nNo active session found');
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugSession();