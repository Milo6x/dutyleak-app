# DutyLeak Platform - Monitoring, Logging, and Alerting Plan

## 1. Introduction

This document outlines the strategy for monitoring, logging, and alerting for the DutyLeak platform. The goal is to ensure system health, identify issues proactively, facilitate debugging, and maintain a high level of reliability and performance.

## 2. Objectives
*   **Proactive Issue Detection**: Identify and address problems before they significantly impact users.
*   **Performance Monitoring**: Track key performance indicators (KPIs) for frontend and backend systems.
*   **Error Tracking**: Capture and analyze application errors to facilitate rapid debugging.
*   **Resource Utilization**: Monitor server and database resource usage to plan for scaling.
*   **Security Monitoring**: Log and alert on suspicious activities or security events.
*   **Operational Insight**: Provide visibility into system behavior and user activity.

## 3. Monitoring Strategy

### 3.1 Frontend Performance Monitoring
*   **Tool**: Lighthouse CI (integrated into GitHub Actions via `.lighthouserc.js`).
*   **Metrics**: Core Web Vitals (LCP, FID/TBT, CLS), Performance Score, Accessibility Score, Best Practices Score, SEO Score.
*   **Scope**: Key pages including Home, Dashboard, Product List, Analytics, Scenario Modeler, Admin Jobs page.
*   **Frequency**: Runs on every PR and push to `main`/`develop` branches.
*   **Reporting**: Reports uploaded to temporary public storage (or LHCI server if configured). Assertions in `.lighthouserc.js` can warn/fail builds based on score thresholds.

### 3.2 Backend API Performance Monitoring
*   **Tool(s) under consideration**:
    *   **Vercel Analytics**: Provides some insights into serverless function execution times and errors for API routes.
    *   **Supabase Dashboard**: Offers query performance monitoring and database health metrics.
    *   **APM Solution (e.g., Sentry, New Relic, Datadog - for future evaluation)**: For more detailed transaction tracing, error tracking, and performance bottleneck analysis in API endpoints and backend services.
*   **Metrics**: Response time (avg, P95, P99), error rates, throughput (requests per minute), TTFB.
*   **Scope**: Critical API endpoints as identified in `docs/API_PERFORMANCE_BASELINE.md`.
*   **Frequency**: Continuous monitoring via Vercel/Supabase; periodic manual profiling for baselining.

### 3.3 Uptime Monitoring
*   **Tool(s) under consideration**: External uptime monitoring services (e.g., UptimeRobot, StatusCake, Better Uptime).
*   **Scope**: Key public-facing URLs (e.g., main application URL, critical API health check endpoint).
*   **Frequency**: Checks every 1-5 minutes.
*   **Alerting**: Integrated with alerting system (see Section 5).

### 3.4 Database Monitoring
*   **Tool**: Supabase Dashboard.
*   **Metrics**: CPU utilization, memory usage, disk I/O, active connections, slow query logs, index hit rates.
*   **Frequency**: Continuous via Supabase platform. Regular review by development/ops team.

### 3.5 Background Job Monitoring
*   **Tool**: Custom Admin UI (`/admin/jobs` page).
*   **Metrics**: Job statuses (pending, running, completed, failed, dead_letter), queue length, processing times, error rates.
*   **Frequency**: Real-time updates on the UI; periodic review by admins.
*   **Alerting**: For high failure rates or long queue times (see Section 5).

## 4. Logging Strategy

### 4.1 Application Logs (Backend/API)
*   **Source**: Next.js API routes (serverless functions on Vercel).
*   **Collection**: Vercel automatically collects `console.log`, `console.error`, etc., output from serverless functions. Accessible via Vercel dashboard.
*   **Content**:
    *   Request details (method, path, key parameters - avoid logging sensitive data).
    *   Key processing steps and decisions.
    *   Errors with stack traces.
    *   Execution times for critical operations.
    *   User ID and Workspace ID for context (where appropriate and secure).
