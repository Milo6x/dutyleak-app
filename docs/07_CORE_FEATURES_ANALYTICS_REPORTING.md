# Core Features: Analytics & Reporting

DutyLeak provides powerful analytics and reporting tools to help you understand your trade operations, identify savings, track profitability, and monitor system performance.

## 3.6.1 Main Dashboard Metrics Overview

Upon logging in, the main dashboard (typically `/dashboard`) presents a high-level overview of key performance indicators (KPIs) and recent activity. This may include:

*   **Total Products**: The number of products managed in your workspace.
*   **Total Savings**: Estimated savings achieved through duty optimization over a recent period (e.g., last 30 days).
*   **Pending Reviews**: Number of items awaiting review in the classification review queue.
*   **Active Jobs**: Count of background jobs currently running or pending.
*   **Total Product Value**: The sum of the cost or price of all your products.
*   **Trend Indicators**: Visual cues (e.g., percentage changes) for key metrics compared to previous periods.
*   **Quick Access Charts**: Small charts showing trends like monthly savings or product category distributions.

This overview helps you quickly gauge the health and performance of your operations.

## 3.6.2 Comprehensive Analytics Dashboard

For a deeper dive, DutyLeak offers a Comprehensive Analytics Dashboard (typically found at `/analytics`). This dashboard consolidates various metrics and insights across different aspects of your operations. It's often organized into tabs or sections:

### 3.6.2.1 Understanding Key Insights and Recommendations
The dashboard may present AI-generated or rule-based key insights and strategic recommendations based on your data, such as:
*   Highlighting significant savings achievements.
*   Pointing out areas with high profit margins.
*   Suggesting product categories or sourcing strategies to focus on for optimization.

### 3.6.2.2 Savings Analysis Tab
This section focuses on duty and cost savings:
*   **Savings Trends**: Charts showing monthly or periodic savings achieved over time.
*   **Top Savings Opportunities**: A list of products with the highest potential for further savings through reclassification or other optimization strategies. Details might include current vs. optimized duty rates and potential saving amounts.
*   **Optimized Products Overview**: Metrics on how many products have been optimized versus the total, and the overall savings percentage.

### 3.6.2.3 Profitability Analysis Tab
This section helps you understand the financial performance of your products:
*   **Revenue vs. Profit Trends**: Charts illustrating revenue and profit over selected periods.
*   **Cost Breakdown**: A visualization (e.g., doughnut chart) showing the distribution of costs (e.g., product cost, FBA fees, shipping, duties).
*   **Key Profitability Metrics**: Total revenue, gross profit, net profit (if calculable), overall profit margin, and ROI.
*   **Average Order Value**: If sales data is available.

### 3.6.2.4 Performance Metrics Tab
This section provides insights into the operational efficiency of the DutyLeak platform and your processes:
*   **Classification Accuracy**: An estimate of the accuracy of AI classifications, possibly based on confidence scores or review outcomes.
*   **Average Processing Time**: Time taken for key operations like classification or job processing.
*   **Throughput**: Number of items processed (e.g., classifications, jobs) per unit of time.
*   **Error Rate**: Percentage of operations or jobs that resulted in errors.
*   **System Uptime & API Response Time**: General indicators of platform health.
*   **User Satisfaction Score**: If feedback mechanisms are integrated.

## 3.6.3 Filtering Analytics Data

Most analytics dashboards and reports will allow you to filter the data to focus on specific areas of interest:
*   **Date Periods**: Common filters include "Last 7 days," "Last 30 days," "Last 90 days," "Last Year," or custom date ranges.
*   **Product Category**: Filter analytics by specific product categories.
*   **Other Filters**: Depending on the dashboard, you might filter by origin/destination country, specific products, etc.

Applying filters will dynamically update the charts and metrics displayed.

## 3.6.4 Exporting Analytics Data

DutyLeak allows you to export your analytics data for offline analysis, reporting, or integration with other systems.
*   **Export Options**: Look for an "Export" button or dropdown menu on analytics pages.
*   **Supported Formats**: Common export formats include:
    *   **CSV (Comma Separated Values)**: For use in spreadsheets.
    *   **JSON (JavaScript Object Notation)**: For programmatic use or integration with other tools.
    *   **PDF**: For printable reports.
*   **Process**: Selecting an export format will typically trigger a download of the file or, for larger datasets, might initiate a background job to prepare the export. You can monitor export jobs on the Job Monitoring Page.

By regularly reviewing and utilizing the analytics and reporting features, you can gain valuable insights to optimize costs, improve profitability, and enhance the efficiency of your international trade operations.
