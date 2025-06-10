import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { MetricsCalculator } from '@/lib/analytics/metrics-calculator'

export async function GET(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient()

    // Get user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'comprehensive'
    const period = searchParams.get('period') || '30d'
    const format = searchParams.get('format') || 'json'

    // Initialize metrics calculator
    const calculator = new MetricsCalculator(user.id)

    let reportData: any = {}

    // Generate report based on type
    switch (type) {
      case 'savings':
        reportData = await generateSavingsReport(calculator, period)
        break
      case 'profitability':
        reportData = await generateProfitabilityReport(calculator, period)
        break
      case 'performance':
        reportData = await generatePerformanceReport(calculator, period)
        break
      case 'comprehensive':
      default:
        reportData = await generateComprehensiveReport(calculator, period)
        break
    }

    // Add metadata
    const report = {
      metadata: {
        reportType: type,
        period,
        generatedAt: new Date().toISOString(),
        userId: user.id,
        format
      },
      ...reportData
    }

    // Return based on format
    if (format === 'csv') {
      const csvData = convertToCSV(report)
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}_report_${period}.csv"`
        }
      })
    }

    if (format === 'pdf') {
      // For PDF, return a URL to generate PDF (would integrate with PDF service)
      return NextResponse.json({
        success: true,
        downloadUrl: `/api/analytics/pdf?type=${type}&period=${period}`,
        message: 'PDF generation initiated'
      })
    }

    // Default JSON format
    return NextResponse.json({
      success: true,
      data: report
    })

  } catch (error) {
    console.error('Export analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateSavingsReport(calculator: MetricsCalculator, period: string) {
  const savings = await calculator.calculateSavingsMetrics(period)
  
  return {
    executiveSummary: {
      totalSavings: savings.totalSavings,
      savingsPercentage: savings.savingsPercentage,
      optimizationRate: (savings.optimizedProducts / savings.totalProducts) * 100,
      keyHighlights: [
        `Achieved $${savings.totalSavings.toLocaleString()} in total savings`,
        `${savings.savingsPercentage.toFixed(1)}% average savings rate`,
        `${savings.optimizedProducts} of ${savings.totalProducts} products optimized`
      ]
    },
    detailedMetrics: savings,
    recommendations: generateSavingsRecommendations(savings),
    actionItems: [
      'Review top savings opportunities',
      'Optimize remaining unoptimized products',
      'Monitor monthly savings trends'
    ]
  }
}

async function generateProfitabilityReport(calculator: MetricsCalculator, period: string) {
  const profitability = await calculator.calculateProfitabilityMetrics(period)
  
  return {
    executiveSummary: {
      totalRevenue: profitability.totalRevenue,
      grossProfit: profitability.grossProfit,
      profitMargin: profitability.profitMargin,
      roi: profitability.roi,
      keyHighlights: [
        `Generated $${profitability.totalRevenue.toLocaleString()} in revenue`,
        `${profitability.profitMargin.toFixed(1)}% profit margin`,
        `${profitability.roi.toFixed(1)}% return on investment`
      ]
    },
    detailedMetrics: profitability,
    costAnalysis: {
      breakdown: profitability.costBreakdown,
      optimization: analyzeCostOptimization(profitability.costBreakdown)
    },
    recommendations: generateProfitabilityRecommendations(profitability)
  }
}

async function generatePerformanceReport(calculator: MetricsCalculator, period: string) {
  const performance = await calculator.calculatePerformanceMetrics(period)
  
  return {
    executiveSummary: {
      classificationAccuracy: performance.classificationAccuracy,
      averageProcessingTime: performance.averageProcessingTime,
      throughput: performance.throughput,
      errorRate: performance.errorRate,
      keyHighlights: [
        `${(performance.classificationAccuracy * 100).toFixed(1)}% classification accuracy`,
        `${performance.averageProcessingTime.toFixed(1)}s average processing time`,
        `${performance.throughput.toFixed(1)} items/hour throughput`
      ]
    },
    detailedMetrics: performance,
    systemHealth: {
      uptime: performance.systemUptime,
      responseTime: performance.apiResponseTime,
      userSatisfaction: performance.userSatisfactionScore
    },
    recommendations: generatePerformanceRecommendations(performance)
  }
}

async function generateComprehensiveReport(calculator: MetricsCalculator, period: string) {
  const comprehensive = await calculator.calculateComprehensiveAnalytics(period)
  
  return {
    executiveSummary: {
      totalValue: comprehensive.summary.totalValue,
      keyMetrics: {
        totalSavings: comprehensive.savings.totalSavings,
        profitMargin: comprehensive.profitability.profitMargin,
        classificationAccuracy: comprehensive.performance.classificationAccuracy
      },
      keyInsights: comprehensive.summary.keyInsights,
      recommendations: comprehensive.summary.recommendations
    },
    savingsAnalysis: comprehensive.savings,
    profitabilityAnalysis: comprehensive.profitability,
    performanceAnalysis: comprehensive.performance,
    strategicRecommendations: generateStrategicRecommendations(comprehensive),
    nextSteps: [
      'Review and implement priority recommendations',
      'Set up automated monitoring for key metrics',
      'Schedule monthly performance reviews'
    ]
  }
}

function generateSavingsRecommendations(savings: any) {
  const recommendations = []
  
  if (savings.optimizedProducts < savings.totalProducts * 0.5) {
    recommendations.push({
      priority: 'high',
      category: 'optimization',
      title: 'Increase Product Optimization Rate',
      description: 'Less than 50% of products are optimized. Focus on optimizing remaining products.',
      impact: 'High',
      effort: 'Medium'
    })
  }
  
  if (savings.savingsPercentage < 10) {
    recommendations.push({
      priority: 'medium',
      category: 'efficiency',
      title: 'Improve Savings Efficiency',
      description: 'Current savings rate is below 10%. Review classification strategies.',
      impact: 'Medium',
      effort: 'High'
    })
  }
  
  return recommendations
}

function generateProfitabilityRecommendations(profitability: any) {
  const recommendations = []
  
  if (profitability.profitMargin < 20) {
    recommendations.push({
      priority: 'high',
      category: 'margin_improvement',
      title: 'Improve Profit Margins',
      description: 'Current profit margin is below 20%. Focus on cost reduction.',
      impact: 'High',
      effort: 'Medium'
    })
  }
  
  // Analyze cost breakdown for recommendations
  const highestCost = profitability.costBreakdown.reduce(
    (max: { category: string; amount: number; percentage: number }, item: { category: string; amount: number; percentage: number }) =>
      item.percentage > max.percentage ? item : max, 
    { category: '', amount: 0, percentage: 0 } // Initial value for reduce
  );
  
  if (highestCost.percentage > 40 && highestCost.category) { // ensure category is not empty
    recommendations.push({
      priority: 'medium',
      category: 'cost_optimization',
      title: `Optimize ${highestCost.category} Costs`,
      description: `${highestCost.category} represents ${highestCost.percentage.toFixed(1)}% of total costs.`,
      impact: 'Medium',
      effort: 'Medium'
    })
  }
  
  return recommendations
}

function generatePerformanceRecommendations(performance: any) {
  const recommendations = []
  
  if (performance.classificationAccuracy < 0.9) {
    recommendations.push({
      priority: 'high',
      category: 'accuracy',
      title: 'Improve Classification Accuracy',
      description: 'Classification accuracy is below 90%. Consider model retraining.',
      impact: 'High',
      effort: 'High'
    })
  }
  
  if (performance.averageProcessingTime > 120) {
    recommendations.push({
      priority: 'medium',
      category: 'speed',
      title: 'Optimize Processing Speed',
      description: 'Average processing time exceeds 2 minutes. Review system performance.',
      impact: 'Medium',
      effort: 'Medium'
    })
  }
  
  return recommendations
}

function generateStrategicRecommendations(comprehensive: any) {
  return [
    {
      timeframe: 'immediate',
      title: 'Quick Wins',
      actions: [
        'Optimize top 10 highest-value products',
        'Address critical performance bottlenecks',
        'Implement automated monitoring'
      ]
    },
    {
      timeframe: '30-60 days',
      title: 'Medium-term Improvements',
      actions: [
        'Expand optimization to 80% of product catalog',
        'Implement advanced analytics dashboards',
        'Enhance classification accuracy'
      ]
    },
    {
      timeframe: '60-90 days',
      title: 'Long-term Strategy',
      actions: [
        'Develop predictive analytics capabilities',
        'Implement machine learning optimization',
        'Create automated reporting systems'
      ]
    }
  ]
}

function analyzeCostOptimization(costBreakdown: any[]) {
  return costBreakdown.map(cost => ({
    category: cost.category,
    currentAmount: cost.amount,
    currentPercentage: cost.percentage,
    optimizationPotential: cost.percentage > 30 ? 'high' : cost.percentage > 20 ? 'medium' : 'low',
    recommendedActions: getCostOptimizationActions(cost.category, cost.percentage)
  }))
}

function getCostOptimizationActions(category: string, percentage: number) {
  const actions = {
    'Product Cost': [
      'Negotiate better supplier rates',
      'Consider alternative suppliers',
      'Implement bulk purchasing'
    ],
    'Shipping': [
      'Optimize shipping routes',
      'Negotiate carrier rates',
      'Consider consolidation'
    ],
    'Duties & Taxes': [
      'Review classification accuracy',
      'Explore duty optimization',
      'Consider trade agreements'
    ],
    'FBA Fees': [
      'Optimize product dimensions',
      'Review storage strategies',
      'Consider FBM alternatives'
    ]
  }
  
  return actions[category as keyof typeof actions] || ['Review and optimize this cost category'];
}

// Helper to escape CSV values (handles commas, quotes, newlines)
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const strValue = String(value);
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
}

