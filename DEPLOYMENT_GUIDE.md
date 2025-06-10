# DutyLeak Platform - Deployment Guide

## 1. Introduction

This document provides an overview of the deployment strategy, CI/CD (Continuous Integration/Continuous Deployment) pipeline, environment setup, and configuration management for the DutyLeak platform.

**Key Technologies:**
*   **Hosting**: Vercel (for Next.js frontend and serverless functions)
*   **Database & Auth**: Supabase
*   **CI/CD**: GitHub Actions

## 2. Branching Strategy

A Gitflow-like branching strategy is used:
*   **`main` branch**: Represents the production-ready code. Merges to `main` trigger production deployments.
*   **`develop` branch**: Represents the latest development version with integrated features. Merges to `develop` trigger staging deployments.
*   **Feature branches (`feature/...`)**: Created from `develop` for new feature development. Merged back into `develop` via Pull Requests.
*   **Bugfix branches (`bugfix/...`)**: Created from `develop` (or `main` for hotfixes) to address bugs. Merged back accordingly.
*   **Release branches (`release/...`) (Optional)**: Used to prepare for a new production release, branched from `develop`. Allows for final testing and bug fixing before merging to `main` and `develop`.

## 3. CI/CD Pipeline Overview

The CI/CD pipeline is managed using GitHub Actions, defined in `.github/workflows/ci.yml`. It automates testing, building, and deploying the application.

**Pipeline Triggers:**
*   Push to `main` or `develop` branches.
*   Pull Request targeting the `main` branch.

**Key Jobs in the Pipeline:**

1.  **`test` (Test and Lint)**:
    *   Runs on every push to `main`/`develop` and PRs to `main`.
    *   Checks out code.
    *   Sets up Node.js.
    *   Installs dependencies (`npm ci`).
    *   Runs TypeScript type check (`npm run type-check`).
    *   Runs ESLint (`npm run lint`).
    *   Runs Jest unit and integration tests (`npm run test`).
    *   Uploads test coverage reports to Codecov.

2.  **`security` (Security Scan)**:
    *   Runs in parallel with the `test` job.
    *   Runs `npm audit` for dependency vulnerabilities.
    *   Runs Snyk security scan (requires `SNYK_TOKEN` secret).

3.  **`build` (Build Application)**:
    *   Depends on successful completion of `test` and `security` jobs.
    *   Builds the Next.js application (`npm run build`).
    *   Requires Supabase public URL and anon key as environment variables for the build process.
    *   Uploads build artifacts (`.next/`, `public/`, `package.json`) for subsequent jobs.

4.  **`e2e-test` (End-to-End Tests)**:
    *   Depends on successful completion of the `build` job.
    *   Installs dependencies and Playwright browsers.
    *   Downloads build artifacts.
    *   Starts the application locally using the production build (`npm start &`).
    *   Waits for the application to be ready on `http://localhost:3000`.
    *   Runs Playwright E2E tests (`npx playwright test`).
    *   Installs Lighthouse CI CLI.
    *   Runs Lighthouse CI audits (`lhci autorun`) against the locally running app.
    *   Runs OWASP ZAP baseline scan (`zaproxy/action-baseline`) against the locally running app and uploads the report.

5.  **`deploy-staging` (Deploy to Staging)**:
    *   Depends on successful completion of the `e2e-test` job.
    *   Runs only on pushes to the `develop` branch.
    *   Downloads build artifacts.
    *   Deploys to Vercel staging environment using `amondnet/vercel-action`.
    *   Requires Vercel token, org ID, and project ID secrets.

6.  **`deploy-production` (Deploy to Production)**:
    *   Depends on successful completion of the `e2e-test` job.
    *   Runs only on pushes to the `main` branch.
    *   Downloads build artifacts.
    *   Deploys to Vercel production environment (with `--prod` flag).
    *   Requires Vercel token, org ID, and project ID secrets.
    *   Notifies on successful deployment.

7.  **`migrate-database` (Run Database Migrations)**:
    *   Depends on successful completion of `deploy-production`.
    *   Runs only on pushes to the `main` branch.
    *   Uses Supabase CLI to apply database migrations (`supabase db push`).
    *   Requires Supabase project reference and access token secrets.

## 4. Environment Setup

