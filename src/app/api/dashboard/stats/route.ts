import { NextRequest, NextResponse } from 'next/server'
import dashboardCache from '@/lib/caching/dashboard-cache'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'
import { createSafeSupabaseClient } from '@/lib/supabase/cookie-handler'
import { createDutyLeakAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  console.log('[API /dashboard/stats] GET handler started.');
  try {
    console.log('[API /dashboard/stats] Initializing...');
    
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    // Try to create Supabase client with fallback to admin client
    let supabase
    let user = null
    let workspace_id = null
    
    try {
      const { supabase: clientResult, error } = await createSafeSupabaseClient();
      if (error) {
        console.warn('[API /dashboard/stats] createSafeSupabaseClient failed, falling back to admin client for demo data. Error:', error);
        supabase = createDutyLeakAdminClient();
        workspace_id = 'demo-workspace'; // DEMO_WORKSPACE_ID
        user = { id: 'demo-user' }; // DEMO_USER_ID
      } else {
        supabase = clientResult;
        console.log('[API /dashboard/stats] Supabase client created successfully (user-specific).');
        console.log('[API /dashboard/stats] Getting workspace access...');
        
        try {
          const accessResult = await getWorkspaceAccess(supabase);
          user = accessResult.user;
          workspace_id = accessResult.workspace_id;
          console.log('[API /dashboard/stats] Workspace access obtained:', { userId: user?.id, workspace_id });
        } catch (workspaceError: any) {
          console.warn('[API /dashboard/stats] Workspace access failed, falling back to demo mode. Error:', workspaceError.message);
          supabase = createDutyLeakAdminClient();
          workspace_id = 'demo-workspace';
          user = { id: 'demo-user' };
        }
      }
    } catch (authError: any) {
      console.warn('[API /dashboard/stats] Authentication failed, falling back to admin client for demo data. Error:', authError.message);
      supabase = createDutyLeakAdminClient();
      workspace_id = 'demo-workspace'; // DEMO_WORKSPACE_ID
      user = { id: 'demo-user' }; // DEMO_USER_ID
    }
    console.log(`[API /dashboard/stats] Effective context: User ID: ${user?.id}, Workspace ID: ${workspace_id}`);

    // Check permissions (skip for demo mode)
    if (workspace_id !== 'demo-workspace') {
      console.log(`[API /dashboard/stats] Checking permission ANALYTICS_VIEW for user ${user?.id} in workspace ${workspace_id}`);
      try {
        const { hasPermission, error: permError } = await checkUserPermission(
          user!.id, // user should be non-null here if not in demo-mode
          workspace_id!, // workspace_id should be non-null here
          'ANALYTICS_VIEW'
        );
        console.log(`[API /dashboard/stats] Permission ANALYTICS_VIEW result: ${hasPermission}, Error: ${permError}`);
        if (permError) {
          console.warn('[API /dashboard/stats] Permission check failed, falling back to demo mode. Error:', permError);
          supabase = createDutyLeakAdminClient();
          workspace_id = 'demo-workspace';
          user = { id: 'demo-user' };
        } else if (!hasPermission) {
          console.warn(`[API /dashboard/stats] Permission denied for user ${user?.id} in workspace ${workspace_id} for ANALYTICS_VIEW, falling back to demo mode.`);
          supabase = createDutyLeakAdminClient();
          workspace_id = 'demo-workspace';
          user = { id: 'demo-user' };
        } else {
          console.log(`[API /dashboard/stats] Permission ANALYTICS_VIEW granted.`);
        }
      } catch (permissionError: any) {
        console.warn('[API /dashboard/stats] Permission check threw error, falling back to demo mode. Error:', permissionError.message);
        supabase = createDutyLeakAdminClient();
        workspace_id = 'demo-workspace';
        user = { id: 'demo-user' };
      }
    } else {
      console.log('[API /dashboard/stats] Demo mode: skipping permission check.');
    }

    const workspaceId = workspace_id!; // Should be non-null by this point

    // Use dashboard cache (skip for demo mode)
    const cacheKey = `dashboard-stats-${workspaceId}`;
    if (workspace_id !== 'demo-workspace') {
      console.log(`[API /dashboard/stats] Checking cache for key: ${cacheKey}`);
      const cachedStats = dashboardCache.get(cacheKey);
      if (cachedStats) {
        console.log(`[API /dashboard/stats] Cache hit for key: ${cacheKey}. Returning cached data.`);
        return NextResponse.json({ success: true, data: cachedStats });
      }
      console.log(`[API /dashboard/stats] Cache miss for key: ${cacheKey}.`);
    }

    // Generate demo data or fetch real data
    console.log(`[API /dashboard/stats] Preparing to fetch data for workspace: ${workspaceId}`);
    let productsResult, savingsLedgerForTotalResult, jobsResult, reviewsResult, savingsLedgerForTrendResult, totalProductValueResult
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    if (workspace_id === 'demo-workspace') {
      console.log('[API /dashboard/stats] Generating demo data for dashboard.');
      // Provide demo data
      productsResult = { data: Array.from({ length: 150 }, (_, i) => ({ id: `demo-product-${i}`, title: `Demo Product ${i}`, category: (i%2 === 0 ? 'Electronics' : 'Clothing'), cost: Math.random() * 500 + 50, created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString() })), error: null };
      // Demo savings_ledger data
      savingsLedgerForTotalResult = { data: Array.from({ length: 100 }, (_, i) => ({ product_id: `demo-product-${i % 150}`, savings_amount: Math.random() * 70 + 5, created_at: new Date(Date.now() - (i % 30) * 24 * 60 * 60 * 1000).toISOString() })), error: null };
      savingsLedgerForTrendResult = { data: Array.from({ length: 180 }, (_, i) => ({ savings_amount: Math.random() * 70 + 5, created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString() })), error: null };
      
      jobsResult = { data: [
        ...Array(5).fill(null).map((_, i) => ({ id: `demo-job-${i}`, type: 'calculation', status: 'completed', progress: 100, created_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(), completed_at: new Date(Date.now() - i * 60 * 60 * 1000 + 30000).toISOString(), error: null })),
        ...Array(2).fill(null).map((_, i) => ({ id: `demo-job-${i+5}`, type: 'import', status: 'running', progress: Math.random() * 80 + 10, created_at: new Date(Date.now() - i * 30 * 60 * 1000).toISOString(), completed_at: null, error: null })),
        ...Array(1).fill(null).map((_, i) => ({ id: `demo-job-${i+7}`, type: 'export', status: 'failed', progress: 45, created_at: new Date(Date.now() - i * 120 * 60 * 1000).toISOString(), completed_at: null, error: 'Connection timeout' }))
      ], error: null }
      reviewsResult = { count: 12, error: null }
      totalProductValueResult = { data: [{ total_value: productsResult.data.reduce((sum, p) => sum + (p.cost || 0), 0) }], error: null };
    } else {
      console.log('[API /dashboard/stats] Fetching real data from Supabase...');
      try {
        productsResult = await supabase.from('products').select('id, title, category, cost, created_at').eq('workspace_id', workspaceId);
        console.log(`[API /dashboard/stats] productsResult: ${productsResult.data?.length} items, error: ${JSON.stringify(productsResult.error)}`);

        savingsLedgerForTotalResult = await supabase.from('savings_ledger').select('savings_amount, product_id').eq('workspace_id', workspaceId).gte('created_at', thirtyDaysAgo);
        console.log(`[API /dashboard/stats] savingsLedgerForTotalResult: ${savingsLedgerForTotalResult.data?.length} items, error: ${JSON.stringify(savingsLedgerForTotalResult.error)}`);
        
        jobsResult = await supabase.from('jobs').select('id, type, status, progress, created_at, completed_at, error').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(20);
        console.log(`[API /dashboard/stats] jobsResult: ${jobsResult.data?.length} items, error: ${JSON.stringify(jobsResult.error)}`);

        reviewsResult = await supabase.from('review_queue').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'pending');
        console.log(`[API /dashboard/stats] reviewsResult: count ${reviewsResult.count}, error: ${JSON.stringify(reviewsResult.error)}`);

        savingsLedgerForTrendResult = await supabase.from('savings_ledger').select('savings_amount, created_at').eq('workspace_id', workspaceId).gte('created_at', oneEightyDaysAgo).order('created_at', { ascending: false });
        console.log(`[API /dashboard/stats] savingsLedgerForTrendResult: ${savingsLedgerForTrendResult.data?.length} items, error: ${JSON.stringify(savingsLedgerForTrendResult.error)}`);
        
        totalProductValueResult = await supabase.from('products').select('cost.sum()').eq('workspace_id', workspaceId).single();
        console.log(`[API /dashboard/stats] totalProductValueResult: data ${JSON.stringify(totalProductValueResult.data)}, error: ${JSON.stringify(totalProductValueResult.error)}`);

        // Check for errors in any of the fetches
        const errors = [productsResult.error, savingsLedgerForTotalResult.error, jobsResult.error, reviewsResult.error, savingsLedgerForTrendResult.error, totalProductValueResult.error].filter(Boolean);
        if (errors.length > 0) {
          console.error('[API /dashboard/stats] Errors during Supabase fetches:', errors);
          const errorMessages = errors.map(e => (e as any)?.message || String(e)).join(', ');
          throw new Error(`Database query failed: ${errorMessages}`);
        }
        console.log('[API /dashboard/stats] All Supabase data fetched successfully.');

      } catch (dbError: any) {
        console.error('[API /dashboard/stats] Error during database operations (Promise.all or individual fetches):', dbError.message);
        return NextResponse.json({ error: 'Failed to retrieve dashboard data from database.', details: dbError.message }, { status: 500 });
      }
    }
    
    console.log('[API /dashboard/stats] Processing fetched data...');
    // Process products data
    const products = productsResult?.data || [];
    const totalProducts = products.length;
    
    let extractedSumValue: number | undefined | null = null;
    if (workspace_id === 'demo-workspace') {
      const demoDataArray = totalProductValueResult?.data as { total_value: number }[] | undefined;
      extractedSumValue = demoDataArray?.[0]?.total_value;
    } else {
      const realData = totalProductValueResult?.data as { sum: number | null } | undefined | null;
      extractedSumValue = realData?.sum;
    }
    const totalProductValue = extractedSumValue || products.reduce((sum: number, p: any) => sum + (p.cost || 0), 0);
    console.log(`[API /dashboard/stats] Processed product data: totalProducts=${totalProducts}, totalProductValue=${totalProductValue}`);

    const totalSavingsData = savingsLedgerForTotalResult?.data || [];
    const totalSavings = totalSavingsData.reduce((sum: number, item: any) => sum + (item.savings_amount || 0), 0);
    console.log(`[API /dashboard/stats] Processed savings data: totalSavings=${totalSavings}`);

    const jobs = jobsResult?.data || [];
    const activeJobs = jobs.filter(job => job.status === 'running' || job.status === 'pending').length;
    const jobStatusCounts = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`[API /dashboard/stats] Processed jobs data: activeJobs=${activeJobs}, jobStatusCounts=${JSON.stringify(jobStatusCounts)}`);

    const pendingReviews = reviewsResult?.count || 0;
    console.log(`[API /dashboard/stats] Processed review queue data: pendingReviews=${pendingReviews}`);
    
    let monthlyData, categoryMetricsData, trendsData;
    try {
      console.log('[API /dashboard/stats] Generating monthly savings data...');
      monthlyData = generateMonthlySavingsData(savingsLedgerForTrendResult?.data || []);
      console.log('[API /dashboard/stats] Monthly savings data generated:', monthlyData);

      console.log('[API /dashboard/stats] Generating category metrics...');
      categoryMetricsData = generateCategoryMetrics(products, totalSavingsData);
      console.log('[API /dashboard/stats] Category metrics generated:', categoryMetricsData);

      console.log('[API /dashboard/stats] Calculating trends...');
      trendsData = calculateTrends(products, savingsLedgerForTrendResult?.data || []);
      console.log('[API /dashboard/stats] Trends calculated:', trendsData);
    } catch (helperError: any) {
      console.error('[API /dashboard/stats] Error in helper function:', helperError.message);
      return NextResponse.json({ error: 'Error processing dashboard data.', details: helperError.message }, { status: 500 });
    }

    const dashboardStats = {
      overview: { totalProducts, totalSavings, pendingReviews, activeJobs, totalProductValue },
      trends: trendsData,
      charts: {
        monthlySavings: monthlyData,
        productMetrics: categoryMetricsData,
        jobStatus: {
          counts: jobStatusCounts,
          recentJobs: jobs.slice(0, 5).map(job => ({
            id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            created_at: job.created_at,
            completed_at: job.completed_at,
            error_message: job.error
          }))
        }
      },
      lastUpdated: new Date().toISOString()
    }

    // Cache the results for 2 minutes (skip for demo mode)
    if (workspace_id !== 'demo-workspace') {
      console.log(`[API /dashboard/stats] Caching results for key: ${cacheKey}`);
      dashboardCache.set(cacheKey, dashboardStats, 2 * 60 * 1000); // 2 minutes cache
    }
    
    console.log('[API /dashboard/stats] Dashboard stats assembled successfully:', dashboardStats.overview);
    return NextResponse.json({ success: true, data: dashboardStats });

  } catch (error: any) {
    console.error('[API /dashboard/stats] Critical error in GET handler:', error.message, error.stack);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

function generateMonthlySavingsData(savingsLedgerEntries: any[]) {
  console.log('[Helper generateMonthlySavingsData] Input length:', savingsLedgerEntries.length);
  const monthlyMap = new Map<string, { month: string; savings: number; costs: number; count: number }>();
  try {
    savingsLedgerEntries.forEach(entry => {
      if (!entry || !entry.created_at) {
        console.warn('[Helper generateMonthlySavingsData] Skipping entry with missing created_at:', entry);
        return;
      }
      const date = new Date(entry.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthName, savings: 0, costs: 0, count: 0 });
      }
      const data = monthlyMap.get(monthKey)!;
      data.savings += entry.savings_amount || 0;
      data.count += 1;
    });
  } catch (e: any) {
    console.error("[Helper generateMonthlySavingsData] Error processing entries:", e.message);
    // Return empty or partially processed if acceptable, or rethrow
  }
  const result = Array.from(monthlyMap.values()).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()).slice(-6);
  console.log('[Helper generateMonthlySavingsData] Result:', result);
  return result;
}

