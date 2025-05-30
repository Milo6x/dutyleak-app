

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_savings_on_classification_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = ''
    AS $$
DECLARE
  old_duty DECIMAL(10, 4);
  new_duty DECIMAL(10, 4);
  product_cost DECIMAL(10, 2);
  yearly_units INTEGER;
  yearly_saving DECIMAL(12, 2);
  old_class_id UUID;
BEGIN
  -- Only proceed if this is an active classification change
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    -- Get the product cost and yearly units
    SELECT cost, COALESCE(p.metadata->>'yearly_units', '0')::INTEGER
    INTO product_cost, yearly_units
    FROM public.products p
    WHERE p.id = NEW.product_id;
    
    -- If no product cost or yearly units, exit
    IF product_cost IS NULL OR yearly_units = 0 THEN
      RETURN NEW;
    END IF;
    
    -- Get the old duty rate from the previous active classification
    SELECT c.id, COALESCE(dr.duty_percentage, 0)
    INTO old_class_id, old_duty
    FROM public.classifications c
    LEFT JOIN public.duty_rates dr ON dr.classification_id = c.id
    WHERE c.product_id = NEW.product_id AND c.is_active = true AND c.id != NEW.id
    LIMIT 1;
    
    -- Get the new duty rate
    SELECT COALESCE(dr.duty_percentage, 0)
    INTO new_duty
    FROM public.duty_rates dr
    WHERE dr.classification_id = NEW.id
    LIMIT 1;
    
    -- If no duty rates found, exit
    IF new_duty IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate yearly saving
    yearly_saving := (old_duty - new_duty) * product_cost * yearly_units / 100;
    
    -- Only create a savings record if there's an actual saving
    IF yearly_saving > 0 THEN
      INSERT INTO public.savings_ledger (
        product_id,
        old_classification_id,
        new_classification_id,
        old_duty_percentage,
        new_duty_percentage,
        yearly_units,
        yearly_saving_usd
      ) VALUES (
        NEW.product_id,
        old_class_id,
        NEW.id,
        old_duty,
        new_duty,
        yearly_units,
        yearly_saving
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_savings_on_classification_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_duty_rate"("classification_id" "uuid", "country_code" "text") RETURNS TABLE("duty_percentage" numeric, "vat_percentage" numeric, "source" "text")
    LANGUAGE "plpgsql"
    SET search_path = ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT dr.duty_percentage, dr.vat_percentage, dr.source
  FROM public.duty_rates dr
  WHERE dr.classification_id = get_current_duty_rate.classification_id
    AND dr.country_code = get_current_duty_rate.country_code
    AND dr.effective_date <= CURRENT_DATE
    AND (dr.expiry_date IS NULL OR dr.expiry_date >= CURRENT_DATE)
  ORDER BY dr.effective_date DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_current_duty_rate"("classification_id" "uuid", "country_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workspace_total_savings"("workspace_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    SET search_path = ''
    AS $$
DECLARE
  total_savings DECIMAL(12, 2);
BEGIN
  SELECT COALESCE(SUM(sl.yearly_saving_usd), 0)
  INTO total_savings
  FROM public.savings_ledger sl
  JOIN public.products p ON p.id = sl.product_id
  WHERE p.workspace_id = get_workspace_total_savings.workspace_id;
  
  RETURN total_savings;
END;
$$;


ALTER FUNCTION "public"."get_workspace_total_savings"("workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = ''
    AS $$
DECLARE
  workspace_id_var uuid;
BEGIN
  -- Create a profile for the new user
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Create a default workspace for the new user
  INSERT INTO public.workspaces (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name' || '''s Workspace', 'My Workspace'))
  RETURNING id INTO workspace_id_var;
  
  -- Add the user to the workspace as admin
  INSERT INTO public.workspace_users (workspace_id, user_id, role)
  VALUES (workspace_id_var, NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_active_classification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = ''
    AS $$
BEGIN
  -- If this is a new classification being set as active
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    -- Set all other classifications for this product to inactive
    UPDATE public.classifications
    SET is_active = false
    WHERE product_id = NEW.product_id AND id != NEW.id;
    
    -- Update the product's active_classification_id
    UPDATE public.products
    SET active_classification_id = NEW.id
    WHERE id = NEW.product_id;
  -- If this classification is being set to inactive and it was the active one
  ELSIF NEW.is_active = false AND OLD.is_active = true THEN
    -- Clear the product's active_classification_id
    UPDATE public.products
    SET active_classification_id = NULL
    WHERE id = NEW.product_id AND active_classification_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_active_classification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."classifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "hs6" "text" NOT NULL,
    "hs8" "text",
    "confidence_score" numeric(5,2) NOT NULL,
    "source" "text" NOT NULL,
    "ruling_reference" "text",
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."classifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."duty_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "classification_id" "uuid" NOT NULL,
    "country_code" "text" NOT NULL,
    "duty_percentage" numeric(10,4) NOT NULL,
    "vat_percentage" numeric(10,4) DEFAULT 0 NOT NULL,
    "source" "text" NOT NULL,
    "effective_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "expiry_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."duty_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."duty_scenarios" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "base_classification_id" "uuid" NOT NULL,
    "alternative_classification_id" "uuid" NOT NULL,
    "destination_country" character(2) NOT NULL,
    "product_value" numeric(10,2) NOT NULL,
    "shipping_cost" numeric(10,2) DEFAULT 0,
    "insurance_cost" numeric(10,2) DEFAULT 0,
    "fba_fee_amount" numeric(10,2) DEFAULT 0,
    "yearly_units" integer,
    "base_duty_amount" numeric(10,2) NOT NULL,
    "alternative_duty_amount" numeric(10,2) NOT NULL,
    "potential_saving" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."duty_scenarios" OWNER TO "postgres";


COMMENT ON TABLE "public"."duty_scenarios" IS 'Scenarios for comparing different HS classifications and their duty implications';



CREATE TABLE IF NOT EXISTS "public"."job_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "level" "text" DEFAULT 'info'::"text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_related_entities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_related_entities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "parameters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "error" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."optimization_recommendations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "current_classification_id" "uuid" NOT NULL,
    "recommended_classification_id" "uuid" NOT NULL,
    "confidence_score" numeric(3,2) NOT NULL,
    "potential_saving" numeric(10,2) NOT NULL,
    "justification" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."optimization_recommendations" OWNER TO "postgres";


COMMENT ON TABLE "public"."optimization_recommendations" IS 'System-generated recommendations for optimizing duty rates through classification changes';



CREATE TABLE IF NOT EXISTS "public"."product_profitability_snapshots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "sale_price" numeric(10,2) NOT NULL,
    "cogs" numeric(10,2) NOT NULL,
    "shipping_cost" numeric(10,2) DEFAULT 0,
    "duty_amount" numeric(10,2) DEFAULT 0,
    "vat_amount" numeric(10,2) DEFAULT 0,
    "fba_fee_amount" numeric(10,2) DEFAULT 0,
    "marketplace_fee_amount" numeric(10,2) DEFAULT 0,
    "other_costs" numeric(10,2) DEFAULT 0,
    "profit_amount" numeric(10,2) NOT NULL,
    "profit_margin_percentage" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_profitability_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_profitability_snapshots" IS 'Historical snapshots of product profitability including all cost components';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "asin" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "cost" numeric(10,2),
    "active_classification_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fba_fee_estimate_usd" numeric(10,2),
    "yearly_units" integer
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."fba_fee_estimate_usd" IS 'Estimated FBA fee in USD for the product';



COMMENT ON COLUMN "public"."products"."yearly_units" IS 'Estimated annual sales volume in units';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


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


ALTER TABLE "public"."review_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."review_queue" IS 'Queue for manual review of product classifications with low confidence or other issues';



CREATE TABLE IF NOT EXISTS "public"."savings_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "old_classification_id" "uuid",
    "new_classification_id" "uuid" NOT NULL,
    "old_duty_percentage" numeric(10,4) NOT NULL,
    "new_duty_percentage" numeric(10,4) NOT NULL,
    "yearly_units" integer DEFAULT 0 NOT NULL,
    "yearly_saving_usd" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."savings_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_users" (
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspace_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "stripe_customer_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."classifications"
    ADD CONSTRAINT "classifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."duty_rates"
    ADD CONSTRAINT "duty_rates_classification_id_country_code_effective_date_key" UNIQUE ("classification_id", "country_code", "effective_date");



ALTER TABLE ONLY "public"."duty_rates"
    ADD CONSTRAINT "duty_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."duty_scenarios"
    ADD CONSTRAINT "duty_scenarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_logs"
    ADD CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_related_entities"
    ADD CONSTRAINT "job_related_entities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."optimization_recommendations"
    ADD CONSTRAINT "optimization_recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_profitability_snapshots"
    ADD CONSTRAINT "product_profitability_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_queue"
    ADD CONSTRAINT "review_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."savings_ledger"
    ADD CONSTRAINT "savings_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_users"
    ADD CONSTRAINT "workspace_users_pkey" PRIMARY KEY ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_classifications_hs6" ON "public"."classifications" USING "btree" ("hs6");



CREATE INDEX "idx_classifications_is_active" ON "public"."classifications" USING "btree" ("is_active");



CREATE INDEX "idx_classifications_product_id" ON "public"."classifications" USING "btree" ("product_id");



CREATE INDEX "idx_duty_rates_classification_id" ON "public"."duty_rates" USING "btree" ("classification_id");



CREATE INDEX "idx_duty_rates_country_code" ON "public"."duty_rates" USING "btree" ("country_code");



CREATE INDEX "idx_duty_rates_effective_date" ON "public"."duty_rates" USING "btree" ("effective_date");



CREATE INDEX "idx_duty_scenarios_alternative_classification" ON "public"."duty_scenarios" USING "btree" ("alternative_classification_id");



CREATE INDEX "idx_duty_scenarios_base_classification" ON "public"."duty_scenarios" USING "btree" ("base_classification_id");



CREATE INDEX "idx_duty_scenarios_potential_saving" ON "public"."duty_scenarios" USING "btree" ("potential_saving" DESC);



CREATE INDEX "idx_duty_scenarios_workspace" ON "public"."duty_scenarios" USING "btree" ("workspace_id");



CREATE INDEX "idx_optimization_recommendations_current_classification" ON "public"."optimization_recommendations" USING "btree" ("current_classification_id");



CREATE INDEX "idx_optimization_recommendations_potential_saving" ON "public"."optimization_recommendations" USING "btree" ("potential_saving" DESC);



CREATE INDEX "idx_optimization_recommendations_product" ON "public"."optimization_recommendations" USING "btree" ("product_id");



CREATE INDEX "idx_optimization_recommendations_recommended_classification" ON "public"."optimization_recommendations" USING "btree" ("recommended_classification_id");



CREATE INDEX "idx_optimization_recommendations_status" ON "public"."optimization_recommendations" USING "btree" ("status");



CREATE INDEX "idx_optimization_recommendations_workspace" ON "public"."optimization_recommendations" USING "btree" ("workspace_id");



CREATE INDEX "idx_products_fba_fee" ON "public"."products" USING "btree" ("fba_fee_estimate_usd") WHERE ("fba_fee_estimate_usd" IS NOT NULL);



CREATE INDEX "idx_products_yearly_units" ON "public"."products" USING "btree" ("yearly_units") WHERE ("yearly_units" IS NOT NULL);



CREATE INDEX "idx_profitability_snapshots_date" ON "public"."product_profitability_snapshots" USING "btree" ("date" DESC);



CREATE INDEX "idx_profitability_snapshots_product" ON "public"."product_profitability_snapshots" USING "btree" ("product_id");



CREATE INDEX "idx_profitability_snapshots_profit_margin" ON "public"."product_profitability_snapshots" USING "btree" ("profit_margin_percentage" DESC);



CREATE INDEX "idx_review_queue_classification" ON "public"."review_queue" USING "btree" ("classification_id");



CREATE INDEX "idx_review_queue_confidence" ON "public"."review_queue" USING "btree" ("confidence_score");



CREATE INDEX "idx_review_queue_created_at" ON "public"."review_queue" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_review_queue_product" ON "public"."review_queue" USING "btree" ("product_id");



CREATE INDEX "idx_review_queue_status" ON "public"."review_queue" USING "btree" ("status");



CREATE INDEX "idx_review_queue_workspace" ON "public"."review_queue" USING "btree" ("workspace_id");



CREATE INDEX "idx_savings_ledger_new_classification_id" ON "public"."savings_ledger" USING "btree" ("new_classification_id");



CREATE INDEX "idx_savings_ledger_old_classification_id" ON "public"."savings_ledger" USING "btree" ("old_classification_id");



CREATE INDEX "idx_savings_ledger_product_id" ON "public"."savings_ledger" USING "btree" ("product_id");



CREATE OR REPLACE TRIGGER "on_classification_active_change" AFTER INSERT OR UPDATE OF "is_active" ON "public"."classifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_active_classification"();



CREATE OR REPLACE TRIGGER "on_classification_change_calculate_savings" AFTER INSERT OR UPDATE OF "is_active" ON "public"."classifications" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_savings_on_classification_change"();



CREATE OR REPLACE TRIGGER "update_classifications_updated_at" BEFORE UPDATE ON "public"."classifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_duty_rates_updated_at" BEFORE UPDATE ON "public"."duty_rates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_jobs_updated_at" BEFORE UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_savings_ledger_updated_at" BEFORE UPDATE ON "public"."savings_ledger" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_workspace_users_updated_at" BEFORE UPDATE ON "public"."workspace_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_workspaces_updated_at" BEFORE UPDATE ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."classifications"
    ADD CONSTRAINT "classifications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."duty_rates"
    ADD CONSTRAINT "duty_rates_classification_id_fkey" FOREIGN KEY ("classification_id") REFERENCES "public"."classifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."duty_scenarios"
    ADD CONSTRAINT "duty_scenarios_alternative_classification_id_fkey" FOREIGN KEY ("alternative_classification_id") REFERENCES "public"."classifications"("id");



ALTER TABLE ONLY "public"."duty_scenarios"
    ADD CONSTRAINT "duty_scenarios_base_classification_id_fkey" FOREIGN KEY ("base_classification_id") REFERENCES "public"."classifications"("id");



ALTER TABLE ONLY "public"."duty_scenarios"
    ADD CONSTRAINT "duty_scenarios_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "fk_products_active_classification" FOREIGN KEY ("active_classification_id") REFERENCES "public"."classifications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_logs"
    ADD CONSTRAINT "job_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_related_entities"
    ADD CONSTRAINT "job_related_entities_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."optimization_recommendations"
    ADD CONSTRAINT "optimization_recommendations_current_classification_id_fkey" FOREIGN KEY ("current_classification_id") REFERENCES "public"."classifications"("id");



ALTER TABLE ONLY "public"."optimization_recommendations"
    ADD CONSTRAINT "optimization_recommendations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."optimization_recommendations"
    ADD CONSTRAINT "optimization_recommendations_recommended_classification_id_fkey" FOREIGN KEY ("recommended_classification_id") REFERENCES "public"."classifications"("id");



ALTER TABLE ONLY "public"."optimization_recommendations"
    ADD CONSTRAINT "optimization_recommendations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_profitability_snapshots"
    ADD CONSTRAINT "product_profitability_snapshots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_queue"
    ADD CONSTRAINT "review_queue_classification_id_fkey" FOREIGN KEY ("classification_id") REFERENCES "public"."classifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_queue"
    ADD CONSTRAINT "review_queue_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_queue"
    ADD CONSTRAINT "review_queue_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."review_queue"
    ADD CONSTRAINT "review_queue_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."savings_ledger"
    ADD CONSTRAINT "savings_ledger_new_classification_id_fkey" FOREIGN KEY ("new_classification_id") REFERENCES "public"."classifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."savings_ledger"
    ADD CONSTRAINT "savings_ledger_old_classification_id_fkey" FOREIGN KEY ("old_classification_id") REFERENCES "public"."classifications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."savings_ledger"
    ADD CONSTRAINT "savings_ledger_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_users"
    ADD CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE "public"."classifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "classifications_delete" ON "public"."classifications" FOR DELETE USING (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE (("workspace_users"."user_id" = "auth"."uid"()) AND ("workspace_users"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))))));



CREATE POLICY "classifications_insert" ON "public"."classifications" FOR INSERT WITH CHECK (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE ("workspace_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "classifications_select" ON "public"."classifications" FOR SELECT USING (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE ("workspace_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "classifications_update" ON "public"."classifications" FOR UPDATE USING (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE ("workspace_users"."user_id" = "auth"."uid"())))))) WITH CHECK (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE ("workspace_users"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."duty_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "duty_rates_delete" ON "public"."duty_rates" FOR DELETE USING (("classification_id" IN ( SELECT "classifications"."id"
   FROM "public"."classifications"
  WHERE ("classifications"."product_id" IN ( SELECT "products"."id"
           FROM "public"."products"
          WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
                   FROM "public"."workspace_users"
                  WHERE (("workspace_users"."user_id" = (SELECT "auth"."uid"())) AND ("workspace_users"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))))))));



CREATE POLICY "duty_rates_insert" ON "public"."duty_rates" FOR INSERT WITH CHECK (("classification_id" IN ( SELECT "classifications"."id"
   FROM "public"."classifications"
  WHERE ("classifications"."product_id" IN ( SELECT "products"."id"
           FROM "public"."products"
          WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
                   FROM "public"."workspace_users"
                  WHERE ("workspace_users"."user_id" = (SELECT "auth"."uid"())))))))));



