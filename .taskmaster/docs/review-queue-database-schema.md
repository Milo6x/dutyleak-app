# Review Queue Database Schema Design

## Overview
This document outlines the enhanced database schema design for the DutyLeak review queue system, including tables for review items, assignments, history tracking, and notifications.

## Current Schema Analysis

### Existing Tables

#### review_queue (Current)
```sql
CREATE TABLE IF NOT EXISTS "public"."review_queue" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "classification_id" "uuid" NOT NULL,
    "confidence_score" numeric(3,2),
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewer_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
```

## Enhanced Schema Design

### 1. Enhanced review_queue Table

```sql
-- Enhanced review_queue table with additional fields
ALTER TABLE "public"."review_queue" 
ADD COLUMN IF NOT EXISTS "priority" "text" DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS "flagging_source" "text" DEFAULT 'automatic' CHECK (flagging_source IN ('automatic', 'manual', 'system')),
ADD COLUMN IF NOT EXISTS "risk_factors" "jsonb" DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "suggested_action" "text" DEFAULT 'review' CHECK (suggested_action IN ('review', 'approve', 'reject', 'escalate')),
ADD COLUMN IF NOT EXISTS "assignment_id" "uuid" REFERENCES "public"."review_assignments"("id"),
ADD COLUMN IF NOT EXISTS "due_date" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "reviewer_notes" "text",
ADD COLUMN IF NOT EXISTS "escalated_to" "uuid" REFERENCES "public"."profiles"("id"),
ADD COLUMN IF NOT EXISTS "escalated_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "metadata" "jsonb" DEFAULT '{}';

-- Update status constraint to include new statuses
ALTER TABLE "public"."review_queue" 
DROP CONSTRAINT IF EXISTS review_queue_status_check;

ALTER TABLE "public"."review_queue" 
ADD CONSTRAINT review_queue_status_check 
CHECK (status IN ('pending', 'assigned', 'in_review', 'approved', 'rejected', 'escalated', 'cancelled'));
```

### 2. Review Assignments Table

```sql
CREATE TABLE IF NOT EXISTS "public"."review_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL REFERENCES "public"."workspaces"("id") ON DELETE CASCADE,
    "reviewer_id" "uuid" NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    "assigned_by" "uuid" NOT NULL REFERENCES "public"."profiles"("id"),
    "assignment_type" "text" DEFAULT 'manual' CHECK (assignment_type IN ('manual', 'automatic', 'load_balanced')),
    "max_items" integer DEFAULT 10,
    "current_items" integer DEFAULT 0,
    "expertise_areas" "text"[] DEFAULT '{}',
    "priority_preference" "text" DEFAULT 'medium' CHECK (priority_preference IN ('low', 'medium', 'high', 'critical')),
    "status" "text" DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "review_assignments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."review_assignments" OWNER TO "postgres";

COMMENT ON TABLE "public"."review_assignments" IS 'Manages reviewer assignments and workload distribution';
```

### 3. Review History Table

```sql
CREATE TABLE IF NOT EXISTS "public"."review_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_queue_id" "uuid" NOT NULL REFERENCES "public"."review_queue"("id") ON DELETE CASCADE,
    "action" "text" NOT NULL CHECK (action IN ('created', 'assigned', 'started', 'approved', 'rejected', 'escalated', 'reassigned', 'commented')),
    "actor_id" "uuid" REFERENCES "public"."profiles"("id"),
    "previous_status" "text",
    "new_status" "text",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}',
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "review_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."review_history" OWNER TO "postgres";

COMMENT ON TABLE "public"."review_history" IS 'Tracks all actions and changes in the review process';
```

### 4. Review Comments Table

```sql
CREATE TABLE IF NOT EXISTS "public"."review_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_queue_id" "uuid" NOT NULL REFERENCES "public"."review_queue"("id") ON DELETE CASCADE,
    "author_id" "uuid" NOT NULL REFERENCES "public"."profiles"("id"),
    "content" "text" NOT NULL,
    "comment_type" "text" DEFAULT 'comment' CHECK (comment_type IN ('comment', 'approval', 'rejection', 'request_info', 'escalation')),
    "is_internal" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}',
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "review_comments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."review_comments" OWNER TO "postgres";

COMMENT ON TABLE "public"."review_comments" IS 'Stores comments and notes for review items';
```

### 5. Review Notifications Table

```sql
CREATE TABLE IF NOT EXISTS "public"."review_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL REFERENCES "public"."workspaces"("id") ON DELETE CASCADE,
    "recipient_id" "uuid" NOT NULL REFERENCES "public"."profiles"("id"),
    "review_queue_id" "uuid" REFERENCES "public"."review_queue"("id") ON DELETE CASCADE,
    "notification_type" "text" NOT NULL CHECK (notification_type IN ('assignment', 'due_soon', 'overdue', 'escalation', 'completion', 'comment')),
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
    "delivery_method" "text"[] DEFAULT '{"in_app"}' CHECK (array_length(delivery_method, 1) > 0),
    "scheduled_for" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}',
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "review_notifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."review_notifications" OWNER TO "postgres";

COMMENT ON TABLE "public"."review_notifications" IS 'Manages notifications for review queue events';
```

