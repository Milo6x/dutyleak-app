# DutyLeak - Enhanced Architecture with FBA Support

> **Stack**  
> *Frontend*: Next.js 14 (App Router) with shadcn/ui components  
> *Backend*: Next.js API Routes + Supabase (PostgreSQL + Row-Level-Security)  
> *Authentication*: Supabase Auth (Magic Link + Email/Password)  
> *Job System*: Custom in-app job orchestration system  
> *Infra*: Vercel deploy (frontend + API routes) / Supabase Cloud (DB)

---

## 1. Project Structure

```text
📦 dutyleak
│  .env
│  README.md
│
├─📁 src
│   ├─ app/                  # App Router pages & layouts
│   │   ├─ layout.tsx        # Root layout (ThemeProvider, SupabaseProvider)
│   │   ├─ page.tsx          # Landing page – upload CSV / ASINs
│   │   ├─ auth/             # Public pages (signin / signup / callback)
│   │   ├─ dashboard/        # Protected – margin tables, savings ledger
│   │   │   ├─ layout.tsx
│   │   │   ├─ page.tsx
│   │   │   ├─ products/[id]/
│   │   │   ├─ analytics/    # Profitability analytics
│   │   │   │   ├─ profitability/page.tsx
│   │   │   │   └─ scenarios/page.tsx
│   │   │   ├─ review-queue/ # Manual review queue
│   │   │   └─ settings/
│   │   ├─ api/              # Next.js API Routes
│   │   │   ├─ core/         # Core API endpoints
│   │   │   │   ├─ classify-hs/route.ts
│   │   │   │   ├─ lookup-duty-rates/route.ts
│   │   │   │   └─ calculate-landed-cost/route.ts
│   │   │   ├─ jobs/         # Job system API endpoints
│   │   │   │   ├─ route.ts
│   │   │   │   ├─ [jobId]/route.ts
│   │   │   │   ├─ [jobId]/cancel/route.ts
│   │   │   │   └─ [jobId]/rerun/route.ts
│   │   │   ├─ imports/      # CSV import endpoints
│   │   │   │   ├─ route.ts
│   │   │   │   ├─ map-columns/route.ts
│   │   │   │   └─ validate/route.ts
│   │   │   ├─ scenarios/    # Scenario modeling endpoints
│   │   │   │   ├─ route.ts
│   │   │   │   └─ [id]/route.ts
│   │   │   ├─ optimization/ # Optimization suggestions
│   │   │   │   └─ route.ts
│   │   │   ├─ review-queue/ # Review queue endpoints
│   │   │   │   ├─ route.ts
│   │   │   │   └─ [id]/route.ts
│   │   │   └─ cron/         # Cron job triggers
│   │   │       ├─ trigger-spapi-export/route.ts
│   │   │       ├─ trigger-batch-classification/route.ts
│   │   │       └─ health-check/route.ts
│   ├─ components/
│   │   ├─ ui/               # shadcn/ui components
│   │   ├─ charts/           # Recharts wrappers
│   │   ├─ forms/            # React Hook Form + zod schemas
│   │   ├─ date-range/       # Global date range selector
│   │   │   ├─ date-range-provider.tsx
│   │   │   └─ date-range-picker.tsx
│   │   ├─ imports/          # CSV import components
│   │   │   ├─ csv-import-form.tsx
│   │   │   ├─ column-mapper.tsx
│   │   │   └─ validation-table.tsx
│   │   ├─ jobs/             # Job system UI components
│   │   │   ├─ jobs-dashboard.tsx
│   │   │   ├─ job-status-card.tsx
│   │   │   └─ job-details.tsx
│   │   ├─ products/         # Product components
│   │   │   ├─ product-form.tsx
│   │   │   ├─ product-table.tsx
│   │   │   └─ product-detail.tsx
│   │   └─ duty/             # Duty-specific components
│   │       ├─ classification-form.tsx
│   │       ├─ duty-calculator.tsx
│   │       ├─ savings-dashboard.tsx
│   │       ├─ scenario-modeler.tsx
│   │       ├─ optimization-suggestions.tsx
│   │       ├─ review-queue.tsx
│   │       └─ review-item-drawer.tsx
│   ├─ lib/
│   │   ├─ supabase.ts       # createBrowserClient / createServerClient helpers
│   │   ├─ auth.ts           # Auth helpers and hooks
│   │   ├─ api.ts            # API client helpers
│   │   ├─ date-range.ts     # Global date range utilities
│   │   ├─ caching/          # Caching utilities
│   │   │   └─ cache-manager.ts
│   │   ├─ duty/             # Duty calculation engines
│   │   │   ├─ classification-engine.ts
│   │   │   ├─ duty-rate-engine.ts
│   │   │   ├─ landed-cost-calculator.ts
│   │   │   ├─ bulk-calculation-engine.ts
│   │   │   ├─ advanced-calculation-engine.ts
│   │   │   ├─ scenario-engine.ts
│   │   │   └─ optimization-engine.ts
│   │   ├─ jobs/             # Job system core
│   │   │   ├─ job-manager.ts
│   │   │   ├─ job-types.ts
│   │   │   └─ job-workers/
│   │   │       ├─ spapi-export-worker.ts
│   │   │       ├─ batch-classification-worker.ts
│   │   │       ├─ batch-duty-lookup-worker.ts
│   │   │       └─ optimization-worker.ts
│   │   ├─ imports/          # CSV import utilities
│   │   │   ├─ csv-parser.ts
│   │   │   ├─ column-mapper.ts
│   │   │   └─ validator.ts
│   │   ├─ amazon/           # Amazon SP-API integration
│   │   │   ├─ sp-api-client.ts
│   │   │   └─ fba-fee-calculator.ts
│   │   ├─ external/         # External API integrations
│   │   │   ├─ zonos-client.ts
│   │   │   ├─ taric-client.ts
│   │   │   ├─ usitc-client.ts
│   │   │   └─ openai-client.ts
│   │   └─ monitoring/       # Monitoring and alerting
│   │       ├─ slack-notifier.ts
│   │       └─ error-logger.ts
│   └─ styles/
│
├─📁 supabase
│   ├─ migrations/
│   │   ├─ 20250529000000_initial_schema.sql
│   │   ├─ 20250529000001_classifications_schema.sql
│   │   ├─ 20250529000002_duty_rates_schema.sql
│   │   ├─ 20250529000003_savings_ledger_schema.sql
│   │   ├─ 20250529000004_fba_fees_schema.sql
│   │   ├─ 20250529000005_duty_scenarios_schema.sql
│   │   ├─ 20250529000006_optimization_recommendations_schema.sql
│   │   └─ 20250529000007_review_queue_schema.sql
│   └─ seed/
│       └─ initial_data.sql
│
└─📁 scripts
    ├─ setup-db.mjs
    └─ health-check.mjs
```

