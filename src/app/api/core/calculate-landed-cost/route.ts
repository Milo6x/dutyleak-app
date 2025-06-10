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
    const { 
      productId,
      destinationCountry,
      classificationId, // Optional: if provided, use this classification
      productValue,
      shippingCost = 0,
      insuranceCost = 0,
      fbaFee = 0,
      useStoredFbaFee = true,
      // Fields for advanced calculation with currency conversion
      hsCode, // Required if using advanced calculation
      originCountry, // Required if using advanced calculation
      currency, // Source currency of productValue, shippingCost, etc.
      targetCurrency // Desired output currency
    } = body as LandedCostRequest & {
        classificationId?: string; // Added missing field from destructuring
        shippingCost?: number; // Added missing field from destructuring
        insuranceCost?: number; // Added missing field from destructuring
        fbaFee?: number; 
        useStoredFbaFee?: boolean; 
        // Explicitly type additional fields for the basic path
        dutyPercentage?: number; 
        vatPercentage?: number;
      };

    if (!productId || !destinationCountry || !productValue) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, destinationCountry, and productValue' },
        { status: 400 }
      );
    }
    
    // Determine if using advanced calculation path
    const useAdvancedCalculation = hsCode && originCountry && currency && targetCurrency;

    if (useAdvancedCalculation) {
      // Use the static LandedCostCalculator.calculateLandedCost for advanced features
      const advancedRequest: LandedCostRequest = {
        productId,
        hsCode: hsCode!, // Known to be defined due to useAdvancedCalculation
        productValue,
        destinationCountry,
        originCountry: originCountry!, // Known to be defined
        currency: currency!, // Known to be defined
        targetCurrency: targetCurrency!, // Known to be defined
        shippingMethod: body.shippingMethod, // Pass through if provided
        quantity: body.quantity,
        weight: body.weight,
        dimensions: body.dimensions,
        includeInsurance: body.includeInsurance,
        insuranceValue: body.insuranceValue,
        customsValue: body.customsValue,
      };

      const result = await LandedCostCalculator.calculateLandedCost(advancedRequest);

      if (!result.success || !result.calculation) {
        return NextResponse.json({ error: result.error || 'Advanced landed cost calculation failed' }, { status: 500 });
      }
      
      // Get product for workspace_id and active_classification_id for storing calculation
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, workspace_id, active_classification_id')
        .eq('id', productId)
        .single();

      let resolvedClassificationId: string | null = null;
      if (product && product.active_classification_id) {
        resolvedClassificationId = product.active_classification_id;
      } else if (classificationId) { // Use classificationId from request if product has no active one
        resolvedClassificationId = classificationId;
      }
      // If still no classificationId, storing might be an issue or need a different approach.
      // For now, we'll proceed and the insert might fail if classification_id is truly required by DB and null here.
      // A better approach might be to look up classification by hsCode if not provided.

      if (productError || !product) {
        // Log error but proceed to return calculation if product not found for storing
        console.error('Product not found for storing advanced calculation, but returning calculation.');
      }
      
      if (product && resolvedClassificationId) { // Only attempt insert if we have product and classificationId
         // Store the calculation (optional, adapt fields as needed for duty_calculations table)
        await supabase.from('duty_calculations').insert({
          product_id: productId,
          classification_id: resolvedClassificationId, 
          destination_country: destinationCountry,
          product_value: result.calculation.breakdown.productValue, // This is now in targetCurrency
          shipping_cost: result.calculation.shippingCost,
          insurance_cost: result.calculation.insuranceCost,
          fba_fee_amount: result.calculation.fbaFeeAmount || 0,
          duty_percentage: result.calculation.dutyRate,
          vat_percentage: result.calculation.taxRate,
          duty_amount: result.calculation.dutyAmount,
          vat_amount: result.calculation.taxAmount,
          total_landed_cost: result.calculation.totalLandedCost,
          workspace_id: product.workspace_id,
          // metadata: { source_currency: currency, target_currency: targetCurrency } // Optional
        });
      }

      return NextResponse.json({
        success: true,
        landedCostDetails: result.calculation, // The result from advanced calculator is already detailed
        calculationMethod: 'advanced_static'
      });

    } else {
      // Original basic calculation path (using percentages)
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, workspace_id, active_classification_id, fba_fee_estimate_usd')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 });
      }

      const activeClassificationId = classificationId || product.active_classification_id;
      if (!activeClassificationId) {
        return NextResponse.json({ error: 'No active classification found for this product' }, { status: 400 });
      }

      const { data: classification, error: classificationError } = await supabase
        .from('classifications')
        .select('id, hs6, hs8')
        .eq('id', activeClassificationId)
        .single();

      if (classificationError || !classification) {
        return NextResponse.json({ error: 'Classification not found' }, { status: 404 });
      }

      let dutyRatesData = body.dutyPercentage !== undefined && body.vatPercentage !== undefined 
        ? { duty_percentage: body.dutyPercentage, vat_percentage: body.vatPercentage }
        : null;

      if (!dutyRatesData) {
        const { data: dbDutyRates, error: dutyRatesError } = await supabase
          .from('duty_rates')
          .select('duty_percentage, vat_percentage')
          .eq('classification_id', activeClassificationId)
          .eq('country_code', destinationCountry)
          .order('effective_date', { ascending: false })
          .limit(1)
          .single();
        
        if (dutyRatesError && !dbDutyRates) { // If error and no data from DB
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/core/lookup-duty-rates`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Cookie': req.headers.get('cookie') || '' },
              body: JSON.stringify({ hsCode: classification.hs8 || classification.hs6, destinationCountry, classificationId: activeClassificationId })
            });
            if (!response.ok) return NextResponse.json({ error: 'Failed to fetch duty rates' }, { status: 500 });
            const lookupResponseData = await response.json();
            if (!lookupResponseData.success || !lookupResponseData.rates || lookupResponseData.rates.length === 0) {
              return NextResponse.json({ error: 'Failed to retrieve duty rates from lookup service' }, { status: 500 });
            }
            dutyRatesData = lookupResponseData.rates[0]; // Use the first rate from lookup
        } else if (dbDutyRates) {
            dutyRatesData = dbDutyRates;
        } else { // No rates from DB, no error, but also no rates passed in body
             return NextResponse.json({ error: 'Duty and VAT percentages must be provided or available for the classification.' }, { status: 400 });
        }
      }
      
      let fbaFeeAmount = typeof fbaFee === 'number' ? fbaFee : 0;
      if (useStoredFbaFee && product.fba_fee_estimate_usd != null && fbaFee === 0) {
        fbaFeeAmount = product.fba_fee_estimate_usd;
      }

      const calculator = new LandedCostCalculator({
        productValue,
        shippingCost,
        insuranceCost,
        dutyPercentage: dutyRatesData!.duty_percentage ?? 0,
        vatPercentage: dutyRatesData!.vat_percentage ?? 0,
        fbaFeeAmount
      });
      const landedCostDetails = calculator.calculate();

      const { data: calculation, error: calculationError } = await supabase
        .from('duty_calculations')
        .insert({
          product_id: productId,
          classification_id: activeClassificationId,
          destination_country: destinationCountry,
          product_value: productValue,
          shipping_cost: shippingCost,
          insurance_cost: insuranceCost,
          fba_fee_amount: fbaFeeAmount,
          duty_percentage: dutyRatesData!.duty_percentage ?? 0,
          vat_percentage: dutyRatesData!.vat_percentage ?? 0,
          duty_amount: landedCostDetails.dutyAmount,
          vat_amount: landedCostDetails.vatAmount,
          total_landed_cost: landedCostDetails.totalLandedCost,
          workspace_id: product.workspace_id
        })
        .select()
        .single();
      
      if (calculationError) console.error('Failed to store calculation:', calculationError);

      return NextResponse.json({
        success: true,
        landedCostDetails, // This is BasicLandedCostResult
        calculationId: calculation?.id,
        calculationMethod: 'basic_percentage'
      });
    }
  } catch (error) {
    console.error('Landed cost API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for calculation history
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
        classification_id,
        destination_country,
        product_value,
        shipping_cost,
        insurance_cost,
        fba_fee_amount,
        duty_percentage,
        vat_percentage,
        duty_amount,
        vat_amount,
        total_landed_cost,
        created_at,
        products!inner(name, sku)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data: calculations, error } = await query;

    if (error) {
      console.error('Failed to fetch calculation history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calculation history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      calculations
    });

  } catch (error) {
    console.error('Calculation history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
