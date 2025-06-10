# Tutorial 3: Using Scenario Modeler to Compare Sourcing Options

This tutorial demonstrates how to use DutyLeak's Scenario Modeler to compare the financial impact of sourcing a product from different origin countries or with different logistics arrangements.

**Goal**: To determine the most cost-effective sourcing strategy for a product by comparing landed costs and profitability across various scenarios.

**Prerequisites**:
*   You have a DutyLeak account and are logged into an active workspace.
*   You have a specific product in mind for analysis, along with its key attributes (selling price, dimensions, category, current HS code).
*   You have identified potential alternative sourcing countries or shipping methods you want to compare.

**Steps:**

**Step 1: Access the Scenario Modeler**

1.  In the DutyLeak sidebar, click on "Scenario Modeler" to open the tool.

**Step 2: Create a Baseline Scenario**

1.  **Add New Scenario**: Click "Add Scenario."
2.  **Name**: Give it a clear name, e.g., "Product ABC - Baseline (Origin China, Air Freight)".
3.  **Input Parameters**:
    *   **Product ID**: If the product exists in DutyLeak, select it. Otherwise, manually input its details.
    *   **Product Price (Value)**: The intended selling price.
    *   **HS Code**: The current or most likely HS code for the product.
    *   **Origin Country**: Your current or default sourcing country (e.g., China - `CN`).
    *   **Destination Country**: The target market (e.g., United States - `US`).
    *   **Shipping Costs**: Your current estimated shipping cost per unit for this route.
    *   **Insurance Costs**: Current estimated insurance cost.
    *   **Product Cost**: Your current unit cost from the supplier in this origin country.
    *   **Quantity, Dimensions, Category**: Fill these as accurately as possible for FBA fee and total cost calculations.
4.  **Save (if applicable)**: Some modelers might require an explicit save per scenario configuration.

**Step 3: Create Scenario for Alternative Sourcing Option 1**

1.  **Duplicate Baseline**: Find your baseline scenario and use a "Duplicate Scenario" action.
2.  **Name**: Rename it appropriately, e.g., "Product ABC - Alt Origin (Vietnam, Sea Freight)".
3.  **Modify Parameters**:
    *   **Origin Country**: Change to your alternative sourcing country (e.g., Vietnam - `VN`).
    *   **Product Cost**: Adjust the unit cost if it differs from the new origin.
    *   **Shipping Costs**: Update to reflect the estimated shipping cost from Vietnam (e.g., potentially lower for sea freight, but longer lead time - though lead time isn't directly modeled here, cost is).
    *   **Insurance Costs**: Adjust if different for the new route/method.
    *   Keep other parameters like Destination Country, HS Code (unless the change in origin also implies a different common classification practice you want to test), Selling Price, Dimensions, etc., the same for a direct comparison of sourcing impact.

**Step 4: (Optional) Create Scenario for Alternative Sourcing Option 2**

1.  **Duplicate Baseline or Alt Scenario 1**: Choose the most similar scenario to duplicate.
2.  **Name**: E.g., "Product ABC - Alt Origin (Mexico, Truck Freight)".
3.  **Modify Parameters**:
    *   **Origin Country**: Change to the second alternative (e.g., Mexico - `MX`).
    *   **Product Cost**: Adjust accordingly.
    *   **Shipping Costs**: Update for this route/method.
    *   **Insurance Costs**: Adjust if necessary.

**Step 5: Run Calculations for All Scenarios**

1.  Once all your desired scenarios are configured, click the "Calculate All Scenarios" button in the Scenario Modeler.
2.  The system will process each scenario, calculating duties, taxes, FBA fees (if applicable), total landed cost, profit margins, etc.

**Step 6: Analyze and Compare Results**

1.  **Results Tab**:
    *   Individually review the detailed cost breakdown and profitability metrics for each scenario.
    *   Pay attention to how duties and taxes change with different origin countries due to trade agreements or tariffs.
    *   Note how shipping costs impact the total landed cost.
2.  **Comparison Tab**:
    *   This view is crucial for this tutorial. It will directly compare your sourcing scenarios.
    *   Look for:
        *   The scenario with the **lowest Total Landed Cost**.
        *   The scenario with the **highest Profit Margin** or **Profit Amount**.
        *   The **difference** in costs and profits between the scenarios.
    *   The "Best Scenario" and "Worst Scenario" (often based on profitability) will likely be highlighted.
    *   Review any general recommendations provided by the system based on the comparison.

**Step 7: Utilize Optimization Recommendations (Optional)**

*   For any of your scenarios, you can still use the "Optimize Ideas" feature to see if there are further HS code or other minor adjustments that could yield additional savings, even within a chosen sourcing route.

**Step 8: Make an Informed Sourcing Decision**

*   Based on the quantitative comparison, you can now make a more informed decision about which sourcing country or logistics setup offers the best financial outcome for "Product ABC."
*   Consider qualitative factors as well (supplier reliability, lead times, quality control), but the Scenario Modeler provides the hard numbers for the cost aspect.

**Step 9: Save Your Analysis**

*   Save your scenarios if you wish to refer back to this analysis or use it as a template for other products.

This tutorial illustrates how the Scenario Modeler can be a vital tool for strategic sourcing by clearly laying out the financial implications of different options.