---

## 2. Core Components and Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Next.js App Router** | UI, auth flows, file/CSV/ASIN uploader, dashboards, protected routes |
| **Next.js API Routes** | Backend API endpoints, job orchestration, external API integration |
| **Supabase DB** | Single source of truth (users, workspaces, products, classifications, duty_rates, savings_ledger, etc.) |
| **Supabase Auth** | Magic Link (primary) + Email/Password (secondary), JWT with workspace_id claim for RLS |
| **In-App Job System** | Orchestration of long-running tasks (SP-API export, batch classification, etc.) |
| **Vercel Cron Jobs** | Scheduled triggers for jobs (nightly SP-API export, health checks) |
| **Global Date Range** | Consistent date filtering across all analytics and reports |

---

## 3. Enhanced Database Schema

```sql
-- Core tables
workspaces (id, name, plan, stripe_customer_id, created_at, updated_at)
workspace_users (workspace_id, user_id, role, created_at, updated_at)
profiles (id, user_id, full_name, avatar_url, created_at, updated_at)

-- Product data
products (
  id, 
  workspace_id, 
  asin, 
  title, 
  description, 
  image_url, 
  cost, 
  fba_fee_estimate_usd,  -- NEW: FBA fee estimate
  yearly_units,          -- NEW: Annual sales volume
  active_classification_id,
  created_at, 
  updated_at
)

-- Classification system
classifications (
  id,
  product_id,
  hs6,
  hs8,
  confidence_score,
  source,
  ruling_reference,
  is_active,
  created_at,
  updated_at
)

-- Duty rates
duty_rates (
  id,
  classification_id,
  country_code,
  duty_percentage,
  vat_percentage,
  source,
  effective_date,
  expiry_date,
  created_at,
  updated_at
)

-- Savings tracking
savings_ledger (
  id,
  product_id,
  old_classification_id,
  new_classification_id,
  old_duty_percentage,
  new_duty_percentage,
  yearly_units,
  yearly_saving_usd,
  created_at,
  updated_at
)

-- Landed cost calculations
duty_calculations (
  id,
  product_id,
  classification_id,
  destination_country,
  product_value,
  shipping_cost,
  insurance_cost,
  fba_fee_amount,       -- NEW: FBA fee used in calculation
  duty_percentage,
  vat_percentage,
  duty_amount,
  vat_amount,
  total_landed_cost,
  created_at,
  updated_at
)

-- NEW: Profitability snapshots
product_profitability_snapshots (
  id,
  product_id,
  date,
  sale_price,
  cogs,
  shipping_cost,
  duty_amount,
  vat_amount,
  fba_fee_amount,
  marketplace_fee_amount,
  other_costs,
  profit_amount,
  profit_margin_percentage,
  created_at,
  updated_at
)

-- NEW: Duty scenarios
duty_scenarios (
  id,
  workspace_id,
  name,
  description,
  base_classification_id,
  alternative_classification_id,
  destination_country,
  product_value,
  shipping_cost,
  insurance_cost,
  fba_fee_amount,
  yearly_units,
  base_duty_amount,
  alternative_duty_amount,
  potential_saving,
  status,
  created_at,
  updated_at
)

-- NEW: Optimization recommendations
optimization_recommendations (
  id,
  workspace_id,
  product_id,
  current_classification_id,
  recommended_classification_id,
  confidence_score,
  potential_saving,
  justification,
  status,
  created_at,
  updated_at
)

-- NEW: Review queue
review_queue (
  id,
  workspace_id,
  product_id,
  classification_id,
  confidence_score,
  reason,
  status,
  reviewer_id,
  reviewed_at,
  created_at,
  updated_at
)

-- Job system
jobs (
  id,
  workspace_id,
  type,
  status,
  parameters,
  progress,
  error,
  started_at,
  completed_at,
  created_at,
  updated_at
)

job_logs (
  id,
  job_id,
  level,
  message,
  metadata,
  created_at
)

job_related_entities (
  id,
  job_id,
  entity_type,
  entity_id,
  created_at
)
```

