# DutyLeak Platform - Backup and Recovery Plan

## 1. Introduction

This document outlines the backup and recovery procedures for the DutyLeak platform, covering both the application (hosted on Vercel) and the database (managed by Supabase). The goal is to ensure data integrity, minimize downtime, and provide clear steps for recovery in case of data loss or system failure.

## 2. Scope
This plan covers:
*   **Database Backups**: Procedures related to Supabase database backups.
*   **Database Recovery**: Steps to restore the Supabase database from backups.
*   **Application Code**: Handled by Git version control.
*   **Application Deployment Rollback**: Procedures for reverting to a previous stable deployment on Vercel.
*   **Static Assets**: Handled as part of Vercel deployments.

## 3. Recovery Objectives
*   **Recovery Time Objective (RTO)**: The target maximum time allowed for the recovery of the application and database services after a disaster.
    *   Target RTO: [e.g., 4 hours for critical database restore, 30 minutes for application rollback via Vercel]. *(To be defined based on business impact analysis)*
*   **Recovery Point Objective (RPO)**: The maximum acceptable amount of data loss measured in time.
    *   Target RPO: [e.g., 24 hours, based on Supabase daily backups]. *(To be defined based on business impact analysis and Supabase plan features)*

## 4. Database Backup and Recovery (Supabase)

### 4.1 Supabase Backup Capabilities
*   **Automated Daily Backups**: Supabase automatically performs daily backups for projects on all plans (including free tier, though retention might differ).
    *   **Frequency**: Typically once every 24 hours.
    *   **Retention**: Varies by Supabase plan (e.g., 7 days for Pro plan, may be less for free/starter plans). Check the current Supabase documentation for your project's plan.
*   **Point-In-Time Recovery (PITR)**: Available on Supabase paid plans (e.g., Pro plan and above).
    *   Allows restoring the database to any specific point in time within a defined window (e.g., last 7 days), offering more granular recovery than daily snapshots.
    *   PITR typically uses Write-Ahead Logging (WAL).
*   **Manual Backups (Optional)**:
    *   Supabase dashboard may offer an option to trigger a manual backup.
    *   For additional security or longer retention, `pg_dump` can be used to manually back up the database to an external storage location (e.g., S3 bucket). This would require a separate script and scheduling mechanism if automated. *(Currently not implemented as a standard procedure, relying on Supabase automated backups).*

### 4.2 Database Recovery Procedure (from Supabase Backups)
1.  **Identify Need for Restore**: Determine the cause and extent of data loss or corruption. Confirm that a restore is necessary.
2.  **Contact Supabase Support / Use Dashboard**:
    *   For projects on paid plans with PITR or extended backup retention, database restores are typically initiated via the Supabase dashboard or by contacting Supabase support.
    *   Follow Supabase's documented procedure for requesting a restore.
3.  **Choose Recovery Point**:
    *   If using daily snapshots, select the most recent valid backup before the incident.
    *   If using PITR, specify the exact point in time to restore to.
4.  **Restoration Process**:
    *   Supabase will handle the restoration process. This may involve creating a new database instance from the backup or restoring over the existing one (clarify with Supabase support which method is used).
    *   The time taken for restoration will depend on the database size and Supabase's operational procedures.
5.  **Post-Restore Validation**:
    *   Thoroughly test the application and validate data integrity after the restore is complete.
    *   Check key functionalities and data points to ensure the restore was successful and to the correct point.
6.  **Communicate**: Inform stakeholders about the recovery status.

### 4.3 Monitoring Backup Success
*   Supabase typically manages the success of its automated backups. Check the Supabase dashboard for backup status and history if available.
*   Set up notifications from Supabase if they offer alerts for backup failures.

## 5. Application Deployment Rollback (Vercel)

### 5.1 Vercel Deployment History
*   Vercel keeps a history of all deployments made to a project.
*   Each deployment is immutable and has a unique URL.

### 5.2 Rollback Procedure
1.  **Identify Problematic Deployment**: Determine which deployment introduced an issue.
2.  **Access Vercel Dashboard**: Log in to the Vercel dashboard for your project.
3.  **Navigate to Deployments**: Go to the "Deployments" tab.
4.  **Select Previous Stable Deployment**: Find a known good deployment from the list.
5.  **Promote to Production/Staging**: Use Vercel's interface to "Promote to Production" (for the `main` branch environment) or redeploy to the relevant environment (e.g., by re-running the deploy job for a specific commit on `develop` for staging). This instantly switches the live traffic or staging URL to the selected older deployment.
6.  **Verify**: Test the application to ensure the rollback was successful and the issue is resolved.

Application code itself is versioned in Git. If a rollback requires code changes beyond what Vercel's deployment promotion offers, a `git revert` or new commit fixing the issue would be pushed, triggering a new CI/CD deployment.

## 6. Static Assets
*   Static assets (images, fonts, etc.) are bundled with each Vercel deployment. Rolling back a deployment also rolls back the version of static assets associated with that deployment.

## 7. Responsibilities

*   **Development Team / DevOps Lead**:
    *   Ensure understanding of Supabase backup features relevant to the project's plan.
    *   Document and periodically review this Backup and Recovery Plan.
    *   Define RTO and RPO in consultation with stakeholders.
    *   Initiate and oversee recovery procedures when necessary.
    *   Test recovery procedures periodically (e.g., annually or after major infrastructure changes).
*   **Supabase**: Responsible for the execution and availability of automated database backups as per their service agreement.
*   **Vercel**: Responsible for maintaining deployment history and enabling rollback functionality.

## 8. Testing Recovery Procedures (Simulated)

It is crucial to periodically test the recovery procedures to ensure they are effective and the team is familiar with them.

### 8.1 Database Recovery Test (Staging Environment)
1.  **Schedule**: Plan a test window.
2.  **Backup Staging DB (Optional)**: If performing destructive tests, ensure the current staging DB can be easily restored if the test goes wrong.
3.  **Simulate Data Loss/Corruption**: (e.g., delete a few non-critical tables or records in the staging database).
4.  **Initiate Restore**: Follow the documented procedure to request Supabase to restore the staging database from a recent backup or to a specific point in time.
5.  **Validate**: After restoration, verify that the "lost" data is recovered and the staging application functions correctly.
6.  **Document**: Record the time taken, any issues encountered, and lessons learned.

### 8.2 Vercel Deployment Rollback Test (Staging Environment)
1.  **Identify Current Staging Deployment**.
2.  **Identify a Previous Stable Staging Deployment**.
3.  **Perform Rollback**: Use the Vercel dashboard to promote the older deployment to the staging environment's URL.
4.  **Verify**: Confirm that the staging environment now serves the older version and functions as expected.
5.  **Roll Forward (Optional)**: Redeploy the latest intended version to staging.
6.  **Document**: Record the process and time taken.

## 9. Plan Review and Updates
This Backup and Recovery Plan should be reviewed and updated at least annually, or whenever significant changes are made to the application architecture, hosting providers, or data management practices.