CREATE POLICY "duty_rates_select" ON "public"."duty_rates" FOR SELECT USING (("classification_id" IN ( SELECT "classifications"."id"
   FROM "public"."classifications"
  WHERE ("classifications"."product_id" IN ( SELECT "products"."id"
           FROM "public"."products"
          WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
                   FROM "public"."workspace_users"
                  WHERE ("workspace_users"."user_id" = (SELECT "auth"."uid"())))))))));



CREATE POLICY "duty_rates_update" ON "public"."duty_rates" FOR UPDATE USING (("classification_id" IN ( SELECT "classifications"."id"
   FROM "public"."classifications"
  WHERE ("classifications"."product_id" IN ( SELECT "products"."id"
           FROM "public"."products"
          WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
                   FROM "public"."workspace_users"
                  WHERE ("workspace_users"."user_id" = (SELECT "auth"."uid"()))))))))) WITH CHECK (("classification_id" IN ( SELECT "classifications"."id"
   FROM "public"."classifications"
  WHERE ("classifications"."product_id" IN ( SELECT "products"."id"
           FROM "public"."products"
          WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
                   FROM "public"."workspace_users"
                  WHERE ("workspace_users"."user_id" = (SELECT "auth"."uid"())))))))));



ALTER TABLE "public"."duty_scenarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_logs_insert" ON "public"."job_logs" FOR INSERT WITH CHECK (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE ("workspace_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "job_logs_select" ON "public"."job_logs" FOR SELECT USING (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE ("workspace_users"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."job_related_entities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_related_entities_insert" ON "public"."job_related_entities" FOR INSERT WITH CHECK (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE ("workspace_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "job_related_entities_select" ON "public"."job_related_entities" FOR SELECT USING (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE ("workspace_users"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jobs_insert" ON "public"."jobs" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "workspace_users"."workspace_id"
   FROM "public"."workspace_users"
  WHERE ("workspace_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "jobs_select" ON "public"."jobs" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_users"."workspace_id"
   FROM "public"."workspace_users"
  WHERE ("workspace_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "jobs_update" ON "public"."jobs" FOR UPDATE USING (("workspace_id" IN ( SELECT "workspace_users"."workspace_id"
   FROM "public"."workspace_users"
  WHERE ("workspace_users"."user_id" = "auth"."uid"())))) WITH CHECK (("workspace_id" IN ( SELECT "workspace_users"."workspace_id"
   FROM "public"."workspace_users"
  WHERE ("workspace_users"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."optimization_recommendations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_profitability_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete" ON "public"."products" FOR DELETE USING (("workspace_id" IN ( SELECT "workspace_users"."workspace_id"
   FROM "public"."workspace_users"
  WHERE (("workspace_users"."user_id" = "auth"."uid"()) AND ("workspace_users"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "products_insert" ON "public"."products" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "workspace_users"."workspace_id"
   FROM "public"."workspace_users"
  WHERE ("workspace_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "products_select" ON "public"."products" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_users"."workspace_id"
   FROM "public"."workspace_users"
  WHERE ("workspace_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "products_update" ON "public"."products" FOR UPDATE USING (("workspace_id" IN ( SELECT "workspace_users"."workspace_id"
   FROM "public"."workspace_users"
  WHERE ("workspace_users"."user_id" = "auth"."uid"())))) WITH CHECK (("workspace_id" IN ( SELECT "workspace_users"."workspace_id"
   FROM "public"."workspace_users"
  WHERE ("workspace_users"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR ("id" IN ( SELECT "workspace_users"."user_id"
   FROM "public"."workspace_users"
  WHERE ("workspace_users"."workspace_id" IN ( SELECT "workspace_users_1"."workspace_id"
           FROM "public"."workspace_users" "workspace_users_1"
          WHERE ("workspace_users_1"."user_id" = "auth"."uid"())))))));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."review_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."savings_ledger" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "savings_ledger_delete" ON "public"."savings_ledger" FOR DELETE USING (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE (("workspace_users"."user_id" = "auth"."uid"()) AND ("workspace_users"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))))));



CREATE POLICY "savings_ledger_insert" ON "public"."savings_ledger" FOR INSERT WITH CHECK (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE ("workspace_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "savings_ledger_select" ON "public"."savings_ledger" FOR SELECT USING (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE ("workspace_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "savings_ledger_update" ON "public"."savings_ledger" FOR UPDATE USING (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE ("workspace_users"."user_id" = "auth"."uid"())))))) WITH CHECK (("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."workspace_id" IN ( SELECT "workspace_users"."workspace_id"
           FROM "public"."workspace_users"
          WHERE ("workspace_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "workspace_insert" ON "public"."workspaces" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."workspace_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_users_insert" ON "public"."workspace_users" FOR INSERT WITH CHECK (
  -- Allow if user is admin in the workspace OR if it's the first user being added to a new workspace
  ("workspace_id" IN ( SELECT "workspace_users_1"."workspace_id"
     FROM "public"."workspace_users" "workspace_users_1"
    WHERE (("workspace_users_1"."user_id" = "auth"."uid"()) AND ("workspace_users_1"."role" = 'admin'::"text")))) 
  OR 
  -- Allow if no users exist in this workspace yet (for initial signup)
  (NOT EXISTS (SELECT 1 FROM "public"."workspace_users" WHERE "workspace_id" = "workspace_users"."workspace_id"))
);



CREATE POLICY "workspace_users_select" ON "public"."workspace_users" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_users_1"."workspace_id"
   FROM "public"."workspace_users" "workspace_users_1"
  WHERE ("workspace_users_1"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_savings_on_classification_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_savings_on_classification_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_savings_on_classification_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_duty_rate"("classification_id" "uuid", "country_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_duty_rate"("classification_id" "uuid", "country_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_duty_rate"("classification_id" "uuid", "country_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_workspace_total_savings"("workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_workspace_total_savings"("workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_workspace_total_savings"("workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_active_classification"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_active_classification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_active_classification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."classifications" TO "anon";
GRANT ALL ON TABLE "public"."classifications" TO "authenticated";
GRANT ALL ON TABLE "public"."classifications" TO "service_role";



GRANT ALL ON TABLE "public"."duty_rates" TO "anon";
GRANT ALL ON TABLE "public"."duty_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."duty_rates" TO "service_role";



GRANT ALL ON TABLE "public"."duty_scenarios" TO "anon";
GRANT ALL ON TABLE "public"."duty_scenarios" TO "authenticated";
GRANT ALL ON TABLE "public"."duty_scenarios" TO "service_role";



GRANT ALL ON TABLE "public"."job_logs" TO "anon";
GRANT ALL ON TABLE "public"."job_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."job_logs" TO "service_role";



GRANT ALL ON TABLE "public"."job_related_entities" TO "anon";
GRANT ALL ON TABLE "public"."job_related_entities" TO "authenticated";
GRANT ALL ON TABLE "public"."job_related_entities" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."optimization_recommendations" TO "anon";
GRANT ALL ON TABLE "public"."optimization_recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."optimization_recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."product_profitability_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."product_profitability_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."product_profitability_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."review_queue" TO "anon";
GRANT ALL ON TABLE "public"."review_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."review_queue" TO "service_role";



GRANT ALL ON TABLE "public"."savings_ledger" TO "anon";
GRANT ALL ON TABLE "public"."savings_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."savings_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_users" TO "anon";
GRANT ALL ON TABLE "public"."workspace_users" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_users" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
