# DutyLeak Deployment Guide

This guide provides instructions for deploying the improved DutyLeak application, which replaces the previous n8n workflow with a robust in-app job system and custom backend.

## Prerequisites

- [Vercel](https://vercel.com) account
- [Supabase](https://supabase.com) account
- [Node.js](https://nodejs.org) (v18 or later)
- [pnpm](https://pnpm.io) (v8 or later)
- API keys for external services:
  - Zonos API (optional but recommended)
  - OpenAI API (optional but recommended)
  - Amazon SP-API (if using Amazon integration)

## Step 1: Set Up Supabase Project

1. Create a new Supabase project from the [Supabase Dashboard](https://app.supabase.com)
2. Note your project URL and API keys (anon key and service role key)
3. Apply the database migrations:

```bash
cd dutyleak-improved
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

Alternatively, you can manually run the SQL migration files in the Supabase SQL Editor in this order:
- `supabase/migrations/20250529000000_initial_schema.sql`
- `supabase/migrations/20250529000001_classifications_schema.sql`
- `supabase/migrations/20250529000002_duty_rates_schema.sql`
- `supabase/migrations/20250529000003_savings_ledger_schema.sql`

## Step 2: Configure Environment Variables

Create a `.env.local` file in the project root with the following variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# External APIs
ZONOS_API_KEY=your-zonos-api-key
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o

# Job System
JOBS_WORKER_SECRET=generate-a-secure-random-string

# Cron Jobs
CRON_SECRET=generate-a-secure-random-string

# Optional: Monitoring
SLACK_WEBHOOK_URL=your-slack-webhook-url
```

## Step 3: Install Dependencies and Build

```bash
cd dutyleak-improved
pnpm install
pnpm build
```

## Step 4: Local Testing

```bash
pnpm dev
```

Visit `http://localhost:3000` to test the application locally.

## Step 5: Deploy to Vercel

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Import the project in Vercel:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" > "Project"
   - Select your Git repository
   - Configure the project:
     - Framework Preset: Next.js
     - Root Directory: ./
     - Build Command: pnpm build
     - Output Directory: .next
   - Add all environment variables from your `.env.local` file
   - Click "Deploy"

## Step 6: Configure Vercel Cron Jobs

Add the following to your `vercel.json` file (already included in the project):

```json
{
  "crons": [
    {
      "path": "/api/cron/trigger-spapi-export",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/trigger-batch-classification",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/health-check",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

This configures:
- Daily product export from SP-API at midnight
- Daily batch classification at 2 AM
- Health checks every 30 minutes

## Step 7: Set Up Authentication

1. Configure authentication providers in your Supabase project:
   - Go to Authentication > Providers
   - Enable Email provider with "Confirm email" option
   - Configure any additional providers as needed (Google, etc.)

2. Set up email templates:
   - Go to Authentication > Email Templates
   - Customize the Magic Link template

## Step 8: Verify Deployment

1. Visit your deployed application
2. Sign up for a new account (this will create a workspace automatically)
3. Test the core functionality:
   - Upload a product
   - Classify the product
   - Calculate landed cost
   - Monitor jobs

## Troubleshooting

### Database Connection Issues

- Verify your Supabase URL and API keys
- Check that RLS policies are correctly applied
- Ensure your IP is not blocked by Supabase

### API Integration Issues

- Verify your API keys for external services
- Check the logs in Vercel for detailed error messages
- Test the API endpoints using the health check endpoint

### Job System Issues

- Check job logs in the database
- Verify that Vercel Cron jobs are correctly configured
- Ensure the JOBS_WORKER_SECRET is correctly set

## Maintenance

### Database Backups

Supabase automatically creates daily backups. For additional protection:

1. Go to your Supabase project dashboard
2. Navigate to Project Settings > Database
3. Click "Generate backup" to create a manual backup

### Monitoring

1. Set up Slack notifications by configuring the SLACK_WEBHOOK_URL
2. Monitor the health check endpoint for system status
3. Use Vercel Analytics to monitor API performance

## Scaling

The application is designed to scale with your needs:

- Supabase can handle millions of records
- Vercel automatically scales to handle traffic
- The job system breaks down large tasks into manageable chunks

For very high volume:
- Consider upgrading your Supabase plan
- Implement additional caching strategies
- Set up dedicated worker services for long-running jobs
