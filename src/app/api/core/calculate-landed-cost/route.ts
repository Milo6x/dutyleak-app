import { createDutyLeakServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { LandedCostCalculator } from '@/lib/duty/landed-cost-calculator';

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
      destinationCountry, 
      classificationId, 
      productValue, 
      shippingCost = 0, 
      insuranceCost = 0,
      fbaFee = 0,            // NEW: FBA fee parameter
      useStoredFbaFee = true // NEW: Option to use stored FBA fee
    } = body;

    if (!productId || !destinationCountry || !productValue) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, destinationCountry, and productValue' },
        { status: 400 }
      );
    }

    // Get product from database to verify access rights
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, workspace_id, active_classification_id, fba_fee_estimate_usd')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    // Determine which classification to use
    const activeClassificationId = classificationId || product.active_classification_id;
    
    if (!activeClassificationId) {
      return NextResponse.json(
        { error: 'No active classification found for this product' },
        { status: 400 }
      );
    }

    // Get the classification and duty rates
    const { data: classification, error: classificationError } = await supabase
      .from('classifications')
      .select('id, hs6, hs8')
      .eq('id', activeClassificationId)
      .single();

    if (classificationError || !classification) {
      return NextResponse.json(
        { error: 'Classification not found' },
        { status: 404 }
      );
    }

    // Get the duty rates for this classification and destination country
    const { data: dutyRates, error: dutyRatesError } = await supabase
      .from('duty_rates')
      .select('duty_percentage, vat_percentage')
      .eq('classification_id', activeClassificationId)
      .eq('country_code', destinationCountry)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (dutyRatesError) {
      // If no duty rates found, try to fetch them
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/core/lookup-duty-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          hsCode: classification.hs8 || classification.hs6,
          destinationCountry,
          classificationId: activeClassificationId
        })
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch duty rates' },
          { status: 500 }
        );
      }

      // Fetch the newly created duty rates
      const { data: newDutyRates, error: newDutyRatesError } = await supabase
        .from('duty_rates')
        .select('duty_percentage, vat_percentage')
        .eq('classification_id', activeClassificationId)
        .eq('country_code', destinationCountry)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (newDutyRatesError) {
        return NextResponse.json(
          { error: 'Failed to retrieve duty rates' },
          { status: 500 }
        );
      }

      // Determine FBA fee to use
      let fbaFeeAmount = fbaFee;
      if (useStoredFbaFee && product.fba_fee_estimate_usd && fbaFee === 0) {
        fbaFeeAmount = product.fba_fee_estimate_usd;
      }

      // Use the newly fetched rates
      const calculator = new LandedCostCalculator({
        productValue,
        shippingCost,
        insuranceCost,
        dutyPercentage: newDutyRates.duty_percentage,
        vatPercentage: newDutyRates.vat_percentage,
        fbaFeeAmount
      });

      const landedCostDetails = calculator.calculate();

      // Store the calculation in the database
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
          duty_percentage: newDutyRates.duty_percentage,
          vat_percentage: newDutyRates.vat_percentage,
          duty_amount: landedCostDetails.dutyAmount,
          vat_amount: landedCostDetails.vatAmount,
          total_landed_cost: landedCostDetails.totalLandedCost
        })
        .select()
        .single();

      if (calculationError) {
        console.error('Failed to store calculation:', calculationError);
        // Continue anyway to return the calculation to the user
      }

      return NextResponse.json({
        success: true,
        landedCostDetails,
        calculationId: calculation?.id
      });
    }

    // Determine FBA fee to use
    let fbaFeeAmount = fbaFee;
    if (useStoredFbaFee && product.fba_fee_estimate_usd && fbaFee === 0) {
      fbaFeeAmount = product.fba_fee_estimate_usd;
    }

    // Calculate landed cost
    const calculator = new LandedCostCalculator({
      productValue,
      shippingCost,
      insuranceCost,
      dutyPercentage: dutyRates.duty_percentage,
      vatPercentage: dutyRates.vat_percentage,
      fbaFeeAmount
    });

    const landedCostDetails = calculator.calculate();

    // Store the calculation in the database
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
        duty_percentage: dutyRates.duty_percentage,
        vat_percentage: dutyRates.vat_percentage,
        duty_amount: landedCostDetails.dutyAmount,
        vat_amount: landedCostDetails.vatAmount,
        total_landed_cost: landedCostDetails.totalLandedCost
      })
      .select()
      .single();

    if (calculationError) {
      console.error('Failed to store calculation:', calculationError);
      // Continue anyway to return the calculation to the user
    }

    return NextResponse.json({
      success: true,
      landedCostDetails,
      calculationId: calculation?.id
    });
    
  } catch (error) {
    console.error('Landed cost API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
