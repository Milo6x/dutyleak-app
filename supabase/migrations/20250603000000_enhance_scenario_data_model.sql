-- Enhanced Scenario Data Model for Advanced Scenario Modeling and Comparison
-- This migration enhances the existing duty_scenarios table and adds new tables for comprehensive scenario management

-- Create scenario_groups table for organizing related scenarios
CREATE TABLE IF NOT EXISTS "public"."scenario_groups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);

-- Create scenario_templates table for reusable scenario configurations
CREATE TABLE IF NOT EXISTS "public"."scenario_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL CHECK ("category" IN ('optimization', 'comparison', 'analysis')),
    "configuration" "jsonb" NOT NULL DEFAULT '{}'::"jsonb",
    "is_public" boolean DEFAULT false,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Create enhanced_scenarios table for comprehensive scenario data
CREATE TABLE IF NOT EXISTS "public"."enhanced_scenarios" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "group_id" "uuid",
    "template_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "scenario_type" "text" NOT NULL CHECK ("scenario_type" IN ('baseline', 'optimization', 'comparison', 'what_if')),
    "status" "text" DEFAULT 'draft' CHECK ("status" IN ('draft', 'active', 'archived', 'completed')),
    "configuration" "jsonb" NOT NULL DEFAULT '{}'::"jsonb",
    "results" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone
);

-- Create scenario_products table for many-to-many relationship between scenarios and products
CREATE TABLE IF NOT EXISTS "public"."scenario_products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "scenario_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "configuration" "jsonb" DEFAULT '{}'::"jsonb",
    "results" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Create scenario_comparisons table for storing comparison results
CREATE TABLE IF NOT EXISTS "public"."scenario_comparisons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "scenario_ids" "uuid"[] NOT NULL,
    "comparison_type" "text" NOT NULL CHECK ("comparison_type" IN ('side_by_side', 'matrix', 'timeline')),
    "results" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Create optimization_recommendations table
CREATE TABLE IF NOT EXISTS "public"."optimization_recommendations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "scenario_id" "uuid",
    "product_id" "uuid",
    "recommendation_type" "text" NOT NULL CHECK ("recommendation_type" IN ('classification', 'origin', 'shipping', 'fba', 'trade_agreement')),
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "impact_analysis" "jsonb" NOT NULL DEFAULT '{}'::"jsonb",
    "implementation_requirements" "jsonb" DEFAULT '{}'::"jsonb",
    "confidence_score" numeric(3,2) CHECK ("confidence_score" >= 0 AND "confidence_score" <= 1),
    "priority" "text" DEFAULT 'medium' CHECK ("priority" IN ('low', 'medium', 'high', 'critical')),
    "status" "text" DEFAULT 'pending' CHECK ("status" IN ('pending', 'accepted', 'rejected', 'implemented')),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Add primary key constraints
ALTER TABLE ONLY "public"."scenario_groups"
    ADD CONSTRAINT "scenario_groups_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."scenario_templates"
    ADD CONSTRAINT "scenario_templates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."enhanced_scenarios"
    ADD CONSTRAINT "enhanced_scenarios_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."scenario_products"
    ADD CONSTRAINT "scenario_products_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."scenario_comparisons"
    ADD CONSTRAINT "scenario_comparisons_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."optimization_recommendations"
    ADD CONSTRAINT "optimization_recommendations_pkey" PRIMARY KEY ("id");

-- Add unique constraints
ALTER TABLE ONLY "public"."scenario_products"
    ADD CONSTRAINT "scenario_products_scenario_product_unique" UNIQUE ("scenario_id", "product_id");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."scenario_groups"
    ADD CONSTRAINT "scenario_groups_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."scenario_groups"
    ADD CONSTRAINT "scenario_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."scenario_templates"
    ADD CONSTRAINT "scenario_templates_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."scenario_templates"
    ADD CONSTRAINT "scenario_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."enhanced_scenarios"
    ADD CONSTRAINT "enhanced_scenarios_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."enhanced_scenarios"
    ADD CONSTRAINT "enhanced_scenarios_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."scenario_groups"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."enhanced_scenarios"
    ADD CONSTRAINT "enhanced_scenarios_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."scenario_templates"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."enhanced_scenarios"
    ADD CONSTRAINT "enhanced_scenarios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."scenario_products"
    ADD CONSTRAINT "scenario_products_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "public"."enhanced_scenarios"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."scenario_products"
    ADD CONSTRAINT "scenario_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."scenario_comparisons"
    ADD CONSTRAINT "scenario_comparisons_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."scenario_comparisons"
    ADD CONSTRAINT "scenario_comparisons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."optimization_recommendations"
    ADD CONSTRAINT "optimization_recommendations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."optimization_recommendations"
    ADD CONSTRAINT "optimization_recommendations_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "public"."enhanced_scenarios"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."optimization_recommendations"
    ADD CONSTRAINT "optimization_recommendations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX "idx_scenario_groups_workspace" ON "public"."scenario_groups" USING "btree" ("workspace_id");
