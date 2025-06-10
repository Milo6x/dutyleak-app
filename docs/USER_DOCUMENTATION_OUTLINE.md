# DutyLeak Platform - User Documentation Outline

## 1. Introduction
    1.1. What is DutyLeak?
        1.1.1. Purpose and Value Proposition
        1.1.2. Core Capabilities Overview
    1.2. Key Benefits for Users
    1.3. Target Audience (Who should use this documentation?)
    1.4. How to Use This Documentation
    1.5. Getting Help & Support Channels

## 2. Getting Started
    2.1. Account Management
        2.2.1. Creating a New Account (Signup Process)
        2.2.2. Logging In and Out
        2.2.3. Password Management (Forgot Password)
        2.2.4. Profile Settings
    2.2. Workspace Management
        2.2.1. Understanding Workspaces
        2.2.2. Creating Your First Workspace
        2.2.3. Inviting Team Members to a Workspace
        2.2.4. User Roles and Permissions (Owner, Admin, Member, Viewer)
        2.2.5. Switching Between Workspaces (if applicable)
    2.3. Navigating the Dashboard
        2.3.1. Main Dashboard Overview
        2.3.2. Sidebar Navigation
        2.3.3. Common UI Elements (Filters, Date Pickers, Tabs)

## 3. Core Features & Workflows
    3.1. Product Management
        3.1.1. Adding Products Manually
        3.1.2. Bulk Importing Products via CSV
            3.1.2.1. CSV File Format and Requirements
            3.1.2.2. Mapping CSV Columns
            3.1.2.3. Monitoring Import Jobs
        3.1.3. Viewing and Searching Products
        3.1.4. Editing Product Details
        3.1.5. Deleting Products
    3.2. HS Code Classification
        3.2.1. Requesting AI Classification (Single Product)
        3.2.2. Bulk Classification via Product List or Import Job
        3.2.3. Understanding Classification Results
            3.2.3.1. HS Codes (HS6, HS8+)
            3.2.3.2. Confidence Scores
            3.2.3.3. AI vs. Manual Classification
        3.2.4. Reviewing and Overriding AI Classifications
        3.2.5. Viewing Classification History for a Product
    3.3. Landed Cost Calculation
        3.3.1. How Landed Cost is Calculated
        3.3.2. Viewing Landed Cost for a Product
        3.3.3. Components of Landed Cost (Duties, Taxes, FBA Fees, Other Fees)
    3.4. FBA Fee Calculation
        3.4.1. How FBA Fees are Estimated
        3.4.2. Viewing FBA Fee Estimates
    3.5. Scenario Modeling & "What-If" Analysis
        3.5.1. Accessing the Scenario Modeler
        3.5.2. Creating and Configuring Scenarios
            3.5.2.1. Adjusting Product Price, HS Code, Origin/Destination, Costs
        3.5.3. Running Calculations and Interpreting Results
        3.5.4. Utilizing Optimization Recommendations within Scenarios
        3.5.5. Comparing Multiple Scenarios Side-by-Side
        3.5.6. Saving, Loading, and Managing Scenarios
        3.5.7. Sharing Scenarios with Workspace Members
    3.6. Analytics & Reporting
        3.6.1. Main Dashboard Metrics Overview
        3.6.2. Comprehensive Analytics Dashboard
            3.6.2.1. Understanding Key Insights and Recommendations
            3.6.2.2. Savings Analysis Tab (Trends, Opportunities)
            3.6.2.3. Profitability Analysis Tab (Revenue, Costs, Margins)
            3.6.2.4. Performance Metrics Tab (Accuracy, Processing Time)
        3.6.3. Filtering Analytics Data (Date Periods, etc.)
        3.6.4. Exporting Analytics Data (CSV, JSON, PDF)
    3.7. Review Queue (for Classifications & Other Items)
        3.7.1. Purpose of the Review Queue
        3.7.2. Accessing and Navigating the Review Queue
        3.7.3. Assigning Review Items (if applicable)
        3.7.4. Processing Items: Approving, Rejecting, or Overriding
        3.7.5. Notifications for Review Assignments

## 4. Admin Guide (for Workspace Owners/Admins)
    4.1. User Management
        4.1.1. Viewing Workspace Members
        4.1.2. Managing User Roles
        4.1.3. Removing Users from Workspace
    4.2. Workspace Settings (if any configurable settings exist)
    4.3. API Key Management (if applicable for user-managed API keys)
        4.3.1. Creating and Managing API Keys
        4.3.2. Understanding API Key Permissions
    4.4. Background Job Monitoring
        4.4.1. Accessing the Job Monitoring Page (`/admin/jobs`)
        4.4.2. Understanding Job Details (ID, Type, Status, Progress)
        4.4.3. Interpreting Job Statuses (Pending, Running, Completed, Failed, Cancelled, Dead Letter)
        4.4.4. Retrying Failed or Dead Letter Jobs
        4.4.5. Viewing Job Errors and Metadata
    4.5. Data Management (Admin Level)
        4.5.1. Overview of Import/Export Job History (if separate admin view exists)
        4.5.2. Requesting Data Deletion for the Workspace

## 5. API Reference (If a public API is offered to users)
    5.1. Introduction to the API
    5.2. Authentication
    5.3. Rate Limiting
    5.4. Common Endpoints
        5.4.1. Product Management API
        5.4.2. Classification API
        5.4.3. Job Creation/Status API
    5.5. Error Codes and Responses

## 6. Troubleshooting & FAQ
    6.1. Common Issues
        6.1.1. Login or Account Access Problems
        6.1.2. CSV Import Failures (Common Formatting Errors)
        6.1.3. Classification Results Not Appearing or Inaccurate
        6.1.4. "Failed to fetch data" or API Errors (General advice: check connection, clear cache, check server logs if admin)
        6.1.5. Background Jobs Stuck or Failing
    6.2. Frequently Asked Questions
        6.2.1. How is my data secured?
        6.2.2. How often is classification AI updated?
        6.2.3. What are the limits on bulk operations?

## 7. Glossary
    7.1. Key Terminology (HS Code, Landed Cost, De Minimis, CIF, FOB, Duty, Tax, FBA, etc.)
    7.2. DutyLeak Specific Terms

## 8. Appendices (Optional)
    8.1. List of Supported Countries for Duty/Tax Calculation
    8.2. Sample CSV Import Template
    8.3. Detailed Data Field Definitions for Product Object
