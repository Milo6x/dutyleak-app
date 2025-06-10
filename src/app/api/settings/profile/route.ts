import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, created_at, updated_at')
      .eq('id', user.id)
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching profile:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }
    
    // Return profile with user email
    return NextResponse.json({
      profile: {
        ...profile,
        email: user.email
      }
    })
    
  } catch (error) {
    console.error('Error in profile GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { full_name, email, avatar_url } = body // Added avatar_url

    // Validate input
    if (full_name !== undefined && typeof full_name !== 'string' && full_name !== null) {
      return NextResponse.json(
        { error: 'Invalid full_name format' },
        { status: 400 }
      )
    }
    if (avatar_url !== undefined && typeof avatar_url !== 'string' && avatar_url !== null) {
      return NextResponse.json(
        { error: 'Invalid avatar_url format' },
        { status: 400 }
      )
    }

    const profileUpdateData: { id: string; full_name?: string | null; avatar_url?: string | null; updated_at: string } = {
      id: user.id,
      updated_at: new Date().toISOString()
    };

    if (full_name !== undefined) {
      profileUpdateData.full_name = full_name?.trim() || null;
    }
    if (avatar_url !== undefined) {
      profileUpdateData.avatar_url = avatar_url || null;
    }

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .upsert(profileUpdateData)
      .select('id, full_name, avatar_url, created_at, updated_at')
      .single()
    
    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Handle email update if provided and different
    if (email && email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: email
      })
      
      if (emailError) {
        console.error('Error updating email:', emailError)
        // Log failed email update attempt
        await supabase.from('job_logs').insert({
          job_id: `profile_email_update_fail_${Date.now()}`,
          level: 'error',
          message: `User ${user.id} failed to update email.`,
          metadata: { user_id: user.id, new_email: email, error: emailError.message }
        });
        return NextResponse.json(
          { 
            profile: {
              ...profile,
              email: user.email // Return old email as update failed
            },
            warning: `Profile details updated, but email change failed: ${emailError.message}`
          },
          { status: 200 } // Success for profile update, but warning for email
        );
      }
      // Log successful email update attempt (Supabase handles confirmation)
      await supabase.from('job_logs').insert({
        job_id: `profile_email_update_success_${Date.now()}`,
        level: 'info',
        message: `User ${user.id} initiated email update to ${email}. Confirmation pending.`,
        metadata: { user_id: user.id, old_email: user.email, new_email: email }
      });
    }
    
    // Log successful profile update
    await supabase.from('job_logs').insert({
      job_id: `profile_update_${Date.now()}`,
      level: 'info',
      message: `User ${user.id} updated profile.`,
      metadata: { user_id: user.id, updated_fields: Object.keys(body) }
    });
    
    return NextResponse.json({
      profile: {
        ...profile,
        email: user.email // Email from auth store, update happens via confirmation
      },
      message: 'Profile updated successfully. If email was changed, please check your inbox for confirmation.'
    });
    
  } catch (error) {
    console.error('Error in profile PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { password, current_password } = body

    // Validate password change request
    if (!password || !current_password) {
      return NextResponse.json(
        { error: 'Both current_password and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Update password
    const { error: passwordError } = await supabase.auth.updateUser({
      password: password // Supabase updateUser doesn't use current_password for logged-in users
    })
    
    if (passwordError) {
      console.error('Error updating password:', passwordError)
      // Log failed password change attempt
      await supabase.from('job_logs').insert({
        job_id: `password_change_fail_${Date.now()}`,
        level: 'error',
        message: `User ${user.id} failed to change password.`,
        metadata: { user_id: user.id, error: passwordError.message }
      });
      return NextResponse.json(
        { error: passwordError.message || 'Failed to update password.' }, // Provide more specific error if available
        { status: 400 }
      )
    }
    
    // Log successful password change
    await supabase.from('job_logs').insert({
      job_id: `password_change_success_${Date.now()}`,
      level: 'info',
      message: `User ${user.id} successfully changed password.`,
      metadata: { user_id: user.id }
    });
    
    return NextResponse.json({
      message: 'Password updated successfully'
    })
    
  } catch (error) {
    console.error('Error in profile PATCH:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
