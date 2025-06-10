# DutyLeak Platform - Testing Plan

## 1. Introduction

### 1.1 Purpose of the Test Plan
This document outlines the comprehensive testing strategy for the DutyLeak platform. It details the scope, approach, resources, and schedule of intended testing activities to ensure the platform meets quality standards and functions as expected.

### 1.2 Scope of Testing
This plan covers:
*   **Unit Testing**: Testing individual modules, functions, and classes.
*   **Integration Testing**: Testing the interaction between different components, services, and API endpoints.
*   **End-to-End (E2E) Testing**: Testing complete user workflows through the user interface.

Key areas include authentication, core business logic (classification, calculation engines), API endpoints, frontend components, user flows, and background job processing.

### 1.3 Testing Objectives
*   Verify that all functional requirements are met.
*   Identify and report defects early in the development cycle.
*   Ensure system stability, reliability, and performance under expected load.
*   Validate data integrity and security.
*   Confirm that user interfaces are intuitive and user-friendly.
*   Ensure the application behaves correctly across different scenarios and edge cases.

## 2. Testing Strategy

### 2.1 Levels of Testing

#### 2.1.1 Unit Testing
*   **Focus**: Individual, isolated software components (functions, methods, classes).
*   **Goal**: Verify that each unit performs its specific function correctly.
*   **Methodology**: White-box testing, typically written by developers. Mock dependencies to isolate the unit under test.

#### 2.1.2 Integration Testing
*   **Focus**: Interaction between integrated components or modules. This includes API endpoint testing, interactions between services, and database interactions.
*   **Goal**: Detect defects in the interfaces and interactions between integrated components.
*   **Methodology**: Test API request/response cycles, data flow between services, and ensure components work together as designed. May involve a test database or mocked external services.

#### 2.1.3 End-to-End (E2E) Testing
*   **Focus**: Complete application workflows from the user's perspective, simulating real user scenarios.
*   **Goal**: Validate the entire application flow, ensuring all integrated components function correctly together in a production-like environment.
*   **Methodology**: Black-box testing, interacting with the application through its UI.

### 2.2 Testing Tools & Frameworks
*   **Unit & Integration Testing**:
    *   **Jest**: JavaScript testing framework. Used for testing React components, utility functions, and API endpoint handlers (with tools like `supertest` or Next.js test utilities if applicable).
*   **End-to-End (E2E) Testing**:
    *   **Playwright**: Framework for E2E testing, enabling interaction with web browsers. (Based on existing `e2e/` directory structure).
*   **Database & Services**:
    *   **Supabase Test Helpers/SDK**: For setting up test data, clearing data, or interacting with Supabase services during tests.
    *   **Mocking Libraries**: Such as Jest's built-in mocking capabilities, for isolating units and components.

### 2.3 Test Environments
*   **Development**: Local developer environments for writing and running tests during development.
*   **Staging/Testing (Recommended)**: A dedicated environment that mirrors production as closely as possible for running comprehensive integration and E2E tests before deployment.
*   **Production**: Monitoring and limited smoke testing post-deployment. This plan primarily focuses on pre-production testing.

### 2.4 Test Data Management
*   **Unit/Integration Tests**: Use mock data or small, controlled datasets. For database-dependent tests, set up and tear down specific test data for each test case or suite.
*   **E2E Tests**: Requires a more stable set of test data in the E2E test environment. This might involve pre-populating the database with specific user accounts, products, and configurations. Consider data anonymization if using production-like data.

## 3. Scope of Testing - Key Areas & Features

The following areas and features will be prioritized for testing:

### 3.1 Authentication & Authorization
*   User Signup (including workspace creation flow)
*   User Login & Logout
*   Password Reset Functionality
*   Session Management (cookie handling, expiration)
*   Role-Based Access Control (RBAC): Verify permissions for Owner, Admin, Member, Viewer roles across different features.
*   Workspace access restrictions.

### 3.2 Core Logic (`src/lib`)
*   **`ClassificationEngine`**: Accuracy of HS code suggestions, handling of different inputs.
*   **`FbaFeeCalculator`**: Correctness of FBA fee estimations for various product types and dimensions.
*   **`OptimizationEngine`**: Generation of valid and useful optimization recommendations.
*   **`ScenarioEngine`**: Accuracy of scenario comparisons and calculations.
*   **`MetricsCalculator`**: Correctness of analytics data aggregation.
*   **`JobProcessor` & `AdvancedBatchProcessor`**: Job lifecycle management, queue logic, error handling, retry mechanisms, persistence.
*   **`permissions.ts`**: Correctness of permission checking helper functions.

### 3.3 API Endpoints (`src/app/api`)
Test critical API endpoints for:
*   Correct request handling and validation.
*   Authentication and authorization enforcement.
*   Accurate data processing and response generation.
*   Error handling and appropriate status codes.
*   Key endpoints include:
    *   `/auth/*` (signup, login, etc.)
    *   `/products/*` (CRUD, bulk operations)
    *   `/classification/*` (classify, review)
    *   `/jobs/*` (create, list, rerun) & `/batch/*`
    *   `/analytics/*` & `/dashboard/stats`
    *   `/scenarios/*` (CRUD, sharing)
    *   `/settings/*` (profile, workspace, API keys)
    *   `/review-queue/*`