All tables have RLS policies enforcing `workspace_id = auth.jwt.claims.workspace_id`.

---

## 4. Authentication Flow

1. User visits `/auth/signup`
2. User enters email and receives magic link (primary method)
3. User clicks magic link, redirected to `/auth/callback`
4. On successful auth, user is:
   - If new: Prompted to create a workspace
   - If existing: Redirected to dashboard
5. JWT contains `workspace_id` claim for RLS
6. Protected routes check auth status via middleware

---

## 5. Job System Architecture

The in-app job system replaces n8n for orchestrating long-running tasks:

1. **Job Creation**:
   - Via UI action (e.g., "Bulk Classify Products")
   - Via API endpoint (`/api/jobs`)
   - Via cron trigger (`/api/cron/trigger-*`)

2. **Job Types**:
   - `spapi_export`: Fetch product data from Amazon SP-API
   - `batch_classification`: Classify multiple products
   - `batch_duty_lookup`: Lookup duty rates for multiple classifications
   - `bulk_landed_cost`: Calculate landed costs for multiple products
   - `optimization_analysis`: Generate optimization recommendations
   - `fba_fee_update`: Update FBA fee estimates for products

3. **Job Execution**:
   - Jobs are processed by specialized workers in `/lib/jobs/job-workers/`
   - Workers update job status and progress in real-time
   - Long-running jobs are broken into smaller chunks to fit within serverless function limits

