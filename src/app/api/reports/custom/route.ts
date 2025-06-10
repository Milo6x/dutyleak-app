import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
// import { cookies } from 'next/headers' // If needed for auth context

// Define a mapping from dataSource keys to actual table names if they differ
// And define which column should be used for workspace filtering
const dataSourceConfig: Record<string, { tableName: string; workspaceColumn: string }> = {
  products: { tableName: 'products', workspaceColumn: 'workspace_id' }, // Assuming products are scoped by workspace_id
  classifications: { tableName: 'classifications', workspaceColumn: 'workspace_id' },
  savings_ledger: { tableName: 'savings_ledger', workspaceColumn: 'workspace_id' },
  // Add other sources like 'jobs', 'review_queue' here with their table names and workspace column
};

// Define fields that are allowed to be selected for each data source
// This is a security measure to prevent arbitrary field selection
const ALLOWED_FIELDS: Record<string, string[]> = {
  products: ['id', 'name', 'category', 'cost', 'price', 'created_at', 'workspace_id', 'description', 'hs_code', 'origin_country'],
  classifications: ['id', 'product_id', 'classification_code', 'confidence_score', 'source', 'created_at', 'workspace_id', 'is_active', 'notes'],
  savings_ledger: ['id', 'product_id', 'savings_amount', 'savings_percentage', 'created_at', 'workspace_id', 'scenario_id', 'calculation_id'],
};


export async function POST(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Assuming user.id can be used as workspace_id for now, or derive workspace_id from user session/profile
    // In a multi-tenant app, you'd typically get the user's current workspace_id from their session or a user profile table.
    // For MetricsCalculator, we used user.id as workspaceId. Let's assume user.id is the workspace_id for now.
    const workspaceId = user.id; 

    const body = await request.json();
    const { dataSource, fields, dateRange, filters } = body;

    if (!dataSource || !dataSourceConfig[dataSource]) {
      return NextResponse.json({ error: 'Invalid or missing data source' }, { status: 400 });
    }
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json({ error: 'No fields selected for the report' }, { status: 400 });
    }

    const config = dataSourceConfig[dataSource];
    const allowedFieldsForSource = ALLOWED_FIELDS[dataSource];

    // Validate selected fields against allowed fields for the source
    const invalidFields = fields.filter(field => !allowedFieldsForSource.includes(field));
    if (invalidFields.length > 0) {
      return NextResponse.json({ error: `Invalid fields selected: ${invalidFields.join(', ')}` }, { status: 400 });
    }

    // Construct the query
    // let query = supabase.from(config.tableName).select(fields.join(',')); // Original approach
    let queryBuilder;
    const selectedFields = fields.join(',');

    // Use a switch to satisfy TypeScript's requirement for literal table names
    switch (dataSource as keyof typeof dataSourceConfig) {
      case 'products':
        queryBuilder = supabase.from('products').select(selectedFields);
        break;
      case 'classifications':
        queryBuilder = supabase.from('classifications').select(selectedFields);
        break;
      case 'savings_ledger':
        queryBuilder = supabase.from('savings_ledger').select(selectedFields);
        break;
      default:
        // This case should ideally not be reached due to prior validation
        return NextResponse.json({ error: 'Invalid data source processed' }, { status: 500 });
    }


    // Apply workspace filter - IMPORTANT for data security/isolation
    queryBuilder = queryBuilder.eq(config.workspaceColumn, workspaceId);

    // TODO: Apply dateRange filter if provided and applicable
    // Example: if (dateRange && dateRange.from && dateRange.to && allowedFieldsForSource.includes('created_at')) {
    //   query = query.gte('created_at', dateRange.from).lte('created_at', dateRange.to);
    // }

    // TODO: Apply other filters if provided
    // Example: if (filters && Array.isArray(filters)) {
    //   filters.forEach(filter => {
    //     if (allowedFieldsForSource.includes(filter.field) && filter.operator && filter.value !== undefined) {
    //       query = query[filter.operator](filter.field, filter.value);
    //     }
    //   });
    // }
    
    queryBuilder = queryBuilder.limit(500); // Add a reasonable limit to prevent abuse/performance issues

    const { data: reportData, error: queryError } = await queryBuilder;

    if (queryError) {
      console.error('Error fetching custom report data:', queryError);
      return NextResponse.json({ error: `Failed to fetch report data: ${queryError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: reportData });

  } catch (error) {
    console.error('Custom report API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
