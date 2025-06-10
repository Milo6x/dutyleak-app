# API Endpoint Performance Baseline

## 1. Introduction

This document outlines the plan for profiling critical API endpoints of the DutyLeak platform to establish a performance baseline. These baseline metrics will serve as a reference for future performance testing, optimization efforts, and identifying regressions.

## 2. Methodology

### 2.1 Environment
*   **Testing Environment**: Performance tests should ideally be conducted in a stable environment that closely mirrors production (e.g., a dedicated staging environment). If not available, tests can be run against a local production build (`npm run build && npm start`).
*   **Network Conditions**: Note the network conditions if testing against a remote server. For local testing, network latency is minimized.
*   **Database State**: The state of the database (e.g., number of records in key tables like `products`, `jobs`, `classifications`) can significantly impact performance. Tests should be run with:
    *   A small, controlled dataset (e.g., 10-100 records).
    *   A larger, more realistic dataset (e.g., 1,000-10,000 records where applicable).
    *   The dataset size should be documented for each test run.

### 2.2 Tools
*   **Browser Developer Tools**: For initial inspection of GET requests (Network tab).
*   **Postman / Insomnia**: For sending various HTTP requests (GET, POST, PUT, DELETE), managing request bodies, and viewing response times and sizes.
*   **`curl` with `time` command**: For command-line testing and simple scripting of repeated requests.
    Example: `time curl -X GET -H "Authorization: Bearer <token>" http://localhost:3000/api/products?limit=10`
*   **Simple Scripting (Optional)**: Node.js scripts using `node-fetch` or `axios` and `performance.now()` to make multiple requests and average timings.
*   **Load Testing Tools (Future Consideration)**: Tools like k6, Apache JMeter, or Artillery for more advanced load testing (beyond current scope of baselining).

### 2.3 Metrics to Collect (per endpoint)
*   **Average Response Time (ms)**: Over a series of N requests (e.g., N=10).
*   **Time To First Byte (TTFB) (ms)**.
*   **95th Percentile Response Time (P95) (ms)**: If making multiple requests.
*   **Request Success Rate (%)**: Percentage of successful (2xx) responses.
*   **Request/Response Size (KB)**.
*   **CPU/Memory Usage (Server-side)**: If observable during testing.
*   **Database Query Performance**: If slow endpoints are identified, analyze underlying database queries using tools like `EXPLAIN ANALYZE`.

## 3. Critical API Endpoints to Profile

The following API endpoints are considered critical and should be profiled. Results should be recorded for both "Small Dataset" and "Large Dataset" conditions where applicable.

| Endpoint                          | Method | Description                                     | Key Parameters / Conditions to Test                                  | Small Dataset (Avg Time) | Large Dataset (Avg Time) | Notes                                     |
|-----------------------------------|--------|-------------------------------------------------|----------------------------------------------------------------------|--------------------------|--------------------------|-------------------------------------------|
| **Authentication**                |        |                                                 |                                                                      |                          |                          |                                           |
| `/api/auth/signup`                | POST   | User registration                               | Valid new user data                                                  |                          |                          | Primarily DB write performance            |
| `/api/auth/login`                 | POST   | User login                                      | Valid credentials                                                    |                          |                          | DB read, session creation                 |
| **Dashboard**                     |        |                                                 |                                                                      |                          |                          |                                           |
| `/api/dashboard/stats`            | GET    | Fetch main dashboard statistics                 | Authenticated user, varying number of underlying records (products, jobs) |                          |                          | Multiple aggregate queries likely         |
| **Products**                      |        |                                                 |                                                                      |                          |                          |                                           |
| `/api/products`                   | GET    | List products (paginated)                       | `limit`, `offset`, various filters (category, status)                | (e.g., 100 products)     | (e.g., 10k products)     | Test with/without filters                 |
| `/api/products`                   | POST   | Create a new product                            | Valid product data                                                   |                          |                          | DB write performance                      |
| `/api/products/{id}`              | GET    | Get single product details                      | Valid product ID                                                     |                          |                          | DB read performance                       |
| `/api/products/{id}`              | PUT    | Update a product                                | Valid product ID, updated data                                       |                          |                          | DB write performance                      |
| `/api/products/bulk`              | POST   | Bulk product operations (e.g. update/delete)    | Small batch (10), Large batch (100)                                  |                          |                          | Depends on underlying job system          |
| **Classification**                |        |                                                 |                                                                      |                          |                          |                                           |
| `/api/classification/classify`    | POST   | Classify a single product                       | Product details (name, desc)                                         |                          |                          | External AI API latency, DB writes        |
| `/api/core/classify-hs/batch`     | POST   | Batch classify products (likely via job system) | List of product IDs                                                  | (e.g., 10 products)      | (e.g., 100 products)     | Job creation performance                  |
| **Jobs**                          |        |                                                 |                                                                      |                          |                          |                                           |
| `/api/jobs`                       | GET    | List jobs (paginated)                           | `limit`, `offset`, `status`, `type` filters                          | (e.g., 50 jobs)          | (e.g., 500 jobs)         | Test with/without filters                 |
| `/api/jobs`                       | POST   | Create a new job (e.g., for bulk classification)| Job type, parameters (product IDs)                                   |                          |                          | `AdvancedBatchProcessor.addJob` perf    |
| `/api/jobs/{jobId}/rerun`         | POST   | Rerun a failed job                              | Valid failed job ID                                                  |                          |                          | `AdvancedBatchProcessor.addJob` perf    |
| **Analytics**                     |        |                                                 |                                                                      |                          |                          |                                           |
| `/api/analytics/overview`         | GET    | Comprehensive analytics overview                | Date ranges, workspace with varying data volumes                     |                          |                          | Complex aggregate queries                 |
| `/api/analytics/savings`          | GET    | Savings-specific analytics                      | Date ranges                                                          |                          |                          |                                           |
| `/api/analytics/profitability`    | GET    | Profitability analytics                         | Date ranges                                                          |                          |                          |                                           |
| **Scenarios**                     |        |                                                 |                                                                      |                          |                          |                                           |
| `/api/scenarios`                  | GET    | List scenarios                                  | Authenticated user                                                   | (e.g., 20 scenarios)     | (e.g., 200 scenarios)    |                                           |
| `/api/scenarios`                  | POST   | Create a new scenario                           | Scenario parameters                                                  |                          |                          | DB write, potential initial calculation |
| `/api/core/calculate-landed-cost` | POST   | Calculate landed cost (used by scenarios)       | Product details, HS code, origin/dest, costs                       |                          |                          | Calculation logic performance             |

## 4. Execution and Reporting

*   **Execution**: Manually execute tests for each endpoint using the chosen tools. Perform 5-10 runs for each specific condition and record the average, P95, and TTFB.
*   **Recording**: Fill in the table above with the collected baseline metrics.
*   **Analysis**: After baselining, review the numbers. Identify any endpoints that seem unusually slow or have high variability. These will be candidates for further investigation in Subtask 24.3.

This document will be updated with the actual baseline figures once the profiling is performed.