CREATE INDEX "idx_scenario_groups_created_by" ON "public"."scenario_groups" USING "btree" ("created_by");

CREATE INDEX "idx_scenario_templates_workspace" ON "public"."scenario_templates" USING "btree" ("workspace_id");
CREATE INDEX "idx_scenario_templates_category" ON "public"."scenario_templates" USING "btree" ("category");
CREATE INDEX "idx_scenario_templates_public" ON "public"."scenario_templates" USING "btree" ("is_public");

CREATE INDEX "idx_enhanced_scenarios_workspace" ON "public"."enhanced_scenarios" USING "btree" ("workspace_id");
CREATE INDEX "idx_enhanced_scenarios_group" ON "public"."enhanced_scenarios" USING "btree" ("group_id");
CREATE INDEX "idx_enhanced_scenarios_template" ON "public"."enhanced_scenarios" USING "btree" ("template_id");
CREATE INDEX "idx_enhanced_scenarios_type" ON "public"."enhanced_scenarios" USING "btree" ("scenario_type");
CREATE INDEX "idx_enhanced_scenarios_status" ON "public"."enhanced_scenarios" USING "btree" ("status");
CREATE INDEX "idx_enhanced_scenarios_created_by" ON "public"."enhanced_scenarios" USING "btree" ("created_by");

CREATE INDEX "idx_scenario_products_scenario" ON "public"."scenario_products" USING "btree" ("scenario_id");
CREATE INDEX "idx_scenario_products_product" ON "public"."scenario_products" USING "btree" ("product_id");

CREATE INDEX "idx_scenario_comparisons_workspace" ON "public"."scenario_comparisons" USING "btree" ("workspace_id");
CREATE INDEX "idx_scenario_comparisons_type" ON "public"."scenario_comparisons" USING "btree" ("comparison_type");
CREATE INDEX "idx_scenario_comparisons_created_by" ON "public"."scenario_comparisons" USING "btree" ("created_by");

CREATE INDEX "idx_optimization_recommendations_workspace" ON "public"."optimization_recommendations" USING "btree" ("workspace_id");
CREATE INDEX "idx_optimization_recommendations_scenario" ON "public"."optimization_recommendations" USING "btree" ("scenario_id");
CREATE INDEX "idx_optimization_recommendations_product" ON "public"."optimization_recommendations" USING "btree" ("product_id");
CREATE INDEX "idx_optimization_recommendations_type" ON "public"."optimization_recommendations" USING "btree" ("recommendation_type");
CREATE INDEX "idx_optimization_recommendations_priority" ON "public"."optimization_recommendations" USING "btree" ("priority");
CREATE INDEX "idx_optimization_recommendations_status" ON "public"."optimization_recommendations" USING "btree" ("status");
CREATE INDEX "idx_optimization_recommendations_confidence" ON "public"."optimization_recommendations" USING "btree" ("confidence_score" DESC);

-- Enable Row Level Security
ALTER TABLE "public"."scenario_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."scenario_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."enhanced_scenarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."scenario_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."scenario_comparisons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."optimization_recommendations" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Scenario Groups policies
CREATE POLICY "Users can view scenario groups in their workspace" ON "public"."scenario_groups"
    FOR SELECT USING (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = "auth"."uid"()
        )
    );

CREATE POLICY "Users can create scenario groups in their workspace" ON "public"."scenario_groups"
    FOR INSERT WITH CHECK (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = "auth"."uid"()
        )
    );

CREATE POLICY "Users can update scenario groups they created" ON "public"."scenario_groups"
    FOR UPDATE USING ("created_by" = "auth"."uid"());

CREATE POLICY "Users can delete scenario groups they created" ON "public"."scenario_groups"
    FOR DELETE USING ("created_by" = "auth"."uid"());

-- Scenario Templates policies
CREATE POLICY "Users can view scenario templates in their workspace or public ones" ON "public"."scenario_templates"
    FOR SELECT USING (
        "is_public" = true OR
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = "auth"."uid"()
        )
    );

CREATE POLICY "Users can create scenario templates in their workspace" ON "public"."scenario_templates"
    FOR INSERT WITH CHECK (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = "auth"."uid"()
        )
    );

CREATE POLICY "Users can update scenario templates they created" ON "public"."scenario_templates"
    FOR UPDATE USING ("created_by" = "auth"."uid"());

