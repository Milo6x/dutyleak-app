import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

const processReviewSchema = z.object({
  item_id: z.string(),
  action: z.enum(['approve', 'reject', 'modify', 'request-info', 'escalate']),
  notes: z.string().min(1, 'Notes are required'),
  modifications: z.object({
    hs_code: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    description: z.string().optional(),
  }).optional(),
  assignee: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's workspace
    const { data: workspaceUser, error: workspaceError } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', session.user.id)
      .single()

    if (workspaceError || !workspaceUser) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = processReviewSchema.parse(body)

    // Get the review item
    const { data: reviewItem, error: itemError } = await supabase
      .from('review_queue')
      .select(`
        *,
        classifications!inner(id, product_id, hs6, hs8, description, confidence_score)
      `)
      .eq('id', validatedData.item_id)
      .eq('workspace_id', workspaceUser.workspace_id)
      .single()

    if (itemError || !reviewItem) {
      return NextResponse.json(
        { error: 'Review item not found' },
        { status: 404 }
      )
    }

    // Process the review action
    const now = new Date().toISOString()
    const updateData: any = {
      reviewer_id: session.user.id,
      reviewer_notes: validatedData.notes,
      reviewed_at: now,
    }

    let classificationUpdate: any = null

    switch (validatedData.action) {
      case 'approve':
        updateData.status = 'approved'
        // Set classification as active
        classificationUpdate = {
          is_active: true,
          reviewed_by: session.user.id,
          reviewed_at: now,
        }
        break

      case 'reject':
        updateData.status = 'rejected'
        // Mark classification as inactive
        classificationUpdate = {
          is_active: false,
          reviewed_by: session.user.id,
          reviewed_at: now,
        }
        break

      case 'modify':
        if (!validatedData.modifications) {
          return NextResponse.json(
            { error: 'Modifications are required for modify action' },
            { status: 400 }
          )
        }
        
        updateData.status = 'approved'
        
        // Update the classification with modifications
        classificationUpdate = {
          hs6: validatedData.modifications.hs_code?.substring(0, 6),
          hs8: validatedData.modifications.hs_code,
          description: validatedData.modifications.description,
          confidence_score: validatedData.modifications.confidence,
          is_active: true,
          reviewed_by: session.user.id,
          reviewed_at: now,
          modified_in_review: true,
        }
        break

      case 'request-info':
        updateData.status = 'needs-info'
        updateData.info_requested_at = now
        break

      case 'escalate':
        updateData.status = 'escalated'
        updateData.escalated_at = now
        if (validatedData.assignee) {
          updateData.assigned_to = validatedData.assignee
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Start transaction
    const { error: updateError } = await supabase
      .from('review_queue')
      .update(updateData)
      .eq('id', validatedData.item_id)

    if (updateError) {
      console.error('Error updating review item:', updateError)
      return NextResponse.json(
        { error: 'Failed to update review item' },
        { status: 500 }
      )
    }

    // Update classification if needed
    if (classificationUpdate) {
      const { error: classError } = await supabase
        .from('classifications')
        .update(classificationUpdate)
        .eq('id', reviewItem.classification_id)

      if (classError) {
        console.error('Error updating classification:', classError)
        return NextResponse.json(
          { error: 'Failed to update classification' },
          { status: 500 }
        )
      }

      // If approved or modified, update product's active classification
      if (validatedData.action === 'approve' || validatedData.action === 'modify') {
        const { error: productError } = await supabase
          .from('products')
          .update({ active_classification_id: reviewItem.classification_id })
          .eq('id', reviewItem.classifications.product_id)

        if (productError) {
          console.error('Error updating product classification:', productError)
          // Don't fail the request for this error, just log it
        }
      }
    }

    // Log the review action for audit trail
    const { error: logError } = await supabase
      .from('review_audit_log')
      .insert({
        workspace_id: workspaceUser.workspace_id,
        review_item_id: validatedData.item_id,
        classification_id: reviewItem.classification_id,
        product_id: reviewItem.classifications.product_id,
        action: validatedData.action,
        reviewer_id: session.user.id,
        notes: validatedData.notes,
        modifications: validatedData.modifications,
        assignee: validatedData.assignee,
        created_at: now,
      })

    if (logError) {
      console.error('Error logging review action:', logError)
      // Don't fail the request for logging errors
    }

    // Send notification if escalated or info requested
    if (validatedData.action === 'escalate' || validatedData.action === 'request-info') {
      try {
        await sendReviewNotification({
          action: validatedData.action,
          itemId: validatedData.item_id,
          productTitle: reviewItem.classifications.products?.title,
          assignee: validatedData.assignee,
          notes: validatedData.notes,
          workspaceId: workspaceUser.workspace_id,
        })
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError)
        // Don't fail the request for notification errors
      }
    }

    return NextResponse.json({
      success: true,
      action: validatedData.action,
      item_id: validatedData.item_id,
    })

  } catch (error) {
    console.error('Error processing review:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to send notifications
async function sendReviewNotification({
  action,
  itemId,
  productTitle,
  assignee,
  notes,
  workspaceId,
}: {
  action: string
  itemId: string
  productTitle?: string
  assignee?: string
  notes: string
  workspaceId: string
}) {
  // This would integrate with your notification system
  // For now, we'll just log the notification
  console.log('Review notification:', {
    action,
    itemId,
    productTitle,
    assignee,
    notes,
    workspaceId,
  })

  // TODO: Implement actual notification sending
  // - Email notifications
  // - In-app notifications
  // - Slack/Teams integration
  // - SMS for urgent escalations
}

// Batch processing endpoint
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's workspace
    const { data: workspaceUser, error: workspaceError } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', session.user.id)
      .single()

    if (workspaceError || !workspaceUser) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { item_ids, action, notes } = body

    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return NextResponse.json(
        { error: 'item_ids must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Batch action must be approve or reject' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    // Process each item
    for (const itemId of item_ids) {
      try {
        const processRequest = new NextRequest(
          new URL('/api/review-queue/process', request.url),
          {
            method: 'POST',
            body: JSON.stringify({
              item_id: itemId,
              action,
              notes: notes || `Bulk ${action} action`,
            }),
            headers: request.headers,
          }
        )

        const result = await POST(processRequest)
        const resultData = await result.json()

        if (result.ok) {
          results.push({ item_id: itemId, success: true })
        } else {
          errors.push({ item_id: itemId, error: resultData.error })
        }
      } catch (error) {
        errors.push({ item_id: itemId, error: 'Processing failed' })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      errors: errors.length,
      results,
    })

  } catch (error) {
    console.error('Error processing batch review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}