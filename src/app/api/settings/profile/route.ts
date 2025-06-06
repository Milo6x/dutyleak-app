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
    const { full_name, email } = body

    // Validate input
    if (typeof full_name !== 'string' && full_name !== null) {
      return NextResponse.json(
        { error: 'Invalid full_name format' },
        { status: 400 }
      )
    }

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: full_name?.trim() || null,
        updated_at: new Date().toISOString()
      })
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
        return NextResponse.json(
          { 
            profile: {
              ...profile,
              email: user.email
            },
            warning: 'Profile updated but email change failed. Please try again later.'
          },
          { status: 200 }
        )
      }
    }
    
    return NextResponse.json({
      profile: {
        ...profile,
        email: email || user.email
      },
      message: 'Profile updated successfully'
    })
    
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
      password: password
    })
    
    if (passwordError) {
      console.error('Error updating password:', passwordError)
      return NextResponse.json(
        { error: 'Failed to update password. Please check your current password.' },
        { status: 400 }
      )
    }
    
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