### 6. Review Analytics Table

```sql
CREATE TABLE IF NOT EXISTS "public"."review_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL REFERENCES "public"."workspaces"("id") ON DELETE CASCADE,
    "reviewer_id" "uuid" REFERENCES "public"."profiles"("id"),
    "date" "date" NOT NULL DEFAULT CURRENT_DATE,
    "items_reviewed" integer DEFAULT 0,
    "items_approved" integer DEFAULT 0,
    "items_rejected" integer DEFAULT 0,
    "items_escalated" integer DEFAULT 0,
    "avg_review_time_minutes" numeric(10,2),
    "accuracy_score" numeric(5,2),
    "metadata" "jsonb" DEFAULT '{}',
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "review_analytics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "review_analytics_unique_daily" UNIQUE ("workspace_id", "reviewer_id", "date")
);

ALTER TABLE "public"."review_analytics" OWNER TO "postgres";

COMMENT ON TABLE "public"."review_analytics" IS 'Daily analytics for review queue performance';
```

## Indexes for Performance

```sql
-- Review queue indexes
CREATE INDEX IF NOT EXISTS "idx_review_queue_workspace_status" ON "public"."review_queue" ("workspace_id", "status");
CREATE INDEX IF NOT EXISTS "idx_review_queue_reviewer_status" ON "public"."review_queue" ("reviewer_id", "status");
CREATE INDEX IF NOT EXISTS "idx_review_queue_priority_created" ON "public"."review_queue" ("priority", "created_at");
CREATE INDEX IF NOT EXISTS "idx_review_queue_due_date" ON "public"."review_queue" ("due_date") WHERE "due_date" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_review_queue_assignment" ON "public"."review_queue" ("assignment_id");

-- Review assignments indexes
CREATE INDEX IF NOT EXISTS "idx_review_assignments_workspace_status" ON "public"."review_assignments" ("workspace_id", "status");
CREATE INDEX IF NOT EXISTS "idx_review_assignments_reviewer" ON "public"."review_assignments" ("reviewer_id");

-- Review history indexes
CREATE INDEX IF NOT EXISTS "idx_review_history_queue_id" ON "public"."review_history" ("review_queue_id");
CREATE INDEX IF NOT EXISTS "idx_review_history_actor_created" ON "public"."review_history" ("actor_id", "created_at");

-- Review comments indexes
CREATE INDEX IF NOT EXISTS "idx_review_comments_queue_id" ON "public"."review_comments" ("review_queue_id");
CREATE INDEX IF NOT EXISTS "idx_review_comments_author_created" ON "public"."review_comments" ("author_id", "created_at");

-- Review notifications indexes
CREATE INDEX IF NOT EXISTS "idx_review_notifications_recipient_status" ON "public"."review_notifications" ("recipient_id", "status");
CREATE INDEX IF NOT EXISTS "idx_review_notifications_workspace_type" ON "public"."review_notifications" ("workspace_id", "notification_type");
CREATE INDEX IF NOT EXISTS "idx_review_notifications_scheduled" ON "public"."review_notifications" ("scheduled_for") WHERE "sent_at" IS NULL;

-- Review analytics indexes
CREATE INDEX IF NOT EXISTS "idx_review_analytics_workspace_date" ON "public"."review_analytics" ("workspace_id", "date");
CREATE INDEX IF NOT EXISTS "idx_review_analytics_reviewer_date" ON "public"."review_analytics" ("reviewer_id", "date");
```

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE "public"."review_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."review_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."review_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."review_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."review_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."review_analytics" ENABLE ROW LEVEL SECURITY;

-- Review queue policies
CREATE POLICY "review_queue_workspace_access" ON "public"."review_queue"
    FOR ALL USING (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = auth.uid()
        )
    );

-- Review assignments policies
CREATE POLICY "review_assignments_workspace_access" ON "public"."review_assignments"
    FOR ALL USING (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = auth.uid()
        )
    );

-- Review history policies
CREATE POLICY "review_history_workspace_access" ON "public"."review_history"
    FOR ALL USING (
        "review_queue_id" IN (
            SELECT "id" FROM "public"."review_queue" 
            WHERE "workspace_id" IN (
                SELECT "workspace_id" FROM "public"."workspace_users" 
                WHERE "user_id" = auth.uid()
            )
        )
    );

-- Review comments policies
CREATE POLICY "review_comments_workspace_access" ON "public"."review_comments"
    FOR ALL USING (
        "review_queue_id" IN (
            SELECT "id" FROM "public"."review_queue" 
            WHERE "workspace_id" IN (
                SELECT "workspace_id" FROM "public"."workspace_users" 
                WHERE "user_id" = auth.uid()
            )
        )
    );

