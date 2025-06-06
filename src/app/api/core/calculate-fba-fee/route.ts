import { NextRequest, NextResponse } from 'next/server'
import { FbaFeeCalculator } from '@/lib/amazon/fba-fee-calculator'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { productId, dimensions, weight, category } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const calculator = new FbaFeeCalculator()
    let fbaFee = 0

    // Try to calculate using ASIN if available
    if (product.asin) {
      try {
        const result = await calculator.fetchFbaFeeByAsin(product.asin)
        fbaFee = result.fbaFee
      } catch (error) {
        console.warn('Failed to get FBA fee by ASIN, falling back to calculation:', error)
      }
    }

    // If ASIN lookup failed or no ASIN, calculate using dimensions
    if (fbaFee === 0) {
      const productOptions = {
        dimensions: {
          length: dimensions?.length || product.dimensions_length || 0,
          width: dimensions?.width || product.dimensions_width || 0,
          height: dimensions?.height || product.dimensions_height || 0,
          unit: 'in' as const
        },
        weight: {
          value: weight || product.weight || 0,
          unit: 'lb' as const
        },
        category: category || product.category || 'Other'
      }

      const result = calculator.calculate(productOptions)
      fbaFee = result.fbaFee
    }

    // Update product with calculated FBA fee if it's different
    if (Math.abs((product.fba_fee_estimate_usd || 0) - fbaFee) > 0.01) {
      await supabase
        .from('products')
        .update({ 
          fba_fee_estimate_usd: fbaFee,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
    }

    return NextResponse.json({
      fbaFee: Math.round(fbaFee * 100) / 100, // Round to 2 decimal places
      calculationMethod: product.asin && fbaFee > 0 ? 'asin' : 'dimensions',
      productId
    })

  } catch (error) {
    console.error('FBA fee calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}