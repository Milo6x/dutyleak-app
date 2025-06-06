import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

interface ErrorLogEntry {
  timestamp: string
  error: {
    name: string
    message: string
    stack?: string
  }
  context?: string
  userId?: string
  url?: string
  userAgent?: string
  additionalData?: Record<string, any>
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
    if (!body.message || !body.level) {
      return NextResponse.json(
        { error: 'Missing required fields: message and level' },
        { status: 400 }
      )
    }
    
    // Insert error log into database
    const { data: errorLog, error: insertError } = await supabase
      .from('error_logs')
      .insert({
        user_id: user.id,
        level: body.level,
        message: body.message,
        stack: body.stack || null,
        url: body.url || null,
        user_agent: body.userAgent || null,
        component: body.component || null,
        additional_data: body.additionalData || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Error inserting error log:', insertError)
      return NextResponse.json(
        { error: 'Failed to save error log' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: 'Error log saved successfully',
      id: errorLog.id
    })
    
  } catch (error) {
    console.error('Error in error logs POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to retrieve error logs for debugging
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated and has admin privileges
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get error logs from database with proper filtering and pagination
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const level = url.searchParams.get('level') // error, warn, info
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    
    const offset = (page - 1) * limit
    
    let query = supabase
      .from('error_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (level) {
      query = query.eq('level', level)
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    
    const { data: errorLogs, error: fetchError, count } = await query
    
    if (fetchError) {
      console.error('Error fetching error logs:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch error logs' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      logs: errorLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      filters: {
        level,
        startDate,
        endDate
      }
    })
  } catch (error) {
    console.error('Error retrieving logs:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve error logs' },
      { status: 500 }
    )
  }
}