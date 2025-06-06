import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface DutyCalculationRequest {
  hsCode: string
  destinationCountry: string
  originCountry?: string
  tradeAgreement?: string
  effectiveDate?: string
  productValue?: number
  weight?: number
  includeAdditionalFees?: boolean
}

export interface DutyCalculationResult {
  dutyRate: number
  vatRate: number
  preferentialTreatment: boolean
  tradeAgreementApplied?: string
  confidence: number
  calculatedAmounts?: {
    dutyAmount: number
    vatAmount: number
    additionalFees: Record<string, number>
    totalTax: number
    totalLandedCost: number
  }
  ruleDetails?: {
    ruleSource: string
    effectiveDate: string
    expiryDate?: string
    notes?: string
  }
  recommendations?: string[]
}

// POST - Calculate effective duty rate
export async function POST(request: NextRequest) {
  try {
    const body: DutyCalculationRequest = await request.json()

    // Validate required fields
    if (!body.hsCode || !body.destinationCountry) {
      return NextResponse.json(
        { error: 'Missing required fields: hsCode, destinationCountry' },
        { status: 400 }
      )
    }

    // Validate HS code format
    if (!/^\d{6,10}$/.test(body.hsCode)) {
      return NextResponse.json(
        { error: 'Invalid HS code format. Must be 6-10 digits.' },
        { status: 400 }
      )
    }

    // Validate country codes
    if (!/^[A-Z]{2}$/.test(body.destinationCountry)) {
      return NextResponse.json(
        { error: 'Invalid destination country code. Must be 2-letter ISO code.' },
        { status: 400 }
      )
    }

    if (body.originCountry && !/^[A-Z]{2}$/.test(body.originCountry)) {
      return NextResponse.json(
        { error: 'Invalid origin country code. Must be 2-letter ISO code.' },
        { status: 400 }
      )
    }

    const effectiveDate = body.effectiveDate || new Date().toISOString().split('T')[0]

    // Call the database function to get effective duty rate
    const { data: rateData, error: rateError } = await supabase
      .rpc('get_effective_duty_rate', {
        p_hs_code: body.hsCode,
        p_destination_country: body.destinationCountry,
        p_origin_country: body.originCountry || null,
        p_trade_agreement: body.tradeAgreement || null,
        p_effective_date: effectiveDate
      })

    if (rateError) {
      console.error('Error calculating duty rate:', rateError)
      return NextResponse.json(
        { error: 'Failed to calculate duty rate', details: rateError.message },
        { status: 500 }
      )
    }

    if (!rateData || rateData.length === 0) {
      return NextResponse.json(
        { error: 'No duty rate found for the specified criteria' },
        { status: 404 }
      )
    }

    const rate = rateData[0]
    const result: DutyCalculationResult = {
      dutyRate: rate.duty_rate,
      vatRate: rate.vat_rate,
      preferentialTreatment: rate.preferential_treatment,
      tradeAgreementApplied: rate.trade_agreement_applied,
      confidence: rate.confidence
    }

    // Get additional rule details if needed
    if (body.includeAdditionalFees || body.productValue) {
      const { data: ruleDetails, error: detailsError } = await supabase
        .from('duty_rates_view')
        .select('*')
        .eq('country_code', body.destinationCountry)
        .or(`hs6.eq.${body.hsCode.substring(0, 6)},hs8.eq.${body.hsCode}`)
        .lte('effective_date', effectiveDate)
        .or('expiry_date.is.null,expiry_date.gt.' + effectiveDate)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single()

      if (!detailsError && ruleDetails) {
        result.ruleDetails = {
          ruleSource: ruleDetails.rule_source,
          effectiveDate: ruleDetails.effective_date,
          expiryDate: ruleDetails.expiry_date,
          notes: ruleDetails.notes
        }

        // Calculate amounts if product value is provided
        if (body.productValue && body.productValue > 0) {
          const dutyAmount = (body.productValue * result.dutyRate) / 100
          const dutyableValue = body.productValue + dutyAmount
          const vatAmount = (dutyableValue * result.vatRate) / 100
          
          const additionalFees: Record<string, number> = {}
          let totalAdditionalFees = 0

          // Calculate additional fees from rule details
          if (ruleDetails.additional_fees && typeof ruleDetails.additional_fees === 'object') {
            const fees = ruleDetails.additional_fees as Record<string, any>
            
            for (const [feeType, feeConfig] of Object.entries(fees)) {
              let feeAmount = 0
              
              if (typeof feeConfig === 'object' && feeConfig !== null) {
                if (feeConfig.fixed) {
                  feeAmount += feeConfig.fixed
                }
                if (feeConfig.percentage && body.productValue) {
                  feeAmount += (body.productValue * feeConfig.percentage) / 100
                }
                if (feeConfig.rate && body.productValue) {
                  const calculatedFee = (body.productValue * feeConfig.rate) / 100
                  if (feeConfig.min) {
                    feeAmount += Math.max(calculatedFee, feeConfig.min)
                  } else if (feeConfig.max) {
                    feeAmount += Math.min(calculatedFee, feeConfig.max)
                  } else {
                    feeAmount += calculatedFee
                  }
                }
              } else if (typeof feeConfig === 'number') {
                feeAmount = feeConfig
              }
              
              additionalFees[feeType] = Math.round(feeAmount * 100) / 100
              totalAdditionalFees += feeAmount
            }
          }

          result.calculatedAmounts = {
            dutyAmount: Math.round(dutyAmount * 100) / 100,
            vatAmount: Math.round(vatAmount * 100) / 100,
            additionalFees,
            totalTax: Math.round((dutyAmount + vatAmount + totalAdditionalFees) * 100) / 100,
            totalLandedCost: Math.round((body.productValue + dutyAmount + vatAmount + totalAdditionalFees) * 100) / 100
          }
        }
      }
    }

    // Generate recommendations
    result.recommendations = generateRecommendations(body, result)

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Unexpected error in POST /api/duty-rules/calculate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get available trade agreements for country pairs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const originCountry = searchParams.get('originCountry')
    const destinationCountry = searchParams.get('destinationCountry')

    if (!originCountry || !destinationCountry) {
      return NextResponse.json(
        { error: 'Missing required parameters: originCountry, destinationCountry' },
        { status: 400 }
      )
    }

    // Get applicable trade agreements
    const { data: agreements, error } = await supabase
      .from('trade_agreements')
      .select('*')
      .contains('countries', [originCountry])
      .contains('countries', [destinationCountry])
      .lte('effective_date', new Date().toISOString().split('T')[0])
      .or('expiry_date.is.null,expiry_date.gt.' + new Date().toISOString().split('T')[0])

    if (error) {
      console.error('Error fetching trade agreements:', error)
      return NextResponse.json(
        { error: 'Failed to fetch trade agreements', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: agreements || [] })
  } catch (error) {
    console.error('Unexpected error in GET /api/duty-rules/calculate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateRecommendations(
  request: DutyCalculationRequest,
  result: DutyCalculationResult
): string[] {
  const recommendations: string[] = []

  // Low confidence warning
  if (result.confidence < 0.7) {
    recommendations.push(
      'Low confidence in duty rate calculation. Consider verifying with official sources.'
    )
  }

  // Trade agreement suggestion
  if (!result.preferentialTreatment && request.originCountry) {
    recommendations.push(
      `Check if a trade agreement exists between ${request.originCountry} and ${request.destinationCountry} for potential duty savings.`
    )
  }

  // High duty rate warning
  if (result.dutyRate > 15) {
    recommendations.push(
      'High duty rate detected. Consider alternative HS classifications or origin countries.'
    )
  }

  // Classification precision
  if (request.hsCode.length < 8) {
    recommendations.push(
      'Using a more specific HS code (8+ digits) may provide more accurate duty rates.'
    )
  }

  // Cost optimization
  if (result.calculatedAmounts && result.calculatedAmounts.totalTax > 1000) {
    recommendations.push(
      'Consider duty optimization strategies for high-value shipments.'
    )
  }

  return recommendations
}