4. **Job Monitoring**:
   - UI shows job status, progress, and logs
   - Failed jobs can be manually rerun
   - Critical failures trigger Slack notifications

---

## 6. Enhanced Core API Endpoints

### Classification API

```typescript
// POST /api/core/classify-hs
interface ClassifyHsRequest {
  productId: string;
  productName: string;
  productDescription: string;
  imageUrl?: string;
  existingHsCode?: string;
  addToReviewQueue?: boolean; // NEW: Option to add to review queue
  reviewReason?: string;      // NEW: Reason for review
}

interface ClassifyHsResponse {
  success: boolean;
  classificationId?: string;
  hsCode?: string;
  confidenceScore?: number;
  source?: string;
  addedToReviewQueue?: boolean; // NEW: Indicates if added to review queue
  reviewQueueId?: string;       // NEW: ID of review queue entry
  message?: string;
}
```

### Duty Rate API

```typescript
// POST /api/core/lookup-duty-rates
interface LookupDutyRatesRequest {
  hsCode: string;
  destinationCountry: string;
  originCountry?: string;
  classificationId?: string;
}

interface LookupDutyRatesResponse {
  success: boolean;
  rates?: {
    dutyPercentage: number;
    vatPercentage: number;
    source: string;
    effectiveDate: string;
    expiryDate?: string;
  }[];
  message?: string;
}
```

### Landed Cost API with FBA Support

```typescript
// POST /api/core/calculate-landed-cost
interface CalculateLandedCostRequest {
  productId: string;
  destinationCountry: string;
  classificationId?: string;
  productValue: number;
  shippingCost?: number;
  insuranceCost?: number;
  fbaFee?: number;           // NEW: FBA fee amount
  useStoredFbaFee?: boolean; // NEW: Use FBA fee from product
}

interface CalculateLandedCostResponse {
  success: boolean;
  landedCostDetails?: {
    dutyAmount: number;
    vatAmount: number;
    fbaFeeAmount: number;    // NEW: FBA fee amount used
    totalLandedCost: number;
    effectiveDutyRate: number;
    breakdown: {
      productValue: number;
      shippingCost: number;
      insuranceCost: number;
      dutyableValue: number;
      dutyAmount: number;
      vatableValue: number;
      vatAmount: number;
      fbaFeeAmount: number;  // NEW: FBA fee amount
    };
  };
  calculationId?: string;
  message?: string;
}
```

### FBA Fee Calculator API

```typescript
// POST /api/amazon/calculate-fba-fees
interface CalculateFbaFeesRequest {
  productId?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'in' | 'cm';
  };
  weight?: {
    value: number;
    unit: 'lb' | 'oz' | 'kg' | 'g';
  };
  category?: string;
  asin?: string;
}

interface CalculateFbaFeesResponse {
  success: boolean;
  fbaFee: number;
  breakdown?: {
    fulfillmentFee: number;
    storageFee: number;
    otherFees: number;
  };
  message?: string;
}
```

### Scenario Modeling API

```typescript
// POST /api/scenarios
interface CreateScenarioRequest {
  name: string;
  description?: string;
  productId: string;
  baseClassificationId: string;
  alternativeClassificationId: string;
  destinationCountry: string;
  productValue: number;
  shippingCost?: number;
  insuranceCost?: number;
  fbaFeeAmount?: number;
  yearlyUnits?: number;
}

interface CreateScenarioResponse {
  success: boolean;
  scenarioId: string;
  potentialSaving: number;
}

// GET /api/scenarios
interface ListScenariosResponse {
  scenarios: {
    id: string;
    name: string;
    description?: string;
    productName: string;
    baseHsCode: string;
    alternativeHsCode: string;
    potentialSaving: number;
    status: string;
    createdAt: string;
  }[];
}
```

### Optimization Recommendations API