function generateCategoryMetrics(products: any[], savingsLedgerEntries: any[]) {
  console.log('[Helper generateCategoryMetrics] Input products:', products.length, 'savingsLedgerEntries:', savingsLedgerEntries.length);
  const categories = [
    { name: 'Electronics', color: '#3B82F6', pattern: /electronic|phone|computer|tech|headphone|charger|cable/i },
    { name: 'Clothing', color: '#10B981', pattern: /cloth|apparel|shirt|dress|fashion|wear|textile/i },
    { name: 'Home & Garden', color: '#F59E0B', pattern: /home|garden|furniture|decor|kitchen|scale|tool/i },
    { name: 'Sports', color: '#EF4444', pattern: /sport|fitness|outdoor|athletic|exercise/i },
    { name: 'Beauty', color: '#8B5CF6', pattern: /beauty|cosmetic|skincare|makeup|personal care/i },
    { name: 'Automotive', color: '#06B6D4', pattern: /auto|car|vehicle|motor|parts/i },
    { name: 'Other', color: '#6B7280', pattern: /.*/ }
  ];
  let categoryData: any[] = [];
  try {
    categoryData = categories.map(category => {
      const categoryProducts = products.filter(p => 
        (p.category && p.category.toLowerCase().includes(category.name.toLowerCase())) || 
        category.pattern.test(p.title || p.name || '')
      );
      const categorySavingsEntries = savingsLedgerEntries.filter(entry => 
        categoryProducts.some(p => p.id === entry.product_id)
      );
      const totalSavings = categorySavingsEntries.reduce((sum, entry) => sum + (entry.savings_amount || 0), 0);
      const totalValue = categoryProducts.reduce((sum, p) => sum + (p.cost || 0), 0);
      const avgSavings = categoryProducts.length > 0 ? totalSavings / categoryProducts.length : 0;
      return { category: category.name, count: categoryProducts.length, avgSavings, totalValue, color: category.color };
    }).filter(cat => cat.count > 0);
  } catch (e: any) {
    console.error("[Helper generateCategoryMetrics] Error processing categories:", e.message);
  }
  console.log('[Helper generateCategoryMetrics] Result:', categoryData);
  return categoryData;
}

