import { createDutyLeakServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { FbaFeeCalculator } from '@/lib/amazon/fba-fee-calculator';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createDutyLeakServerClient(cookieStore);
    
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
    const { 
      productId,
      dimensions,
      weight,
      category,
      asin,
      updateProduct = false // Whether to update the product with the calculated fee
    } = body;

    // Validate request
    if (!productId && !asin && !dimensions) {
      return NextResponse.json(
        { error: 'Missing required fields: either productId, asin, or dimensions must be provided' },
        { status: 400 }
      );
    }

    // If productId is provided, get product details
    let product;
    if (productId) {
      const { data, error } = await supabase
        .from('products')
        .select('id, asin, workspace_id')
        .eq('id', productId)
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Product not found or access denied', details: error.message },
          { status: 404 }
        );
      }
      
      product = data;
    }

    // Initialize FBA fee calculator
    const fbaFeeCalculator = new FbaFeeCalculator();
    
    let fbaFeeResult;
    
    // If ASIN is provided (either directly or from product), use SP-API to fetch fees
    const asinToUse = asin || (product?.asin);
    if (asinToUse) {
      fbaFeeResult = await fbaFeeCalculator.fetchFbaFeeByAsin(asinToUse);
    } else {
      // Otherwise calculate based on dimensions and weight
      fbaFeeResult = fbaFeeCalculator.calculate({
        dimensions,
        weight,
        category
      });
    }

    // If requested and productId is provided, update the product with the calculated fee
    if (updateProduct && productId) {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          fba_fee_estimate_usd: fbaFeeResult.fbaFee
        })
        .eq('id', productId);

      if (updateError) {
        console.error('Failed to update product with FBA fee:', updateError);
        // Continue anyway to return the calculation to the user
      }
    }

    return NextResponse.json({
      success: true,
      fbaFee: fbaFeeResult.fbaFee,
      breakdown: fbaFeeResult.breakdown,
      productUpdated: updateProduct && productId ? true : false
    });
    
  } catch (error) {
    console.error('FBA fee calculation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