*   **Format**: Structured logging (JSON) is preferred for easier parsing and searching.
    `Example: console.log(JSON.stringify({ level: 'info', message: 'User login successful', userId: '...', workspaceId: '...' }));`
*   **Centralization (Future Consideration)**: Evaluate sending Vercel logs to a centralized logging platform (e.g., Logtail, BetterStack, Sentry, ELK stack) for advanced search, analysis, and longer retention.

### 4.2 Frontend Logs
*   **Source**: Client-side browser console.
*   **Collection**:
    *   Primarily for local development debugging.
    *   **Error Tracking Tool (e.g., Sentry - for future evaluation)**: Capture unhandled exceptions and key client-side errors in production, sending them to a centralized service.
*   **Content**: Key UI events, state changes (for debugging), API call initiations/responses, user interactions leading to errors. Avoid logging sensitive user data.

### 4.3 Database Logs
*   **Source**: Supabase.
*   **Collection**: Accessible via Supabase dashboard (query logs, audit logs if enabled).
*   **Content**: Slow queries, errors, potentially DDL/DML changes if audit logging is configured.

### 4.4 Security Logs
*   **Source**: Application code, Supabase Auth logs, Vercel logs.
*   **Content**: Failed login attempts, authorization failures, significant permission changes, potential security events from ZAP/Snyk (if they can be logged centrally).
*   **Review**: Periodically review security-relevant logs.

### 4.5 Log Retention
*   **Vercel**: Default retention (check Vercel's current policy, typically 1-7 days for basic plans, longer for higher tiers or via log drains).
*   **Supabase**: Default retention (check Supabase's current policy).
*   **Centralized Logging Service (if implemented)**: Configure retention based on compliance and operational needs (e.g., 30-90 days).

## 5. Alerting Strategy

### 5.1 Alerting Tools
*   **Vercel**: Can be configured for deployment status alerts. May offer some basic error rate alerting.
*   **Supabase**: May offer alerts for database resource limits or critical issues.
*   **Uptime Monitor**: Will send alerts for downtime.
*   **APM/Error Tracking (e.g., Sentry)**: Will provide alerts for new error types, high error rates, performance regressions.
*   **CI/CD (GitHub Actions)**: Alerts for build failures, test failures (including Lighthouse/ZAP if configured to fail build).
*   **Custom Alerts (Future)**: Scripts or services that query logs or metrics and trigger alerts based on custom thresholds.

### 5.2 Critical Alert Conditions
*   **Application Downtime**: Production URL unresponsive.
*   **High Error Rate**: Significant spike in 5xx server errors or unhandled frontend exceptions.
*   **Deployment Failures**: Staging or Production deployment fails in CI/CD.
*   **Security Alerts**:
    *   High-severity vulnerabilities detected by Snyk/ZAP in CI (if CI is configured to alert/fail).
    *   Suspicious activity detected in logs (e.g., multiple failed logins from same IP).
*   **Database Issues**: High CPU/memory on Supabase, connection pool exhaustion, critical DB errors.
*   **Background Job System Failure**:
    *   High number of jobs in `dead_letter` status.
    *   Job queue growing excessively without processing.
    *   `AdvancedBatchProcessor` itself crashing or reporting critical errors.
*   **Key Business Metric Anomalies (Future)**: E.g., sudden drop in successful classifications, if real-time monitoring is set up.

### 5.3 Notification Channels
*   **Email**: For less urgent alerts or daily summaries.
*   **Slack/Microsoft Teams**: For urgent alerts requiring immediate attention by the development/ops team.
*   **PagerDuty/Opsgenie (Future)**: For critical production alerts requiring on-call rotation.

## 6. Review and Iteration
This Monitoring, Logging, and Alerting Plan should be reviewed periodically (e.g., quarterly or after major releases) and updated as the application evolves, new tools become available, or operational needs change.