function calculateTrends(products: any[], savingsLedgerEntries: any[]) { // Changed 'calculations' to 'savingsLedgerEntries'
  console.log('[Helper calculateTrends] Input products:', products.length, 'savingsLedgerEntries:', savingsLedgerEntries.length);
  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() -1, now.getDate());
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
  const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());


  let productsTrend = 0, recentProducts = 0, previousProducts = 0;
  let savingsTrend = 0, recentSavings = 0, previousSavings = 0;

  try {
    recentProducts = products.filter(p => p.created_at && new Date(p.created_at) >= lastMonthStart).length;
    previousProducts = products.filter(p => p.created_at && new Date(p.created_at) >= previousMonthStart && new Date(p.created_at) < lastMonthStart).length;
    productsTrend = previousProducts > 0 ? ((recentProducts - previousProducts) / previousProducts) * 100 : (recentProducts > 0 ? 100 : 0);

    recentSavings = savingsLedgerEntries
      .filter(entry => entry.created_at && new Date(entry.created_at) >= lastMonthStart)
      .reduce((sum, entry) => sum + (entry.savings_amount || 0), 0);
    previousSavings = savingsLedgerEntries
      .filter(entry => entry.created_at && new Date(entry.created_at) >= previousMonthStart && new Date(entry.created_at) < lastMonthStart)
      .reduce((sum, entry) => sum + (entry.savings_amount || 0), 0);
    savingsTrend = previousSavings > 0 ? ((recentSavings - previousSavings) / previousSavings) * 100 : (recentSavings > 0 ? 100 : 0);
  } catch (e: any) {
     console.error("[Helper calculateTrends] Error processing trends:", e.message);
  }
  
  const result = {
    products: {
      current: recentProducts,
      previous: previousProducts,
      change: productsTrend
    },
    savings: {
      current: recentSavings,
      previous: previousSavings,
      change: savingsTrend
    }
  }
}