### 4.1 Vercel Environments
*   **Production Environment**: Linked to the `main` branch. Uses production environment variables. Custom domain points here.
*   **Staging Environment**: Linked to the `develop` branch. Uses staging environment variables. Typically has a Vercel-generated URL (e.g., `app-develop.vercel.app`) or a staging subdomain.
*   **Preview Environments**: Vercel automatically creates preview deployments for each pull request, allowing for review before merging. These can use their own set of environment variables or inherit from staging.

### 4.2 Supabase Environments
It's highly recommended to have separate Supabase projects for different environments:
*   **Production Supabase Project**: Used by the live application. Contains real user data. Access is tightly controlled.
*   **Staging Supabase Project**: A separate Supabase project for the staging environment. Can be seeded with anonymized or representative test data. Allows for testing migrations and new features without affecting production data.
*   **Development Supabase Project(s)**: Developers may use local Supabase instances (via Docker) or individual cloud-hosted dev projects for development and testing.

Database migrations (`supabase/migrations/`) are developed locally, applied to staging, and then applied to production via the CI/CD pipeline.

## 5. Environment Variable Management

Environment variables are crucial for configuring the application for different environments (development, staging, production) and for storing secrets.

### 5.1 Vercel Environment Variables
*   Managed within the Vercel project settings for each environment (Production, Preview/Staging, Development).
*   Secrets required by the CI/CD pipeline for Vercel deployment (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) are stored as GitHub Actions secrets.
*   Application-specific environment variables needed at runtime and build time (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are configured in Vercel project settings.
    *   `NEXT_PUBLIC_` prefixed variables are available client-side.
    *   Non-prefixed variables are server-side only.

### 5.2 Supabase Environment Variables
*   **Supabase URL and Anon Key**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by the frontend and serverless functions to connect to Supabase. Different values are set for staging and production Vercel environments.
*   **Supabase Service Role Key**: `SUPABASE_SERVICE_ROLE_KEY` is used for backend operations requiring admin privileges (e.g., by `AdvancedBatchProcessor`, admin API routes). This is a highly sensitive key and must be stored securely as a server-side environment variable in Vercel.
*   **Supabase Access Token & Project Ref (for Migrations)**: `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` are used by the CI/CD pipeline to run database migrations. These are stored as GitHub Actions secrets.

### 5.3 Local Development (`.env.local`)
*   Developers use a `.env.local` file (gitignored) to store environment variables for their local development setup.
*   `.env.example` provides a template for required environment variables.

## 6. Deployment Process

1.  **Development**: Developers work on feature or bugfix branches, regularly pushing to remote.
2.  **Pull Request**: When a feature/fix is ready, a PR is created targeting the `develop` branch.
    *   CI pipeline runs: linting, type checks, unit/integration tests.
    *   Code review is performed.
    *   Vercel creates a preview deployment for the PR.
3.  **Merge to `develop`**: Upon PR approval and successful checks, the branch is merged into `develop`.
    *   CI pipeline runs again on `develop`: tests, security scans, build.
    *   If all pass, `e2e-test` job runs (including Playwright, Lighthouse, ZAP).
    *   If `e2e-test` passes, the `deploy-staging` job deploys the `develop` branch to the staging environment.
4.  **Testing on Staging**: Staging environment is used for further QA, UAT, and stakeholder reviews.
5.  **Release Preparation (Optional)**:
    *   A `release/...` branch may be created from `develop`.
    *   Final testing and hotfixes are done on the release branch.
6.  **Merge to `main` (Production Deployment)**:
    *   The `develop` branch (or `release` branch) is merged into `main`.
    *   CI pipeline runs on `main`: tests, security scans, build.
    *   If all pass, `e2e-test` job runs.
    *   If `e2e-test` passes, `deploy-production` job deploys to Vercel production.
    *   `migrate-database` job runs to apply any new database migrations to the production Supabase instance.

## 7. Rollback Strategy (Basic)

*   **Vercel**: Vercel keeps previous deployments. A rollback can be performed by promoting an older, stable deployment to production via the Vercel dashboard.
*   **Supabase**: Database rollbacks are more complex.
    *   Migrations should be written to be reversible if possible.
    *   Regular database backups are essential (handled by Supabase cloud).
    *   For critical issues, restoring from a backup might be necessary, coordinated with application code rollback.
    *   A more advanced strategy might involve blue/green deployments or canary releases, but this is beyond the current setup.

This guide provides a foundational overview. Specific details and procedures should be regularly reviewed and updated as the platform and infrastructure evolve.