```typescript
// POST /api/optimization
interface GenerateOptimizationsRequest {
  productIds?: string[];
  categoryId?: string;
  minPotentialSaving?: number;
}

interface GenerateOptimizationsResponse {
  success: boolean;
  jobId?: string;
  message?: string;
}

// GET /api/optimization
interface ListOptimizationsResponse {
  recommendations: {
    id: string;
    productName: string;
    currentHsCode: string;
    recommendedHsCode: string;
    confidenceScore: number;
    potentialSaving: number;
    justification: string;
    status: string;
  }[];
}
```

### Review Queue API

```typescript
// GET /api/review-queue
interface ListReviewQueueResponse {
  items: {
    id: string;
    productName: string;
    classificationId: string;
    hsCode: string;
    confidenceScore: number;
    reason: string;
    status: string;
    createdAt: string;
  }[];
}

// POST /api/review-queue/:id/approve
interface ApproveReviewRequest {
  notes?: string;
}

// POST /api/review-queue/:id/override
interface OverrideReviewRequest {
  newHsCode: string;
  justification: string;
}
```

### CSV Import API with AI Mapping

```typescript
// POST /api/imports
interface ImportCsvRequest {
  file: File;
}

// POST /api/imports/map-columns
interface MapColumnsRequest {
  importId: string;
  columnMapping: Record<string, string>;
  useAiMapping?: boolean; // NEW: Use AI to suggest column mapping
}

// POST /api/imports/validate
interface ValidateImportRequest {
  importId: string;
  columnMapping: Record<string, string>;
}

interface ValidateImportResponse {
  success: boolean;
  validRows: number;
  invalidRows: number;
  errors: {
    row: number;
    column: string;
    error: string;
  }[];
  errorsCsvUrl?: string; // URL to download errors as CSV
}
```

---

## 7. Global Date Range Selector

The global date range selector provides consistent date filtering across all analytics and reports:

1. **Provider Component**:
   - `DateRangeProvider` wraps the application and stores the selected date range
   - Date range is persisted in localStorage and URL parameters
   - Default presets: Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, Custom

2. **Consumer Components**:
   - All analytics pages and data tables consume the global date range
   - API requests include date range parameters
   - Charts and tables automatically update when date range changes

3. **Implementation**:
   - Context API for state management
   - URL synchronization for deep linking and sharing
   - Consistent date formatting and timezone handling

---

## 8. External API Integrations

| Service | Purpose | Integration Point |
|---------|---------|-------------------|
| **Zonos API** | HS code classification | `/lib/external/zonos-client.ts` |
| **OpenAI API** | AI-assisted classification and column mapping | `/lib/external/openai-client.ts` |
| **TARIC API** | EU duty rates | `/lib/external/taric-client.ts` |
| **USITC DataWeb API** | US duty rates | `/lib/external/usitc-client.ts` |
| **Amazon SP-API** | Product catalog import and FBA fee calculation | `/lib/amazon/sp-api-client.ts` |
| **Stripe API** | Billing and subscriptions | Already integrated |
| **Slack API** | Alerts and notifications | `/lib/monitoring/slack-notifier.ts` |

---

## 9. Deployment Strategy

1. **Frontend & API Routes**: Deployed to Vercel
2. **Database & Auth**: Hosted on Supabase Cloud
3. **Scheduled Jobs**: Vercel Cron (defined in `vercel.json`)
4. **Monitoring**: Combination of Vercel Analytics, Supabase logs, and Slack alerts

---

## 10. Migration Path

1. Create new Supabase project
2. Apply database migrations (schema)
3. Implement core API endpoints
4. Develop job system
5. Implement FBA fee handling
6. Implement scenario modeling and optimization
7. Implement review queue
8. Enhance CSV import
9. Implement global date range selector
10. Connect frontend to new backend
11. Migrate existing data (if needed)
12. Deploy to production

---

> This enhanced architecture document outlines the improved design for DutyLeak, incorporating all the requested features including FBA fee handling, detailed margin analytics, scenario modeling, optimization suggestions, manual review queue, enhanced CSV import, and global date range selector.
