import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's notification settings
    const { data: settings, error: fetchError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching notification settings:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch notification settings' },
        { status: 500 }
      )
    }
    
    // Return default settings if none exist
    const defaultSettings = {
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      marketing_emails: false,
      security_alerts: true,
      product_updates: true,
      weekly_digest: true
    }
    
    return NextResponse.json({
      settings: settings || defaultSettings
    })
    
  } catch (error) {
    console.error('Error in notification settings GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    const validSettings = {
      email_notifications: Boolean(body.email_notifications),
      push_notifications: Boolean(body.push_notifications),
      sms_notifications: Boolean(body.sms_notifications),
      marketing_emails: Boolean(body.marketing_emails),
      security_alerts: Boolean(body.security_alerts),
      product_updates: Boolean(body.product_updates),
      weekly_digest: Boolean(body.weekly_digest)
    }
    
    // Upsert notification settings
    const { data: settings, error: upsertError } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: user.id,
        ...validSettings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()
    
    if (upsertError) {
      console.error('Error saving notification settings:', upsertError)
      return NextResponse.json(
        { error: 'Failed to save notification settings' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: 'Notification settings saved successfully',
      settings
    })
    
  } catch (error) {
    console.error('Error in notification settings POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}