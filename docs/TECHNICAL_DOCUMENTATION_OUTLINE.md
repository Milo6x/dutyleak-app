# DutyLeak Platform - Technical Documentation Outline

## 1. Introduction
    1.1. Purpose of Technical Documentation
    1.2. Target Audience (Developers, Maintainers, System Architects)
    1.3. Overview of Key Technologies (Next.js, TypeScript, Supabase, Vercel, Playwright, Jest, etc.)

## 2. System Architecture
    2.1. High-Level Architecture Diagram (Components and Interactions)
        (Reference and expand upon `architecture_enhanced.md` if applicable)
    2.2. Frontend Architecture
        2.2.1. Next.js App Router Structure (`src/app`)
        2.2.2. Key UI Components (`src/components`) and Layouts
        2.2.3. State Management (e.g., React Context, Zustand, SWR for server state)
        2.2.4. Styling (Tailwind CSS, shadcn/ui)
    2.3. Backend Architecture (API Routes & Serverless Functions)
        2.3.1. Next.js API Route Handlers (`src/app/api`)
        2.3.2. Authentication Flow (Supabase Auth, NextAuth.js if used)
        2.3.3. Authorization Logic (`src/lib/permissions.ts`)
    2.4. Database Architecture (Supabase)
        2.4.1. Overview of Key Tables and Relationships (see Section 5 for details)
        2.4.2. Row Level Security (RLS) Strategy
    2.5. Background Job Processing
        2.5.1. `AdvancedBatchProcessor` (`src/lib/batch/advanced-batch-processor.ts`)
        2.5.2. Job Lifecycle and Persistence (`jobs` table)
    2.6. External Service Integrations
        2.6.1. AI Classification Services (OpenAI, Zonos - as per `ClassificationEngine`)
        2.6.2. Other external APIs (if any)

## 3. Codebase Overview
    3.1. Project Structure (Detailed walkthrough of key directories)
        3.1.1. `src/app/` (Routing, Page Components, API Routes)
        3.1.2. `src/components/` (Reusable UI Components)
        3.1.3. `src/lib/` (Core Logic, Services, Utilities, External Clients)
            3.1.3.1. `src/lib/amazon/` (FBA Fee Calculator)
            3.1.3.2. `src/lib/batch/` (AdvancedBatchProcessor)
            3.1.3.3. `src/lib/duty/` (ClassificationEngine, OptimizationEngine, ScenarioEngine, etc.)
            3.1.3.4. `src/lib/supabase/` (Client setup, types)
            3.1.3.5. `src/lib/permissions.ts`
        3.1.4. `src/hooks/` (Custom React Hooks)
        3.1.5. `supabase/migrations/` (Database Migrations)
        3.1.6. `e2e/` (Playwright E2E Tests)
        3.1.7. `docs/` (User and Technical Documentation)
    3.2. Key Modules and Their Responsibilities (Deep dive into selected complex modules)
        3.2.1. Authentication Flow (`middleware.ts`, Auth API routes, Supabase client)
        3.2.2. `AdvancedBatchProcessor` internal workings
        3.2.3. `ClassificationEngine` logic and provider integration
        3.2.4. `ScenarioEngine` and its calculation flow

## 4. API Internals (Developer-Focused)
    (This section complements user-facing API documentation by detailing internal logic for complex or critical APIs. Refer to `api-documentation.md` for public contract if it exists.)
    4.1. `/api/jobs` (POST, GET) - Interaction with `AdvancedBatchProcessor`.
    4.2. `/api/classification/classify` - Flow through `ClassificationEngine`.
    4.3. `/api/dashboard/stats` - Data aggregation logic.
    4.4. `/api/scenarios` (POST, GET) - Logic for saving and retrieving scenario data.
    4.5. Error Handling Strategy in APIs.
    4.6. Input Validation Approach (e.g., Zod schemas).

## 5. Database Schema
    5.1. Entity-Relationship Diagram (ERD) (if available, or link to Supabase schema visualizer)
    5.2. Detailed Description of Key Tables:
        5.2.1. `users`, `workspaces`, `workspace_users` (Tenancy and Roles)
        5.2.2. `products`
        5.2.3. `classifications`, `classification_logs`
        5.2.4. `jobs`, `job_logs`
        5.2.5. `scenarios`
        5.2.6. `review_queue`
        5.2.7. `api_keys` (if applicable)
    5.3. Important RLS Policies and Their Intent (examples for key tables).
    5.4. Database Migration Process (`supabase/migrations/` and `supabase db push`).

## 6. Local Development Setup
    6.1. Prerequisites (Node.js version, npm/yarn, Docker for local Supabase if used).
    6.2. Cloning the Repository.
    6.3. Environment Variable Setup (`.env.local` from `.env.example`).
        6.3.1. Supabase Local Development Setup (if using local Supabase instance).
        6.3.2. Connecting to a Cloud Supabase Dev Project.
    6.4. Installing Dependencies (`npm ci`).
    6.5. Running the Development Server (`npm run dev`).
    6.6. Running Linters and Formatters (`npm run lint`, `npm run format`).
    6.7. Running Tests:
        6.7.1. Unit/Integration Tests (`npm test`).
        6.7.2. E2E Tests (`npx playwright test`).
    6.8. Common Troubleshooting for Local Setup.

## 7. Coding Standards & Conventions
    7.1. Code Style (ESLint, Prettier - refer to config files).
    7.2. Naming Conventions (variables, functions, components, files).
    7.3. TypeScript Usage (strict mode, type definitions, interfaces vs. types).
    7.4. Component Design Patterns (e.g., Presentational vs. Container, use of shadcn/ui).
    7.5. State Management Approach (client-side, server-side with SWR).
    7.6. API Route Design Principles (request/response structure, error handling).
    7.7. Commenting and Code Documentation (JSDoc for complex functions).
    7.8. Git Commit Message Conventions.
    7.9. Testing Conventions (naming test files, structuring tests).

## 8. Key Libraries, Frameworks, and Services
    8.1. Next.js (App Router, API Routes, Server Components, Client Components).
    8.2. React & TypeScript.
    8.3. Supabase (Auth, Database, Storage, Edge Functions if used).
    8.4. Tailwind CSS & shadcn/ui.
    8.5. Jest (Testing Framework).
    8.6. Playwright (E2E Testing).
    8.7. SWR (Data Fetching).
    8.8. Zod (Validation - if used).
    8.9. Date-fns (Date manipulation).
    8.10. Lucide Icons.
    8.11. (List other significant libraries and their purpose).

## 9. CI/CD Pipeline
    (Reference `DEPLOYMENT_GUIDE.md` for full details, provide a summary here for developers)
    9.1. Overview of GitHub Actions workflow (`.github/workflows/ci.yml`).
    9.2. Key jobs: Test & Lint, Security, Build, E2E Test (incl. Lighthouse, ZAP), Deploy.
    9.3. How to interpret CI results.

## 10. Contributing Guide (If applicable for team development)
    10.1. Branching Strategy (brief recap).
    10.2. Pull Request Process (requirements, review process).
    10.3. Code Review Guidelines.
    10.4. Issue Tracking.

This outline will guide the creation of detailed technical documentation for the DutyLeak platform.
