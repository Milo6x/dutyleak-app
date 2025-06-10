#!/usr/bin/env node

/**
 * Permanent Solution: Fix Workspace Permissions
 * 
 * This script addresses the 403 Forbidden errors by ensuring users are properly
 * associated with workspaces in the workspace_users table.
 */

import { createClient } from '@supabase/supabase-js';

async function fixWorkspacePermissions() {
  console.log('🔧 Starting workspace permissions fix...');
  
  // Initialize Supabase client with service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  try {
    // Step 1: Get all users who don't have workspace associations
    console.log('📋 Checking for users without workspace associations...');
    
    const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;
    
    console.log(`Found ${allUsers.users.length} total users`);
    
    // Step 2: Check existing workspace associations
    const { data: existingAssociations, error: associationsError } = await supabase
      .from('workspace_users')
      .select('user_id, workspace_id, role');
    
    if (associationsError) throw associationsError;
    
    const associatedUserIds = new Set(existingAssociations.map(a => a.user_id));
    console.log(`Found ${existingAssociations.length} existing workspace associations`);
    
    // Step 3: Get or create default workspace
    let defaultWorkspace;
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('*')
      .limit(1);
    
    if (workspacesError) throw workspacesError;
    
    if (workspaces.length === 0) {
      console.log('🏢 Creating default workspace...');
      const { data: newWorkspace, error: createError } = await supabase
        .from('workspaces')
        .insert({
          name: 'Default Workspace',
          description: 'Auto-created default workspace for user access'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      defaultWorkspace = newWorkspace;
      console.log(`✅ Created default workspace: ${defaultWorkspace.id}`);
    } else {
      defaultWorkspace = workspaces[0];
      console.log(`✅ Using existing workspace: ${defaultWorkspace.id}`);
    }
    
    // Step 4: Associate unassociated users with the default workspace
    const unassociatedUsers = allUsers.users.filter(user => !associatedUserIds.has(user.id));
    console.log(`Found ${unassociatedUsers.length} users without workspace associations`);
    
    if (unassociatedUsers.length > 0) {
      console.log('👥 Adding users to default workspace...');
      
      const insertData = unassociatedUsers.map(user => ({
        user_id: user.id,
        workspace_id: defaultWorkspace.id,
        role: 'member' // Default role for auto-assigned users
      }));
      
      const { error: insertError } = await supabase
        .from('workspace_users')
        .insert(insertData);
      
      if (insertError) throw insertError;
      
      console.log(`✅ Successfully added ${unassociatedUsers.length} users to workspace`);
    }
    
    // Step 5: Verify the fix
    console.log('🔍 Verifying workspace associations...');
    
    const { data: finalAssociations, error: finalError } = await supabase
      .from('workspace_users')
      .select('user_id, workspace_id, role');
    
    if (finalError) throw finalError;
    
    console.log(`✅ Total workspace associations: ${finalAssociations.length}`);
    console.log('🎉 Workspace permissions fix completed successfully!');
    
    // Step 6: Display summary
    console.log('\n📊 Summary:');
    console.log(`   • Total users: ${allUsers.users.length}`);
    console.log(`   • Users with workspace access: ${finalAssociations.length}`);
    console.log(`   • Default workspace ID: ${defaultWorkspace.id}`);
    
  } catch (error) {
    console.error('❌ Error fixing workspace permissions:', error.message);
    process.exit(1);
  }
}

// Additional function to create a proper workspace setup for new users
async function createUserWorkspaceSetup() {
  console.log('\n🔧 Setting up proper user workspace flow...');
  
  const setupInstructions = `
📋 PERMANENT SOLUTION IMPLEMENTATION:

1. **Immediate Fix** (Run this script):
   node fix-workspace-permissions.js

2. **Long-term Solution** (Update signup flow):
   Update src/components/auth/signup-form.tsx to ensure:
   - Every new user gets added to workspace_users table
   - Default workspace is created if none exists
   - Proper error handling for workspace creation

3. **Authentication Middleware** (Update permissions):
   Update src/lib/permissions.ts to:
   - Handle users without workspace gracefully
   - Provide better error messages
   - Auto-assign users to default workspace if needed

4. **Database Constraints** (Add to Supabase):
   - Add RLS policies for workspace_users table
   - Ensure proper foreign key constraints
   - Add indexes for performance

5. **Monitoring** (Add logging):
   - Log workspace assignment events
   - Monitor 403 errors and auto-fix
   - Alert on permission failures
`;
  
  console.log(setupInstructions);
}

// Run the script if called directly
fixWorkspacePermissions()
  .then(() => createUserWorkspaceSetup())
  .catch(console.error);

export { fixWorkspacePermissions };