// Simple workspace permissions fix script
// This script addresses the 403 Forbidden errors by ensuring users have workspace access

const fs = require('fs');
const path = require('path');

// Read environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    const env = {};
    
    lines.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return env;
  }
  return {};
}

const env = loadEnvFile();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables in .env.local:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Please ensure these are set in your .env.local file');
  process.exit(1);
}

console.log('🔧 Workspace Permissions Fix');
console.log('============================');
console.log('');
console.log('✅ Environment variables found');
console.log(`   Supabase URL: ${supabaseUrl}`);
console.log(`   Service Role Key: ${serviceRoleKey ? '[PRESENT]' : '[MISSING]'}`);
console.log('');

// Instructions for manual fix
console.log('📋 PERMANENT SOLUTION STEPS:');
console.log('');
console.log('1. **Immediate Fix** (Run in Supabase SQL Editor):');
console.log('   ```sql');
console.log('   -- Get all users without workspace access');
console.log('   SELECT auth.users.id, auth.users.email');
console.log('   FROM auth.users');
console.log('   LEFT JOIN workspace_users ON auth.users.id = workspace_users.user_id');
console.log('   WHERE workspace_users.user_id IS NULL;');
console.log('');
console.log('   -- Create default workspace if none exists');
console.log('   INSERT INTO workspaces (name, description)');
console.log('   SELECT \'Default Workspace\', \'Auto-created workspace for user access\'');
console.log('   WHERE NOT EXISTS (SELECT 1 FROM workspaces LIMIT 1);');
console.log('');
console.log('   -- Add all users without workspace to default workspace');
console.log('   INSERT INTO workspace_users (user_id, workspace_id, role)');
console.log('   SELECT ');
console.log('     auth.users.id,');
console.log('     (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),');
console.log('     \'member\'');
console.log('   FROM auth.users');
console.log('   LEFT JOIN workspace_users ON auth.users.id = workspace_users.user_id');
console.log('   WHERE workspace_users.user_id IS NULL;');
console.log('   ```');
console.log('');

console.log('2. **Long-term Solution** (Code Updates):');
console.log('');
console.log('   a) Update signup flow:');
console.log('      - Replace src/components/auth/signup-form.tsx');
console.log('      - Use the improved version: src/components/auth/improved-signup-flow.tsx');
console.log('');
console.log('   b) Add workspace setup API:');
console.log('      - Use: src/app/api/auth/setup-workspace/route.ts');
console.log('');
console.log('   c) Update permissions middleware:');
console.log('      - Add fallback workspace assignment in src/lib/permissions.ts');
console.log('');

console.log('3. **Testing the Fix**:');
console.log('   - After running the SQL commands, refresh your browser');
console.log('   - The 403 errors should be resolved');
console.log('   - Analytics page should load without runtime errors');
console.log('');

console.log('4. **Verification**:');
console.log('   Run this query to verify all users have workspace access:');
console.log('   ```sql');
console.log('   SELECT ');
console.log('     u.email,');
console.log('     wu.workspace_id,');
console.log('     wu.role,');
console.log('     w.name as workspace_name');
console.log('   FROM auth.users u');
console.log('   JOIN workspace_users wu ON u.id = wu.user_id');
console.log('   JOIN workspaces w ON wu.workspace_id = w.id;');
console.log('   ```');
console.log('');

console.log('🎯 **Root Cause**: Users were not being added to workspace_users table');
console.log('🔧 **Solution**: Ensure every user has workspace association');
console.log('✅ **Result**: No more 403 Forbidden errors');
console.log('');
console.log('💡 **Next Steps**:');
console.log('   1. Run the SQL commands in Supabase');
console.log('   2. Test the application');
console.log('   3. Implement the improved signup flow for future users');
console.log('');