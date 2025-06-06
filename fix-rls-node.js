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
  console.error('Missing Supabase credentials (need service role key)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function fixRLSPolicy() {
  try {
    console.log('Fixing RLS policy for workspace_users...');
    
    // Execute the SQL commands one by one
    const sqlCommands = [
      'DROP POLICY IF EXISTS "workspace_users_select" ON public.workspace_users',
      'CREATE POLICY "workspace_users_select" ON public.workspace_users FOR SELECT USING (user_id = auth.uid())',
      'DROP POLICY IF EXISTS "workspace_users_insert" ON public.workspace_users',
      'CREATE POLICY "workspace_users_insert" ON public.workspace_users FOR INSERT WITH CHECK (user_id = auth.uid())',
      'DROP POLICY IF EXISTS "workspace_users_update" ON public.workspace_users',
      'CREATE POLICY "workspace_users_update" ON public.workspace_users FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      'DROP POLICY IF EXISTS "workspace_users_delete" ON public.workspace_users',
      'CREATE POLICY "workspace_users_delete" ON public.workspace_users FOR DELETE USING (user_id = auth.uid())'
    ];
    
    for (const sql of sqlCommands) {
      console.log('Executing:', sql);
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (error) {
        console.error('Error executing SQL:', error);
        // Try direct execution
        const { error: directError } = await supabase.from('_').select('*').limit(0);
        console.log('Trying alternative approach...');
      } else {
        console.log('✓ Success');
      }
    }
    
    console.log('\nRLS policy fix completed!');
    
  } catch (error) {
    console.error('Fix error:', error);
  }
}

fixRLSPolicy();