import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()

    // Get user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const timeFilter = searchParams.get('timeFilter') || 'all'
    const sizeTier = searchParams.get('sizeTier')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build base query from products table with FBA fee estimates
    const baseQuery = supabase.from('products')
    let query = baseQuery.select(`
        id,
        title,
        asin,
        fba_fee_estimate_usd,
        cost,
        category,
        subcategory,
        created_at,
        updated_at,
        dimensions_height,
        dimensions_length,
        dimensions_width,
        weight,
        created_at,
        updated_at
      `)
      .eq('workspace_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply product filter
    if (productId) {
      query = query.eq('id', productId)
    }

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date()
      const days = parseInt(timeFilter.replace('d', '').replace('y', '')) * (timeFilter.includes('y') ? 365 : 1)
      const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
      query = query.gte('updated_at', cutoffDate.toISOString())
    }

    // Apply category filter (instead of size tier)
    if (sizeTier && sizeTier !== 'all') {
      query = query.eq('category', sizeTier)
    }

    const { data: historyData, error: historyError } = await query

    if (historyError) {
      console.error('FBA history fetch error:', historyError)
      return NextResponse.json({ error: 'Failed to fetch FBA fee history' }, { status: 500 })
    }

    // Transform data to match frontend interface
    const history = (historyData || []).map(entry => ({
      id: entry.id,
      productId: entry.id,
      productName: entry.title,
      asin: entry.asin,
      fulfillmentFee: entry.fba_fee_estimate_usd || 0,
      storageFee: 0, // Not available in products table
      referralFee: 0, // Not available in products table
      totalFee: entry.fba_fee_estimate_usd || 0,
      sizeTier: entry.category || 'Unknown',
      calculatedAt: entry.updated_at,
      dimensions: {
        length: entry.dimensions_length || 0,
        width: entry.dimensions_width || 0,
        height: entry.dimensions_height || 0,
        weight: entry.weight || 0
      },
      category: entry.category,
      productPrice: entry.cost || 0
    }))

    // Calculate summary statistics
    const summary = calculateFeeSummary(history)

    return NextResponse.json({
      success: true,
      history,
      summary,
      pagination: {
        limit,
        offset,
        total: history.length
      }
    })

  } catch (error) {
    console.error('FBA history API error:', error)
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

    // Get user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      productId,
      productName,
      asin,
      fulfillmentFee,
      storageFee,
      referralFee,
      totalFee,
      sizeTier,
      dimensions,
      category,
      productPrice
    } = body

    // Validate required fields
    if (!productId || !productName || !asin) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, productName, asin' },
        { status: 400 }
      )
    }

    // Update product FBA fee estimate
    const { data: newEntry, error: insertError } = await supabase
      .from('products')
      .update({
        fba_fee_estimate_usd: totalFee || (fulfillmentFee + storageFee + referralFee),
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .eq('workspace_id', user.id)
      .select()
      .single()

    if (insertError) {
      console.error('FBA history creation error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create FBA fee history entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      entry: {
        id: newEntry.id,
        productId: newEntry.id,
        productName: newEntry.title,
        asin: newEntry.asin,
        fulfillmentFee: newEntry.fba_fee_estimate_usd || 0,
        storageFee: 0,
        referralFee: 0,
        totalFee: newEntry.fba_fee_estimate_usd || 0,
        sizeTier: newEntry.category,
        calculatedAt: newEntry.updated_at,
        dimensions: {
          length: newEntry.dimensions_length,
          width: newEntry.dimensions_width,
          height: newEntry.dimensions_height,
          weight: newEntry.weight
        },
        category: newEntry.category,
        productPrice: newEntry.cost
      }
    })

  } catch (error) {
    console.error('FBA history POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()

    // Get user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('id')

    if (!entryId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    // Delete FBA fee history entry
    // Reset FBA fee estimate for the product
    const { error: deleteError } = await supabase
      .from('products')
      .update({
        fba_fee_estimate_usd: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .eq('workspace_id', user.id)

    if (deleteError) {
      console.error('FBA fee reset error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to reset FBA fee estimate' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'FBA fee estimate reset successfully'
    })

  } catch (error) {
    console.error('FBA history DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateFeeSummary(history: any[]) {
  if (history.length === 0) {
    return {
      totalEntries: 0,
      averageFulfillmentFee: 0,
      averageStorageFee: 0,
      averageReferralFee: 0,
      averageTotalFee: 0,
      totalFees: 0,
      sizeTierDistribution: {},
      categoryDistribution: {},
      trends: {
        fulfillmentFee: 0,
        storageFee: 0,
        referralFee: 0,
        totalFee: 0
      }
    }
  }

  const totalEntries = history.length
  const totalFulfillmentFee = history.reduce((sum, entry) => sum + (entry.fulfillmentFee || 0), 0)
  const totalStorageFee = history.reduce((sum, entry) => sum + (entry.storageFee || 0), 0)
  const totalReferralFee = history.reduce((sum, entry) => sum + (entry.referralFee || 0), 0)
  const totalFees = history.reduce((sum, entry) => sum + (entry.totalFee || 0), 0)

  // Calculate size tier distribution
  const sizeTierDistribution: { [key: string]: number } = {}
  history.forEach(entry => {
    const tier = entry.sizeTier || 'Unknown'
    sizeTierDistribution[tier] = (sizeTierDistribution[tier] || 0) + 1
  })

  // Calculate category distribution
  const categoryDistribution: { [key: string]: number } = {}
  history.forEach(entry => {
    const category = entry.category || 'Unknown'
    categoryDistribution[category] = (categoryDistribution[category] || 0) + 1
  })

  // Calculate trends (compare recent vs older entries)
  const midpoint = Math.floor(history.length / 2)
  const recentEntries = history.slice(0, midpoint)
  const olderEntries = history.slice(midpoint)

  const recentAvgFulfillment = recentEntries.length > 0 
    ? recentEntries.reduce((sum, e) => sum + (e.fulfillmentFee || 0), 0) / recentEntries.length 
    : 0
  const olderAvgFulfillment = olderEntries.length > 0 
    ? olderEntries.reduce((sum, e) => sum + (e.fulfillmentFee || 0), 0) / olderEntries.length 
    : 0

  const recentAvgStorage = recentEntries.length > 0 
    ? recentEntries.reduce((sum, e) => sum + (e.storageFee || 0), 0) / recentEntries.length 
    : 0
  const olderAvgStorage = olderEntries.length > 0 
    ? olderEntries.reduce((sum, e) => sum + (e.storageFee || 0), 0) / olderEntries.length 
    : 0

  const recentAvgReferral = recentEntries.length > 0 
    ? recentEntries.reduce((sum, e) => sum + (e.referralFee || 0), 0) / recentEntries.length 
    : 0
  const olderAvgReferral = olderEntries.length > 0 
    ? olderEntries.reduce((sum, e) => sum + (e.referralFee || 0), 0) / olderEntries.length 
    : 0

  const recentAvgTotal = recentEntries.length > 0 
    ? recentEntries.reduce((sum, e) => sum + (e.totalFee || 0), 0) / recentEntries.length 
    : 0
  const olderAvgTotal = olderEntries.length > 0 
    ? olderEntries.reduce((sum, e) => sum + (e.totalFee || 0), 0) / olderEntries.length 
    : 0

  return {
    totalEntries,
    averageFulfillmentFee: totalFulfillmentFee / totalEntries,
    averageStorageFee: totalStorageFee / totalEntries,
    averageReferralFee: totalReferralFee / totalEntries,
    averageTotalFee: totalFees / totalEntries,
    totalFees,
    sizeTierDistribution,
    categoryDistribution,
    trends: {
      fulfillmentFee: olderAvgFulfillment > 0 ? ((recentAvgFulfillment - olderAvgFulfillment) / olderAvgFulfillment) * 100 : 0,
      storageFee: olderAvgStorage > 0 ? ((recentAvgStorage - olderAvgStorage) / olderAvgStorage) * 100 : 0,
      referralFee: olderAvgReferral > 0 ? ((recentAvgReferral - olderAvgReferral) / olderAvgReferral) * 100 : 0,
      totalFee: olderAvgTotal > 0 ? ((recentAvgTotal - olderAvgTotal) / olderAvgTotal) * 100 : 0
    }
  }
}