# DutyLeak Enhanced Implementation Plan

This implementation plan outlines the steps to enhance the DutyLeak application with all the requested features, including FBA fee handling, margin analytics, scenario modeling, optimization suggestions, review queue, enhanced CSV import, and global date range selector.

## Phase 1: Database Schema Enhancements

### 1.1 FBA Fee Schema Updates
- Create migration file `20250529000004_fba_fees_schema.sql`
- Add `fba_fee_estimate_usd` column to `products` table
- Add `fba_fee_amount` column to `duty_calculations` table
- Add `yearly_units` column to `products` table for volume-based calculations

### 1.2 Scenario Modeling Schema
- Create migration file `20250529000005_duty_scenarios_schema.sql`
- Create `duty_scenarios` table with all required fields
- Set up appropriate foreign key relationships and indexes

### 1.3 Optimization Recommendations Schema
- Create migration file `20250529000006_optimization_recommendations_schema.sql`
- Create `optimization_recommendations` table with all required fields
- Set up appropriate foreign key relationships and indexes

### 1.4 Review Queue Schema
- Create migration file `20250529000007_review_queue_schema.sql`
- Create `review_queue` table with all required fields
- Set up appropriate foreign key relationships and indexes

### 1.5 Profitability Analytics Schema
- Create migration file `20250529000008_profitability_schema.sql`
- Create `product_profitability_snapshots` table with all required fields
- Set up appropriate foreign key relationships and indexes

## Phase 2: Core API Enhancements

### 2.1 Enhanced Landed Cost Calculator
- Update `LandedCostCalculator` class to include FBA fees in calculations
- Modify the interface to accept FBA fee parameters
- Update calculation logic to incorporate FBA fees in total landed cost
- Add FBA fee breakdown in the response

### 2.2 Classification API with Review Queue Integration
- Enhance `classify-hs` endpoint to support adding items to review queue
- Add confidence threshold logic to automatically add low-confidence classifications to review queue
- Update response interface to include review queue information

### 2.3 FBA Fee Calculator API
- Create `FbaFeeCalculator` class in `src/lib/amazon/fba-fee-calculator.ts`
- Implement fee calculation logic based on product dimensions, weight, and category
- Create API endpoint at `/api/amazon/calculate-fba-fees`
- Add integration with Amazon SP-API for accurate fee retrieval when ASIN is provided

## Phase 3: Advanced Features Implementation

### 3.1 Scenario Modeling
- Implement `ScenarioEngine` class in `src/lib/duty/scenario-engine.ts`
- Create API endpoints for scenario CRUD operations
- Implement comparison logic between base and alternative classifications
- Add potential savings calculation based on yearly units

### 3.2 Optimization Suggestions
- Implement `OptimizationEngine` class in `src/lib/duty/optimization-engine.ts`
- Create API endpoints for generating and retrieving optimization recommendations
- Implement job worker for background optimization analysis
- Add confidence scoring and justification generation

### 3.3 Review Queue System
- Implement review queue API endpoints
- Create UI components for review queue management
- Add approval and override workflows
- Implement automatic classification activation upon approval

### 3.4 Enhanced CSV Import
- Update CSV import logic to support AI-assisted column mapping
- Implement validation with detailed error reporting
- Add support for downloading errors as CSV
- Create UI components for inline error fixing

### 3.5 Global Date Range Selector
- Implement `DateRangeProvider` context
- Create UI components for date range selection
- Add URL parameter synchronization
- Update all analytics components to consume the global date range

## Phase 4: Job System Enhancements

### 4.1 FBA Fee Update Job
- Create job worker for updating FBA fees
- Implement batch processing logic
- Add progress tracking and error handling

### 4.2 Optimization Analysis Job
- Create job worker for optimization analysis
- Implement batch processing logic
- Add progress tracking and error handling

### 4.3 Profitability Snapshot Job
- Create job worker for generating profitability snapshots
- Implement batch processing logic
- Add progress tracking and error handling

## Phase 5: UI Components

### 5.1 FBA Fee UI Components
- Add FBA fee input fields to product form
- Update landed cost display to show FBA fees
- Create FBA fee calculator UI

### 5.2 Scenario Modeler UI
- Create scenario creation form
- Implement scenario comparison view
- Add visualization for potential savings

### 5.3 Optimization Suggestions UI
- Create optimization recommendations dashboard
- Implement suggestion detail view
- Add implementation workflow

### 5.4 Review Queue UI
- Create review queue dashboard
- Implement review item drawer
- Add approval and override workflows

### 5.5 Profitability Analytics UI
- Create profitability dashboard
- Implement charts and visualizations
- Add filtering and sorting options

## Phase 6: Testing and Validation

### 6.1 Unit Tests
- Write unit tests for all new and modified components
- Ensure test coverage for critical paths
- Validate calculation accuracy

### 6.2 Integration Tests
- Test end-to-end workflows
- Validate database schema and relationships
- Test API endpoints with various inputs

### 6.3 Performance Testing
- Test with large datasets
- Validate job system performance
- Optimize database queries

## Phase 7: Documentation and Deployment

### 7.1 API Documentation
- Update API documentation with all new endpoints
- Add request and response examples
- Document error codes and handling

### 7.2 User Documentation
- Create user guides for new features
- Add screenshots and examples
- Document best practices

### 7.3 Deployment Guide
- Update deployment guide with new environment variables
- Document database migration process
- Add troubleshooting section

## Implementation Timeline

| Phase | Estimated Duration |
|-------|-------------------|
| Phase 1: Database Schema Enhancements | 2 days |
| Phase 2: Core API Enhancements | 3 days |
| Phase 3: Advanced Features Implementation | 5 days |
| Phase 4: Job System Enhancements | 2 days |
| Phase 5: UI Components | 4 days |
| Phase 6: Testing and Validation | 3 days |
| Phase 7: Documentation and Deployment | 1 day |
| **Total** | **20 days** |

## Dependencies and Prerequisites

- Access to Amazon SP-API for FBA fee calculation
- Zonos API key for HS classification
- OpenAI API key for AI-assisted features
- Supabase project with appropriate permissions
- Vercel account for deployment

## Risk Mitigation

- Implement feature flags to enable/disable features independently
- Use database transactions for critical operations
- Add comprehensive error handling and logging
- Create rollback plans for database migrations
- Implement monitoring and alerting for job system