### 3.4 Frontend Components & User Flows (`src/components`, `src/app`)
*   **Product Management**: Adding, editing, deleting products; CSV import process and UI.
*   **HS Code Classification**: Single product classification UI, bulk classification initiation, Review Queue UI (listing, filtering, approving/overriding).
*   **Scenario Modeler**: Creating, configuring, calculating, comparing, saving, loading, and sharing scenarios.
*   **Analytics Dashboards**: Correct data display in charts and tables on Main Dashboard and Comprehensive Analytics page; filtering and export functionalities.
*   **Admin Job Monitoring UI**: Display of job list, status updates, progress bars, error messages, retry functionality.
*   **User & Workspace Settings**: Profile updates, inviting/managing workspace members, role changes.
*   **General UI/UX**: Responsiveness, error message display, form validation, navigation.

### 3.5 Background Job Processing
*   Verification of job creation through API calls.
*   Correct queuing and prioritization by `AdvancedBatchProcessor`.
*   Successful execution of different job types (`classification`, `fba_calculation`, `duty_optimization`, `data_export`, `data_import`, `scenario_analysis`).
*   Accurate status updates and progress reporting.
*   Robust error handling and retry logic for jobs.
*   Correct persistence and loading of jobs (if `enablePersistence` is true).

## 4. Unit Testing Details
*   **Location**: `__tests__` directories alongside the modules being tested (e.g., `src/lib/duty/__tests__/ClassificationEngine.test.ts`).
*   **Focus**: Test public methods of classes and individual functions in `src/lib`.
*   **Examples**:
    *   `FbaFeeCalculator.calculate()` with various inputs.
    *   `MetricsCalculator` functions for specific metric calculations.
    *   `AdvancedBatchProcessor` methods for adding jobs, processing queue (mocking actual job work), handling errors/retries.
    *   Utility functions in `permissions.ts`.
*   **Methodology**: Use Jest. Mock external dependencies (like Supabase client calls, API fetches) to ensure tests are isolated and fast.

## 5. Integration Testing Details
*   **Location**: Can be in `__tests__` directories for API routes or service integrations.
*   **Focus**:
    *   API Endpoints: Send HTTP requests to API routes and verify responses, status codes, and any side effects (e.g., database changes).
    *   Service Interactions: Test how different services/classes from `src/lib` interact (e.g., `OptimizationEngine` using `ClassificationEngine`).
*   **Examples**:
    *   Test `POST /api/products` by sending product data and verifying the response and database state.
    *   Test `AdvancedBatchProcessor.addJob()` and verify that `persistJob` correctly writes to the (mocked) database and the job appears in `getJobs()`.
    *   Test the flow from an API call creating a job to `AdvancedBatchProcessor` picking it up and processing it (mocking the actual long-running task).
*   **Methodology**: Use Jest, potentially with `supertest` for API endpoint testing if not using Next.js integrated test runners. Mock external services (e.g., actual AI classification APIs) but allow interaction with a test instance of Supabase where feasible or use Supabase mocking utilities.

## 6. End-to-End (E2E) Testing Details
*   **Location**: `e2e/` directory.
*   **Focus**: Simulate real user scenarios by interacting with the application's UI.
*   **Examples (expand on existing `landed-cost-calculation.spec.ts`, `review-queue-workflow.spec.ts`):**
    1.  **User Registration & Onboarding**: Signup -> Email Verification -> Workspace Creation -> Land on Dashboard.
    2.  **Product Import & Bulk Classification**: Login -> Navigate to Product Import -> Upload CSV -> Monitor Import Job -> Initiate Bulk Classification Job -> Monitor Classification Job -> Check Review Queue for low-confidence items.
    3.  **Scenario Modeling for Sourcing**: Login -> Navigate to Scenario Modeler -> Create Baseline Scenario -> Create Alternative Sourcing Scenario -> Calculate & Compare -> Save Scenario.
    4.  **View Analytics**: Login -> Navigate to Main Dashboard -> Verify Key Metrics -> Navigate to Comprehensive Analytics -> Interact with Tabs & Filters -> Export Data.
    5.  **Admin: Job Monitoring & Retry**: Login as Admin -> Navigate to Admin Job Monitoring -> Observe Job List -> Trigger a job that fails -> Retry the failed job -> Verify new job is queued.
*   **Methodology**: Use Playwright to script browser interactions. Tests should include assertions for UI elements, data display, and navigation. Requires a stable E2E test environment with pre-configured test data.

## 7. Test Execution & Reporting
*   **Execution**:
    *   Unit and integration tests: Run via `npm test` or `yarn test` (Jest).
    *   E2E tests: Run via Playwright CLI commands (e.g., `npx playwright test`).
    *   Automated execution in CI/CD pipeline (e.g., GitHub Actions on every push/PR).
*   **Reporting**:
    *   Jest and Playwright generate reports on test execution (pass/fail counts, duration).
    *   Aim for increasing test coverage over time. Coverage reports can be generated by Jest.
*   **Bug Tracking**: Defects found will be logged in the project's issue tracker with clear steps to reproduce, expected vs. actual results, and severity.

## 8. Roles & Responsibilities
*   **Development Team (including AI Engineer)**: Responsible for writing and maintaining unit and integration tests for their respective modules. Will also contribute to E2E test scripts for features they implement.
*   **QA (if applicable) / Lead Developer**: Oversees the testing process, helps define E2E scenarios, reviews test plans and results, manages bug tracking.

This plan provides a framework for ensuring the quality and reliability of the DutyLeak platform. It will be a living document, updated as the platform evolves.
