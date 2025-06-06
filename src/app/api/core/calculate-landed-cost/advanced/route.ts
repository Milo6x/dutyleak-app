import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { LandedCostCalculator } from '@/lib/duty/landed-cost-calculator';
import type { LandedCostRequest } from '@/lib/duty/landed-cost-calculator';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createDutyLeakServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const request: LandedCostRequest = {
      productId: body.productId,
      hsCode: body.hsCode,
      productValue: body.productValue,
      quantity: body.quantity || 1,
      weight: body.weight || 1,
      originCountry: body.originCountry,
      destinationCountry: body.destinationCountry || 'US',
      shippingMethod: body.shippingMethod || 'standard',
      currency: body.currency || 'USD',
      includeInsurance: body.includeInsurance || false,
      insuranceValue: body.insuranceValue,
      customsValue: body.customsValue,
      dimensions: body.dimensions
    };

    // Validate required fields
    if (!request.productId || !request.hsCode || !request.productValue) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, hsCode, and productValue' },
        { status: 400 }
      );
    }

    // Get product from database to verify access rights
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, workspace_id, title, asin, active_classification_id')
      .eq('id', request.productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    // Calculate advanced landed cost
    const result = await LandedCostCalculator.calculateLandedCost(request);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to calculate landed cost' },
        { status: 500 }
      );
    }

    // Store the advanced calculation in the database
    const { data: calculation, error: calculationError } = await supabase
      .from('duty_calculations')
      .insert({
        classification_id: product.active_classification_id || '',
        product_id: request.productId,
        product_value: request.productValue,
        destination_country: request.destinationCountry,
        duty_amount: result.calculation!.dutyAmount,
        duty_percentage: result.calculation!.dutyRate,
        fba_fee_amount: result.calculation!.brokerFees || 0,
        insurance_cost: result.calculation!.insuranceCost,
        shipping_cost: result.calculation!.shippingCost,
        total_landed_cost: result.calculation!.totalLandedCost,
        vat_amount: result.calculation!.taxAmount || 0,
        vat_percentage: result.calculation!.taxRate || 0,
        workspace_id: product.workspace_id
      })
      .select()
      .single();

    if (calculationError) {
      console.error('Failed to store advanced calculation:', calculationError);
      // Continue anyway to return the calculation to the user
    }

    return NextResponse.json({
      success: true,
      result: result.calculation,
      calculationId: calculation?.id,
      product: {
        id: product.id,
        title: product.title,
        asin: product.asin
      }
    });
    
  } catch (error) {
    console.error('Advanced landed cost API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for advanced calculation history
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createDutyLeakServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('duty_calculations')
      .select(`
        id,
        product_id,
        product_value,
        destination_country,
        duty_amount,
        duty_percentage,
        fba_fee_amount,
        insurance_cost,
        shipping_cost,
        total_landed_cost,
        vat_amount,
        vat_percentage,
        created_at,
        products!inner(title, asin)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data: calculations, error } = await query;

    if (error) {
      console.error('Failed to fetch advanced calculation history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch advanced calculation history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      calculations
    });

  } catch (error) {
    console.error('Advanced calculation history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}