CREATE POLICY "Users can delete scenario templates they created" ON "public"."scenario_templates"
    FOR DELETE USING ("created_by" = "auth"."uid"());

-- Enhanced Scenarios policies
CREATE POLICY "Users can view scenarios in their workspace" ON "public"."enhanced_scenarios"
    FOR SELECT USING (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = "auth"."uid"()
        )
    );

CREATE POLICY "Users can create scenarios in their workspace" ON "public"."enhanced_scenarios"
    FOR INSERT WITH CHECK (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = "auth"."uid"()
        )
    );

CREATE POLICY "Users can update scenarios they created" ON "public"."enhanced_scenarios"
    FOR UPDATE USING ("created_by" = "auth"."uid"());

CREATE POLICY "Users can delete scenarios they created" ON "public"."enhanced_scenarios"
    FOR DELETE USING ("created_by" = "auth"."uid"());

-- Scenario Products policies
CREATE POLICY "Users can view scenario products for scenarios in their workspace" ON "public"."scenario_products"
    FOR SELECT USING (
        "scenario_id" IN (
            SELECT "id" FROM "public"."enhanced_scenarios" 
            WHERE "workspace_id" IN (
                SELECT "workspace_id" FROM "public"."workspace_users" 
                WHERE "user_id" = "auth"."uid"()
            )
        )
    );

CREATE POLICY "Users can manage scenario products for scenarios they created" ON "public"."scenario_products"
    FOR ALL USING (
        "scenario_id" IN (
            SELECT "id" FROM "public"."enhanced_scenarios" 
            WHERE "created_by" = "auth"."uid"()
        )
    );

-- Scenario Comparisons policies
CREATE POLICY "Users can view scenario comparisons in their workspace" ON "public"."scenario_comparisons"
    FOR SELECT USING (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = "auth"."uid"()
        )
    );

CREATE POLICY "Users can create scenario comparisons in their workspace" ON "public"."scenario_comparisons"
    FOR INSERT WITH CHECK (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = "auth"."uid"()
        )
    );

CREATE POLICY "Users can update scenario comparisons they created" ON "public"."scenario_comparisons"
    FOR UPDATE USING ("created_by" = "auth"."uid"());

CREATE POLICY "Users can delete scenario comparisons they created" ON "public"."scenario_comparisons"
    FOR DELETE USING ("created_by" = "auth"."uid"());

-- Optimization Recommendations policies
CREATE POLICY "Users can view optimization recommendations in their workspace" ON "public"."optimization_recommendations"
    FOR SELECT USING (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = "auth"."uid"()
        )
    );

CREATE POLICY "Users can create optimization recommendations in their workspace" ON "public"."optimization_recommendations"
    FOR INSERT WITH CHECK (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = "auth"."uid"()
        )
    );

CREATE POLICY "Users can update optimization recommendations in their workspace" ON "public"."optimization_recommendations"
    FOR UPDATE USING (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = "auth"."uid"()
        )
    );

CREATE POLICY "Users can delete optimization recommendations in their workspace" ON "public"."optimization_recommendations"
    FOR DELETE USING (
        "workspace_id" IN (
            SELECT "workspace_id" FROM "public"."workspace_users" 
            WHERE "user_id" = "auth"."uid"()
        )
    );

-- Grant permissions
GRANT ALL ON TABLE "public"."scenario_groups" TO "anon";
GRANT ALL ON TABLE "public"."scenario_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."scenario_groups" TO "service_role";

GRANT ALL ON TABLE "public"."scenario_templates" TO "anon";
GRANT ALL ON TABLE "public"."scenario_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."scenario_templates" TO "service_role";

GRANT ALL ON TABLE "public"."enhanced_scenarios" TO "anon";
GRANT ALL ON TABLE "public"."enhanced_scenarios" TO "authenticated";
GRANT ALL ON TABLE "public"."enhanced_scenarios" TO "service_role";

GRANT ALL ON TABLE "public"."scenario_products" TO "anon";
GRANT ALL ON TABLE "public"."scenario_products" TO "authenticated";
GRANT ALL ON TABLE "public"."scenario_products" TO "service_role";

GRANT ALL ON TABLE "public"."scenario_comparisons" TO "anon";
GRANT ALL ON TABLE "public"."scenario_comparisons" TO "authenticated";
GRANT ALL ON TABLE "public"."scenario_comparisons" TO "service_role";

GRANT ALL ON TABLE "public"."optimization_recommendations" TO "anon";
GRANT ALL ON TABLE "public"."optimization_recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."optimization_recommendations" TO "service_role";