import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface DutyRuleRequest {
  classificationId: string
  countryCode: string
  originCountryCode?: string
  dutyPercentage: number
  vatPercentage: number
  tradeAgreement?: string
  preferentialRate?: number
  additionalFees?: Record<string, any>
  ruleSource?: 'manual' | 'api' | 'ml' | 'government'
  confidenceScore?: number
  effectiveDate?: string
  expiryDate?: string
  notes?: string
}

export interface DutyRuleQuery {
  hsCode?: string
  countryCode?: string
  originCountryCode?: string
  tradeAgreement?: string
  effectiveDate?: string
  includeExpired?: boolean
  limit?: number
  offset?: number
}

// GET - Retrieve duty rules with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query: DutyRuleQuery = {
      hsCode: searchParams.get('hsCode') || undefined,
      countryCode: searchParams.get('countryCode') || undefined,
      originCountryCode: searchParams.get('originCountryCode') || undefined,
      tradeAgreement: searchParams.get('tradeAgreement') || undefined,
      effectiveDate: searchParams.get('effectiveDate') || undefined,
      includeExpired: searchParams.get('includeExpired') === 'true',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    }

    let dbQuery = supabase
      .from('duty_rates_view')
      .select('*')
      .limit(query.limit!)
      .range(query.offset!, query.offset! + query.limit! - 1)

    // Apply filters
    if (query.countryCode) {
      dbQuery = dbQuery.eq('country_code', query.countryCode)
    }

    if (query.originCountryCode) {
      dbQuery = dbQuery.eq('origin_country_code', query.originCountryCode)
    }

    if (query.tradeAgreement) {
      dbQuery = dbQuery.eq('trade_agreement', query.tradeAgreement)
    }

    if (query.hsCode) {
      if (query.hsCode.length === 6) {
        dbQuery = dbQuery.eq('hs6', query.hsCode)
      } else if (query.hsCode.length === 8) {
        dbQuery = dbQuery.eq('hs8', query.hsCode)
      } else {
        dbQuery = dbQuery.or(`hs6.like.${query.hsCode}%,hs8.like.${query.hsCode}%`)
      }
    }

    if (query.effectiveDate) {
      dbQuery = dbQuery.lte('effective_date', query.effectiveDate)
    }

    if (!query.includeExpired) {
      dbQuery = dbQuery.or('expiry_date.is.null,expiry_date.gt.now()')
    }

    const { data, error, count } = await dbQuery

    if (error) {
      console.error('Error fetching duty rules:', error)
      return NextResponse.json(
        { error: 'Failed to fetch duty rules', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      count,
      query,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: data.length === query.limit
      }
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/duty-rules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new duty rule
export async function POST(request: NextRequest) {
  try {
    const body: DutyRuleRequest = await request.json()

    // Validate required fields
    if (!body.classificationId || !body.countryCode || body.dutyPercentage === undefined || body.vatPercentage === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: classificationId, countryCode, dutyPercentage, vatPercentage' },
        { status: 400 }
      )
    }

    // Check if classification exists
    const { data: classification, error: classError } = await supabase
      .from('classifications')
      .select('id')
      .eq('id', body.classificationId)
      .single()

    if (classError || !classification) {
      return NextResponse.json(
        { error: 'Invalid classification ID' },
        { status: 400 }
      )
    }

    // Prepare duty rule data
    const dutyRuleData = {
      classification_id: body.classificationId,
      country_code: body.countryCode,
      origin_country_code: body.originCountryCode,
      duty_percentage: body.dutyPercentage,
      vat_percentage: body.vatPercentage,
      trade_agreement: body.tradeAgreement,
      preferential_rate: body.preferentialRate,
      additional_fees: body.additionalFees || {},
      rule_source: body.ruleSource || 'manual',
      confidence_score: body.confidenceScore || 0.8,
      effective_date: body.effectiveDate || new Date().toISOString(),
      expiry_date: body.expiryDate,
      notes: body.notes
    }

    const { data, error } = await supabase
      .from('duty_rates')
      .insert(dutyRuleData)
      .select()
      .single()

    if (error) {
      console.error('Error creating duty rule:', error)
      return NextResponse.json(
        { error: 'Failed to create duty rule', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/duty-rules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update existing duty rule
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing duty rule ID' },
        { status: 400 }
      )
    }

    const body: Partial<DutyRuleRequest> = await request.json()

    // Prepare update data
    const updateData: any = {}
    
    if (body.dutyPercentage !== undefined) {updateData.duty_percentage = body.dutyPercentage}
    if (body.vatPercentage !== undefined) {updateData.vat_percentage = body.vatPercentage}
    if (body.originCountryCode !== undefined) {updateData.origin_country_code = body.originCountryCode}
    if (body.tradeAgreement !== undefined) {updateData.trade_agreement = body.tradeAgreement}
    if (body.preferentialRate !== undefined) {updateData.preferential_rate = body.preferentialRate}
    if (body.additionalFees !== undefined) {updateData.additional_fees = body.additionalFees}
    if (body.ruleSource !== undefined) {updateData.rule_source = body.ruleSource}
    if (body.confidenceScore !== undefined) {updateData.confidence_score = body.confidenceScore}
    if (body.effectiveDate !== undefined) {updateData.effective_date = body.effectiveDate}
    if (body.expiryDate !== undefined) {updateData.expiry_date = body.expiryDate}
    if (body.notes !== undefined) {updateData.notes = body.notes}

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('duty_rates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating duty rule:', error)
      return NextResponse.json(
        { error: 'Failed to update duty rule', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Duty rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in PUT /api/duty-rules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove duty rule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing duty rule ID' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('duty_rates')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting duty rule:', error)
      return NextResponse.json(
        { error: 'Failed to delete duty rule', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Duty rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Duty rule deleted successfully', data })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/duty-rules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}