-- Review notifications policies
CREATE POLICY "review_notifications_recipient_access" ON "public"."review_notifications"
    FOR ALL USING (
        "recipient_id" = auth.uid() OR
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = auth.uid() AND "role" IN ('admin', 'owner')
        )
    );

-- Review analytics policies
CREATE POLICY "review_analytics_workspace_access" ON "public"."review_analytics"
    FOR ALL USING (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = auth.uid()
        )
    );
```

## Database Functions

```sql
-- Function to automatically update review analytics
CREATE OR REPLACE FUNCTION update_review_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily analytics when review status changes
    IF OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected', 'escalated') THEN
        INSERT INTO review_analytics (
            workspace_id, 
            reviewer_id, 
            date,
            items_reviewed,
            items_approved,
            items_rejected,
            items_escalated
        )
        VALUES (
            NEW.workspace_id,
            NEW.reviewer_id,
            CURRENT_DATE,
            1,
            CASE WHEN NEW.status = 'approved' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'rejected' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'escalated' THEN 1 ELSE 0 END
        )
        ON CONFLICT (workspace_id, reviewer_id, date)
        DO UPDATE SET
            items_reviewed = review_analytics.items_reviewed + 1,
            items_approved = review_analytics.items_approved + 
                CASE WHEN NEW.status = 'approved' THEN 1 ELSE 0 END,
            items_rejected = review_analytics.items_rejected + 
                CASE WHEN NEW.status = 'rejected' THEN 1 ELSE 0 END,
            items_escalated = review_analytics.items_escalated + 
                CASE WHEN NEW.status = 'escalated' THEN 1 ELSE 0 END,
            updated_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for review analytics
CREATE TRIGGER trigger_update_review_analytics
    AFTER UPDATE ON review_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_review_analytics();

-- Function to auto-assign reviews based on workload
CREATE OR REPLACE FUNCTION auto_assign_review(review_id uuid)
RETURNS uuid AS $$
DECLARE
    target_workspace_id uuid;
    assigned_reviewer_id uuid;
    assignment_id uuid;
BEGIN
    -- Get workspace for the review item
    SELECT workspace_id INTO target_workspace_id
    FROM review_queue
    WHERE id = review_id;
    
    -- Find reviewer with lowest current workload
    SELECT ra.reviewer_id, ra.id INTO assigned_reviewer_id, assignment_id
    FROM review_assignments ra
    WHERE ra.workspace_id = target_workspace_id
        AND ra.status = 'active'
        AND ra.current_items < ra.max_items
    ORDER BY (ra.current_items::float / ra.max_items::float) ASC
    LIMIT 1;
    
    IF assigned_reviewer_id IS NOT NULL THEN
        -- Update review queue with assignment
        UPDATE review_queue
        SET 
            reviewer_id = assigned_reviewer_id,
            assignment_id = assignment_id,
            status = 'assigned',
            updated_at = now()
        WHERE id = review_id;
        
        -- Update assignment workload
        UPDATE review_assignments
        SET 
            current_items = current_items + 1,
            updated_at = now()
        WHERE id = assignment_id;
        
        -- Log the assignment
        INSERT INTO review_history (review_queue_id, action, actor_id, new_status, notes)
        VALUES (review_id, 'assigned', assigned_reviewer_id, 'assigned', 'Auto-assigned based on workload');
    END IF;
    
    RETURN assigned_reviewer_id;
END;
$$ LANGUAGE plpgsql;
```

## API Endpoints Design

### Core Review Queue Endpoints

1. **GET /api/review-queue** - List review items (✅ Implemented)
2. **POST /api/review-queue** - Bulk operations (✅ Implemented)
3. **PATCH /api/review-queue** - Update single item (✅ Implemented)

### New Endpoints Needed

4. **POST /api/review-queue/assign** - Manual assignment
5. **GET /api/review-queue/assignments** - List assignments
6. **POST /api/review-queue/assignments** - Create assignment
7. **GET /api/review-queue/history/{id}** - Get review history
8. **POST /api/review-queue/comments** - Add comment
9. **GET /api/review-queue/analytics** - Get analytics
10. **GET /api/review-queue/notifications** - Get notifications

## Implementation Priority

1. **Phase 1**: Enhanced review_queue table and basic assignment system
2. **Phase 2**: History tracking and comments
3. **Phase 3**: Notifications system
4. **Phase 4**: Analytics and reporting
5. **Phase 5**: Advanced assignment algorithms

## Migration Strategy

1. Create new tables without breaking existing functionality
2. Migrate existing data to enhanced schema
3. Update API endpoints incrementally
4. Add new features progressively
5. Deprecate old endpoints gracefully