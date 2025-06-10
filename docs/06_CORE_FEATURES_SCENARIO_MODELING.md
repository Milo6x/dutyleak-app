# Core Features: Scenario Modeling & "What-If" Analysis

DutyLeak's Scenario Modeler is a powerful tool that allows you to perform "what-if" analysis by creating and comparing different scenarios for your products. This helps you understand the impact of various factors on your landed costs, FBA fees, and overall profitability, enabling more strategic decision-making.

## 3.5.1 Accessing the Scenario Modeler

The Scenario Modeler is typically a dedicated section within the DutyLeak platform.
1.  Look for "Scenario Modeler," "Scenarios," or a similar term in the main navigation sidebar.
2.  Clicking this will take you to the Scenario Modeler interface (e.g., `/scenario-modeler`), where you can create new scenarios or load existing ones.

## 3.5.2 Creating and Configuring Scenarios

Within the Scenario Modeler, you can define multiple scenarios, each representing a different set of assumptions or variables for a product.

1.  **Add a New Scenario**: Use an "Add Scenario" button to create a new scenario card or entry.
2.  **Name Your Scenario**: Give each scenario a descriptive name (e.g., "Product X - Sourced from Vietnam, Air Freight," "Product X - Sourced from China, Sea Freight").
3.  **Input Product and Cost Parameters**: For each scenario, you can typically adjust parameters such as:
    *   **Product ID**: Link to an existing product or define parameters for a hypothetical one.
    *   **Product Price (Value)**: The selling price or customs value of the product.
    *   **HS Code**: The Harmonized System code for the product. You can test different HS codes to see their impact.
    *   **Origin Country**: The country the product is shipped from.
    *   **Destination Country**: The country the product is shipped to.
    *   **Shipping Costs**: Estimated shipping fees.
    *   **Insurance Costs**: Cost of insuring the goods.
    *   **Quantity**: Number of units.
    *   **Dimensions & Weight**: For FBA fee calculations.
    *   **Product Category**: For FBA fee calculations.
    *   **Additional Fees**: Any other miscellaneous costs.

### 3.5.2.1 Adjusting Product Price, HS Code, Origin/Destination, Costs
The core of "what-if" analysis lies in changing these key variables across different scenarios to see how they affect the outcomes. For example, you can compare:
*   Sourcing from Country A vs. Country B (different duties due to trade agreements).
*   Using HS Code X vs. HS Code Y (different duty rates).
*   Different product selling prices (impact on profit margins and referral fees).
*   Varying shipping or insurance costs.

## 3.5.3 Running Calculations and Interpreting Results

Once your scenarios are configured:
1.  **Calculate Scenarios**: Click a "Calculate All" or similar button. The system will process each scenario, calculating duties, taxes, FBA fees, total landed cost, profit margin, ROI, etc.
2.  **View Results**: The results for each scenario will be displayed, often including:
    *   Total Landed Cost (per unit and/or total).
    *   Breakdown of FBA Fees (fulfillment, storage, referral).
    *   Calculated Duties and Taxes.
    *   Profit Amount and Profit Margin.
    *   Return on Investment (ROI).
    *   Break-Even Quantity.
    These results are typically shown on a "Results" tab or section within the Scenario Modeler.

## 3.5.4 Utilizing Optimization Recommendations within Scenarios

The Scenario Modeler may integrate with the Optimization Engine.
*   For a given scenario, you might be able to click an "Optimize Ideas" or similar button.
*   This can fetch suggestions for that scenario's product, such as alternative HS codes or sourcing options that could lead to savings.
*   You can then choose to apply a recommendation, which might update the scenario's parameters (e.g., change the HS code). You would then recalculate to see the impact of the applied optimization.

## 3.5.5 Comparing Multiple Scenarios Side-by-Side

A key benefit of the Scenario Modeler is the ability to compare results directly.
*   A "Comparison" tab or section will often summarize the key metrics from all calculated scenarios.
*   This might include identifying the "Best Scenario" (e.g., highest profit) and "Worst Scenario."
*   Differences in total cost, profit, and other metrics between scenarios are highlighted.
*   The comparison view may also provide general recommendations based on the outcomes.

## 3.5.6 Saving, Loading, and Managing Scenarios

*   **Saving Scenarios**: You can save your configured scenarios (including their input parameters) for future reference or further analysis. This might save them to your user account or workspace, potentially interacting with a backend API (`/api/scenarios`).
*   **Loading Scenarios**: Previously saved scenarios can be loaded back into the modeler.
*   **Duplicating Scenarios**: Easily create a new scenario based on an existing one.
*   **Deleting Scenarios**: Remove scenarios you no longer need.
*   **Exporting Results**: An option to export the calculated results (e.g., to CSV) is often available.

## 3.5.7 Sharing Scenarios with Workspace Members

If your workspace has multiple members, you may be able to share your saved scenarios:
*   When saving a scenario, you might have an option to specify which workspace members or teams can view or edit it.
*   Shared scenarios allow for collaborative analysis and decision-making.

The Scenario Modeler empowers you to proactively assess different sourcing and sales strategies, understand cost drivers, and make data-driven decisions to optimize your international trade operations.
