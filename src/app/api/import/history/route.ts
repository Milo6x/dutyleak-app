import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type') // csv_import, bulk_operation, etc.
    
    let query = supabase
      .from('import_history')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (type) {
      query = query.eq('type', type)
    }
    
    const { data: imports, error } = await query
    
    if (error) {
      console.error('Import history fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch import history' },
        { status: 500 }
      )
    }
    
    // Get total count for pagination
    let countQuery = supabase
      .from('import_history')
      .select('*', { count: 'exact', head: true })
    
    if (type) {
      countQuery = countQuery.eq('type', type)
    }
    
    const { count, error: countError } = await countQuery
    
    if (countError) {
      console.error('Import history count error:', countError)
      return NextResponse.json(
        { error: 'Failed to get import history count' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      imports,
      total: count || 0,
      limit,
      offset
    })
    
  } catch (error) {
    console.error('Import history API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()
    
    const importRecord = await request.json()
    
    const { data, error } = await supabase
      .from('import_history')
      .insert({
        ...importRecord,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Import history creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create import history record' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Import history creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}