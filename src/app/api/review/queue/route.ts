import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()

    // Get workspace access and check permissions
    const { user, workspace_id } = await getWorkspaceAccess(supabase)
    // For GET, DATA_VIEW is appropriate.
    await checkUserPermission(user.id, workspace_id, 'DATA_VIEW')

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('review_queue')
      .select(`
        id,
        classification_id,
        confidence_score,
        created_at,
        product_id,
        reason,
        reviewed_at,
        reviewer_notes,
        status,
        updated_at,
        workspace_id,
        type, 
        priority,
        title, 
        description, 
        assigned_to,
        assigned_at,
        due_date,
        metadata, 
        products (id, title, asin, category, description),
        classifications (id, hs6, hs8, description, confidence_score, source)
      `)
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      // Assuming 'priority' column exists in 'review_queue' table
      query = query.eq('priority', priority) 
    }
    if (type) {
      // Assuming 'type' column exists in 'review_queue' table
      query = query.eq('type', type)
    }

    const { data: reviewItems, error: reviewError, count: totalCount } = await query

    if (reviewError) {
      console.error('Review queue fetch error:', reviewError)
      return NextResponse.json({ error: 'Failed to fetch review queue' }, { status: 500 })
    }

    // Return review items, comments are assumed to be part of 'metadata' or a separate field if schema changes
    // For now, if comments are in metadata, they'd be part of the item.
    // If 'comments' is a dedicated JSONB field, it should be in the select string.
    // Assuming 'metadata' might contain 'currentValue', 'suggestedValue', 'impact' etc.
    // The ReviewItem interface in UI expects 'products' and 'classifications' as nested objects.
    // The ReviewItem interface in UI expects 'products' and 'classifications' as nested objects.
    const processedItems = (reviewItems || []).map(item => {
      // Type assertion for item to help TypeScript understand its structure,
      // especially for joined tables and JSONB columns.
      const typedItem = item as any; // Using 'any' for simplicity here, ideally a more specific type.

      const productData = typedItem.products && typeof typedItem.products === 'object' && !Array.isArray(typedItem.products)
        ? typedItem.products
        : null;
      const classificationData = typedItem.classifications && typeof typedItem.classifications === 'object' && !Array.isArray(typedItem.classifications)
        ? typedItem.classifications
        : null;
      
      const metadata = typedItem.metadata as { comments?: any[], [key: string]: any } | null;

      return {
        ...typedItem, // Spread the item, assuming it's an object
        products: productData,
        classifications: classificationData,
        comments: metadata?.comments || []
      };
    });

    // Get summary statistics (consider if this needs to be filtered too, or is global for workspace)
    // For now, keeping summary global for the workspace as before.
    const { data: statsDataForSummary, error: summaryStatsError } = await supabase
      .from('review_queue')
      .select('status, priority, type') // Select all fields needed for summary
      .eq('workspace_id', workspace_id)

    if (summaryStatsError) {
        console.error('Error fetching summary stats for review queue:', summaryStatsError);
        // Proceed without summary or return error, for now proceed
    }
    
    const summary = calculateQueueSummary(statsDataForSummary || [])

    return NextResponse.json({
      success: true,
      items: processedItems,
      summary,
      pagination: {
        limit,
        offset,
        total: totalCount || 0 // Use the count from the query
      }
    })

  } catch (error) {
    console.error('Review queue API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()

    // Get workspace access and check permissions
    // For POST (creating a review item), DATA_CREATE or a more specific review permission is appropriate.
    // Using DATA_CREATE as a general permission that implies ability to create review-worthy items.
    const { user, workspace_id } = await getWorkspaceAccess(supabase)
    await checkUserPermission(user.id, workspace_id, 'DATA_CREATE') 

    const body = await request.json()
    const {
      type,
      title,
      description,
      priority = 'medium',
      productId,
      productName,
      currentValue,
      suggestedValue,
      confidence,
      impact,
      metadata = {},
      classificationId // Added classificationId to destructure
    } = body

    // Validate required fields
    // classificationId is now also important if it's a classification review type
    if (!type || !title || !description || (type === 'classification' && !classificationId)) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, description. Classification ID is required for classification reviews.' },
        { status: 400 }
      )
    }

    // Insert new review item
    const { data: newItem, error: insertError } = await supabase
      .from('review_queue')
      .insert({
        classification_id: classificationId || null, // Use provided classificationId or null
        product_id: productId,
        workspace_id: workspace_id,
        status: 'pending',
        confidence_score: confidence,
        reason: description || 'Review requested',
        type, // Store type
        priority, // Store priority
        title, // Store title (if different from product title)
        description: description || 'Review requested', // Use main description as reason if no specific reason
        metadata: { // Store other relevant details in metadata
            productName, 
            currentValue, 
            suggestedValue, 
            impact, 
            ...(metadata || {}) // Merge with any existing metadata passed
        }
      })
      .select(`
        *, 
        products (id, title, asin, category, description), 
        classifications (id, hs6, hs8, description, confidence_score, source)
      `)
      .single()

    if (insertError) {
      console.error('Review item creation error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create review item' },
        { status: 500 }
      )
    }
    
    // newItem is the result of .insert().select(...).single()
    // Explicitly cast to 'any' to bypass strict type checking for nested/JSON properties if TS struggles
    const typedNewItem = newItem as any;

    const processedNewItem = {
      ...typedNewItem,
      products: typedNewItem.products && typeof typedNewItem.products === 'object' && !Array.isArray(typedNewItem.products)
        ? typedNewItem.products
        : null,
      classifications: typedNewItem.classifications && typeof typedNewItem.classifications === 'object' && !Array.isArray(typedNewItem.classifications)
        ? typedNewItem.classifications
        : null,
      // Access metadata safely, assuming it might contain a comments array
      comments: (typedNewItem.metadata as { comments?: any[] })?.comments || []
    };

    return NextResponse.json({
      success: true,
      item: processedNewItem
    })

  } catch (error) {
    console.error('Review queue POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()

    // Get workspace access and check permissions
    // For PATCH (updating a review item), DATA_UPDATE or a specific review permission is appropriate.
    const { user, workspace_id } = await getWorkspaceAccess(supabase)
    await checkUserPermission(user.id, workspace_id, 'DATA_UPDATE') 

    const body = await request.json()
    const { id, status, reviewedBy, metadata, newHsCode, newHsDescription, newConfidence } = body // Added fields for override

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      )
    }

    // Fetch the review item to get classification_id
    const { data: reviewItem, error: fetchError } = await supabase
      .from('review_queue')
      .select('classification_id, product_id')
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .single()

    if (fetchError || !reviewItem) {
      return NextResponse.json({ error: 'Review item not found' }, { status: 404 })
    }

    // Update review item
    const updateData: any = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: reviewedBy || user.email, // Store who reviewed it
    }
    if (metadata) {
        updateData.metadata = metadata; // Store any additional metadata from review
    }


    // If status is 'approved' and new HS code details are provided (override)
    // Or if status is 'rejected' but a correction is provided
    if ((status === 'approved' || status === 'rejected') && newHsCode && reviewItem.classification_id) {
      const { error: classificationUpdateError } = await supabase
        .from('classifications')
        .update({
          hs_code: newHsCode, // Assuming newHsCode is the full code
          hs6: newHsCode.substring(0, 6),
          hs8: newHsCode.length >= 8 ? newHsCode.substring(0, 8) : null,
          description: newHsDescription || null, // Description for the new code
          confidence_score: newConfidence || 1.0, // Confidence for manual override is typically high
          source: 'manual_review',
          is_active: true, // Make this the active classification
          // Potentially mark previous active classification for this product_id as inactive
        })
        .eq('id', reviewItem.classification_id)
        .eq('workspace_id', workspace_id); // Ensure workspace scope

      if (classificationUpdateError) {
        console.error('Error updating classification record:', classificationUpdateError);
        // Decide if this should be a hard fail or just a warning
        // For now, we'll proceed with updating the review queue item status but log this error.
        updateData.reviewer_notes = `${updateData.reviewer_notes || ''} (Failed to update main classification: ${classificationUpdateError.message})`;
      } else {
         // Optionally, deactivate other classifications for the same product_id
         await supabase
           .from('classifications')
           .update({ is_active: false })
           .eq('product_id', reviewItem.product_id)
           .neq('id', reviewItem.classification_id); // Don't deactivate the one just updated
      }
    } else if (status === 'approved' && reviewItem.classification_id) {
        // Mark the existing classification as human-verified and active
        await supabase
            .from('classifications')
            .update({ is_human_verified: true, is_active: true, source: 'manual_review_approved' })
            .eq('id', reviewItem.classification_id)
            .eq('workspace_id', workspace_id);
        
        // Optionally, deactivate other classifications for the same product_id
         await supabase
           .from('classifications')
           .update({ is_active: false })
           .eq('product_id', reviewItem.product_id)
           .neq('id', reviewItem.classification_id);
    }


    const { data: updatedItem, error: updateError } = await supabase
      .from('review_queue')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .select()
      .single()

    if (updateError) {
      console.error('Review item update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update review item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item: updatedItem, // Assuming updatedItem structure matches what UI expects or UI adapts
      // comments: [] // Comments still not implemented here, would be part of updatedItem if in metadata
    })

  } catch (error) {
    console.error('Review queue PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateQueueSummary(items: any[]) {
  const summary = {
    total: items.length,
    pending: 0,
    inReview: 0,
    approved: 0,
    rejected: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    classification: 0,
    optimization: 0,
    validation: 0,
    other: 0
  }

  items.forEach(item => {
    // Count by status
    switch (item.status) {
      case 'pending':
        summary.pending++
        break
      case 'in-review':
        summary.inReview++
        break
      case 'approved':
        summary.approved++
        break
      case 'rejected':
        summary.rejected++
        break
    }

    // Count by priority
    switch (item.priority) {
      case 'high':
        summary.highPriority++
        break
      case 'medium':
        summary.mediumPriority++
        break
      case 'low':
        summary.lowPriority++
        break
    }

    // Count by type
    switch (item.type) {
      case 'classification':
        summary.classification++
        break
      case 'optimization':
        summary.optimization++
        break
      case 'validation':
        summary.validation++
        break
      default:
        summary.other++
        break
    }
  })

  return summary
}
