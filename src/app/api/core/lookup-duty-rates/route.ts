import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { TaricClient } from '@/lib/external/taric-client';
import { UsitcClient } from '@/lib/external/usitc-client';
import { CacheManager } from '@/lib/caching/cache-manager';

export async function POST(req: NextRequest) {
  try {
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
    const { hsCode, destinationCountry, originCountry } = body;

    if (!hsCode || !destinationCountry) {
      return NextResponse.json(
        { error: 'Missing required fields: hsCode and destinationCountry' },
        { status: 400 }
      );
    }

    // Initialize cache manager
    const cacheManager = new CacheManager();
    
    // Check cache first
    const cacheKey = `duty_rates:${hsCode}:${destinationCountry}:${originCountry || 'any'}`;
    const cachedRates = await cacheManager.get(cacheKey);
    
    if (cachedRates) {
      return NextResponse.json({
        success: true,
        rates: cachedRates,
        source: 'cache'
      });
    }

    // Initialize API clients based on destination country
    let rates = [];
    let source = '';

    if (destinationCountry === 'US' || destinationCountry.startsWith('US-')) {
      // Use USITC DataWeb API for US rates
      const usitcClient = new UsitcClient();
      const usitcResult = await usitcClient.getDutyRates(hsCode, originCountry);
      
      if (usitcResult.success) {
        rates = usitcResult.rates;
        source = 'usitc';
      }
    } else if (
      destinationCountry === 'GB' || 
      ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 
       'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'].includes(destinationCountry)
    ) {
      // Use TARIC API for EU/UK rates
      const taricClient = new TaricClient();
      const taricResult = await taricClient.getDutyRates(hsCode, destinationCountry, originCountry);
      
      if (taricResult.success) {
        rates = taricResult.rates;
        source = 'taric';
      }
    } else {
      // For other countries, we might need to implement additional APIs
      // For now, return an error
      return NextResponse.json(
        { error: `Duty rates for ${destinationCountry} are not currently supported` },
        { status: 400 }
      );
    }

    if (rates.length === 0) {
      return NextResponse.json(
        { error: 'No duty rates found for the specified parameters' },
        { status: 404 }
      );
    }

    // Cache the results (24 hours)
    await cacheManager.set(cacheKey, rates, 60 * 60 * 24);

    // Store rates in database if we have a classification ID
    if (body.classificationId) {
      // Get the first (most relevant) rate
      const primaryRate = rates[0];
      
      // Insert into duty_rates table
      await supabase
        .from('duty_rates')
        .insert({
          classification_id: body.classificationId,
          country_code: destinationCountry,
          duty_percentage: primaryRate.dutyPercentage,
          vat_percentage: primaryRate.vatPercentage || 0,
          source,
          effective_date: primaryRate.effectiveDate || new Date().toISOString().split('T')[0],
          expiry_date: primaryRate.expiryDate || null
        });
    }

    return NextResponse.json({
      success: true,
      rates,
      source
    });
    
  } catch (error) {
    console.error('Duty rates API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