function objectToCsvRows(obj: Record<string, any>, prefix = ''): string[][] {
  const rows: string[][] = [];
  for (const [key, value] of Object.entries(obj)) {
    const currentKey = prefix ? `${prefix}_${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      rows.push(...objectToCsvRows(value, currentKey));
    } else if (Array.isArray(value)) {
      // Handle simple arrays by joining them, complex arrays might need specific handling
      rows.push([escapeCsvValue(currentKey), escapeCsvValue(value.join('; '))]);
    } else {
      rows.push([escapeCsvValue(currentKey), escapeCsvValue(value)]);
    }
  }
  return rows;
}

function arrayToCsvSection(title: string, dataArray: Record<string, any>[]): string {
  if (!dataArray || dataArray.length === 0) {
    return `${escapeCsvValue(title)}\nNo data available for this section.\n\n`;
  }
  // Ensure all objects have the same keys for consistent CSV columns, filter out complex objects/arrays from headers
  const allKeys = new Set<string>();
  dataArray.forEach(item => {
    Object.keys(item).forEach(key => {
      if (typeof item[key] !== 'object' || item[key] === null) { // Only include primitive types in headers
        allKeys.add(key);
      }
    });
  });
  const headers = Array.from(allKeys);

  const headerRow = headers.map(escapeCsvValue).join(',');
  const valueRows = dataArray.map(obj =>
    headers.map(header => escapeCsvValue(obj[header])).join(',')
  );
  return `${escapeCsvValue(title)}\n${headerRow}\n${valueRows.join('\n')}\n\n`;
}

// Added missing objectToCsvSection function
function objectToCsvSection(title: string, dataObject: Record<string, any>): string {
  if (!dataObject || Object.keys(dataObject).length === 0) {
    return `${escapeCsvValue(title)}\nNo data available for this section.\n\n`;
  }
  const rows = Object.entries(dataObject)
    .filter(([key, value]) => typeof value !== 'object' || value === null) // Filter out nested objects/arrays for simple K-V section
    .map(([key, value]) => 
      `${escapeCsvValue(key)},${escapeCsvValue(value)}`
    );
  if (rows.length === 0) return `${escapeCsvValue(title)}\nNo simple data available for this section.\n\n`;
  return `${escapeCsvValue(title)}\nKey,Value\n${rows.join('\n')}\n\n`;
}

function convertToCSV(report: any): string {
  let csvString = '';

  // Metadata
  csvString += "Report Metadata\n";
  if (report.metadata) {
    csvString += objectToCsvRows(report.metadata).map(row => row.join(',')).join('\n') + '\n\n';
  }

  // Executive Summary
  if (report.executiveSummary) {
    csvString += "Executive Summary\n";
    csvString += objectToCsvRows(report.executiveSummary).map(row => row.join(',')).join('\n') + '\n\n';
  }

  // Detailed sections based on report type
  const reportType = report.metadata?.reportType || 'comprehensive';

  if (reportType === 'comprehensive' || reportType === 'savings') {
    if (report.savingsAnalysis) {
      csvString += arrayToCsvSection("Savings Analysis - Monthly Trend", report.savingsAnalysis.monthlyTrend);
      csvString += arrayToCsvSection("Savings Analysis - Top Opportunities", report.savingsAnalysis.topSavingsOpportunities);
      // Add other savings metrics if they are simple key-value pairs
      const simpleSavingsMetrics = { ...report.savingsAnalysis };
      delete simpleSavingsMetrics.monthlyTrend;
      delete simpleSavingsMetrics.topSavingsOpportunities;
      csvString += objectToCsvSection("Savings Analysis - Overview", simpleSavingsMetrics);
    }
  }

  if (reportType === 'comprehensive' || reportType === 'profitability') {
    if (report.profitabilityAnalysis) {
      csvString += arrayToCsvSection("Profitability Analysis - Cost Breakdown", report.profitabilityAnalysis.costBreakdown);
      csvString += arrayToCsvSection("Profitability Analysis - Trend", report.profitabilityAnalysis.profitabilityTrend);
      const simpleProfitabilityMetrics = { ...report.profitabilityAnalysis };
      delete simpleProfitabilityMetrics.costBreakdown;
      delete simpleProfitabilityMetrics.profitabilityTrend;
      csvString += objectToCsvSection("Profitability Analysis - Overview", simpleProfitabilityMetrics);
    }
     if (report.costAnalysis && report.costAnalysis.breakdown) { // For specific profitability report
        csvString += arrayToCsvSection("Cost Analysis - Breakdown", report.costAnalysis.breakdown);
    }
  }

  if (reportType === 'comprehensive' || reportType === 'performance') {
    if (report.performanceAnalysis) {
      csvString += arrayToCsvSection("Performance Analysis - Trend", report.performanceAnalysis.performanceTrend);
      const simplePerformanceMetrics = { ...report.performanceAnalysis };
      delete simplePerformanceMetrics.performanceTrend;
      csvString += objectToCsvSection("Performance Analysis - Overview", simplePerformanceMetrics);
    }
     if (report.systemHealth) { // For specific performance report
        csvString += objectToCsvSection("System Health", report.systemHealth);
    }
  }
  
  // Recommendations and Action Items (might need more specific formatting)
  if (report.recommendations) {
     if (Array.isArray(report.recommendations) && report.recommendations.every((item: any) => typeof item === 'object')) {
        csvString += arrayToCsvSection("Recommendations", report.recommendations);
     } else if (Array.isArray(report.recommendations)) { // Simple array of strings
        csvString += "Recommendations\n" + report.recommendations.map((r: string) => escapeCsvValue(r)).join('\n') + '\n\n';
     }
  }
  if (report.strategicRecommendations) {
    csvString += arrayToCsvSection("Strategic Recommendations", report.strategicRecommendations.flatMap((sr: any) => sr.actions.map((action: string) => ({timeframe: sr.timeframe, title: sr.title, action})) ));
  }
  if (report.actionItems) {
    csvString += "Action Items\n" + report.actionItems.map((item: string) => escapeCsvValue(item)).join('\n') + '\n\n';
  }
   if (report.nextSteps) {
    csvString += "Next Steps\n" + report.nextSteps.map((item: string) => escapeCsvValue(item)).join('\n') + '\n\n';
  }

  return csvString;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient()

    // Get user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reportType, period, format, email } = body

    // Schedule report generation and email delivery
    const reportJob = {
      workspace_id: user.id,
      type: 'report_generation',
      status: 'pending',
      parameters: {
        reportType,
        period,
        format,
        email
      },
      created_at: new Date().toISOString()
    }

    const { data: job } = await supabase
      .from('jobs')
      .insert(reportJob)
      .select()
      .single()

    return NextResponse.json({
      success: true,
      jobId: job?.id || 'unknown', // Handle potentially null job
      message: job ? 'Report generation scheduled' : 'Report scheduling failed, job data unavailable',
      estimatedCompletion: job ? '2-5 minutes' : 'N/A'
    })

  } catch (error) {
    console.error('Export analytics POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
