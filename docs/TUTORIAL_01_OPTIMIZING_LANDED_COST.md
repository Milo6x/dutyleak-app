# Tutorial 1: Optimizing a Product's Landed Cost from Scratch

This tutorial will guide you through the process of adding a new product, classifying it, calculating its initial landed cost, and then using the Scenario Modeler to explore ways to optimize this cost.

**Goal**: To find the most cost-effective way to bring a product to market by minimizing its landed cost.

**Prerequisites**:
*   You have a DutyLeak account and are logged into an active workspace.
*   You have basic information about a product you want to analyze (e.g., name, description, estimated cost, potential origin/destination countries).

**Steps:**

**Step 1: Add Your Product**

1.  **Navigate to Products**: In the DutyLeak sidebar, click on "Products."
2.  **Add New Product**: Click the "Add Product" (or similar) button.
3.  **Enter Details**: Fill in the product information. For this tutorial, let's assume:
    *   **Name**: "Deluxe Bluetooth Speaker"
    *   **Description**: "Portable high-fidelity Bluetooth speaker with 12-hour battery life."
    *   **SKU**: `SPKR-DLX-001`
    *   **Cost (USD)**: `25.00` (your cost from the supplier)
    *   **Selling Price (USD)**: `79.99`
    *   **Origin Country**: China (`CN`)
    *   **Intended Destination Country**: United States (`US`)
    *   **Category**: Electronics
    *   **Dimensions & Weight**: (e.g., Length: 7in, Width: 3in, Height: 3in, Weight: 1.5 lbs) - for FBA fee estimation.
4.  **Save**: Click "Save Product."

**Step 2: Classify Your Product (Get HS Code)**

1.  **Find Your Product**: In the product list, locate the "Deluxe Bluetooth Speaker." Click on it to go to its detail page.
2.  **Request AI Classification**: Find the "Classify Product" or "Get HS Code" button and click it.
3.  **Review AI Suggestion**: The AI will suggest an HS code (e.g., `8518.22.00` for certain types of loudspeakers) and a confidence score.
    *   Note down the suggested HS code and confidence.
    *   If confidence is low, or if you are unsure, you might consult external HS code databases or a customs specialist. For this tutorial, we'll proceed with the AI's first suggestion.
    *   If an override option is available and you know a more accurate code, you could use it here.

**Step 3: Calculate Initial Landed Cost & FBA Fees**

1.  **Ensure Data is Present**: On the product detail page, verify that all necessary data for landed cost and FBA fee calculation is present (price, HS code, origin/destination, dimensions, weight, category, estimated shipping/insurance if known).
2.  **View Calculated Costs**: The product page might automatically display an estimated landed cost and FBA fee breakdown once it has the necessary inputs.
    *   Note the initial total landed cost, duty amount, tax amount, and FBA fees. This is your baseline.

**Step 4: Use Scenario Modeler for "What-If" Analysis**

1.  **Navigate to Scenario Modeler**: Click "Scenario Modeler" in the sidebar.
2.  **Create First Scenario (Baseline)**:
    *   Click "Add Scenario."
    *   Name it: "Baseline - CN to US, HS 8518.22".
    *   Input all the parameters from your "Deluxe Bluetooth Speaker" as it currently is (Product ID, price, the AI-suggested HS code, origin CN, destination US, shipping/insurance costs if you have estimates, dimensions, category, quantity e.g., 100 units).
3.  **Create Second Scenario (Alternative HS Code)**:
    *   Duplicate the "Baseline" scenario.
    *   Rename it: "Alt HS Code - CN to US, HS 8518.21".
    *   Change the **HS Code** to a plausible alternative (e.g., `8518.21.00` if it also fits loudspeakers but might have a different duty rate).
4.  **Create Third Scenario (Alternative Origin Country)**:
    *   Duplicate the "Baseline" scenario again.
    *   Rename it: "Origin VN - US, HS 8518.22".
    *   Change the **Origin Country** to another potential sourcing country, e.g., Vietnam (`VN`). Keep the HS code the same as the baseline.
    *   You might need to adjust the **Product Cost** if sourcing from Vietnam has a different unit cost.
5.  **(Optional) Create Fourth Scenario (Different Shipping/Logistics)**:
    *   Duplicate the "Baseline" scenario.
    *   Rename it: "Baseline - CN to US, Higher Shipping".
    *   Increase the **Shipping Cost** parameter significantly.

**Step 5: Run Calculations and Compare Scenarios**

1.  **Calculate All**: In the Scenario Modeler, click the "Calculate All Scenarios" button.
2.  **Review Results Tab**:
    *   Examine the calculated landed cost, duties, taxes, FBA fees, profit margin, and ROI for each of your scenarios.
    *   Identify which scenario yields the lowest landed cost or highest profit margin.
3.  **Review Comparison Tab**:
    *   This tab will directly compare your scenarios, highlighting the best/worst performers and potential savings or profit differences.

**Step 6: Utilize Optimization Recommendations (If Available)**

1.  In the Scenario Modeler, for your "Baseline" scenario, click the "Optimize Ideas" button (if available).
2.  Review any suggestions provided (e.g., alternative HS codes, sourcing options).
3.  If a compelling recommendation appears, you can choose to "Apply" it. This might update the parameters of your current scenario or prompt you to create a new one based on the recommendation. Recalculate to see its impact.

**Step 7: Make a Decision**

Based on the comparison of scenarios:
*   Determine which combination of HS code, origin country, and other factors results in the most favorable landed cost and profitability.
*   This data-driven insight can inform your sourcing strategy, pricing decisions, and compliance efforts.

**Step 8: Save Your Analysis (Optional)**

*   If you want to revisit this analysis later, use the "Save Scenarios" feature in the Scenario Modeler.

This tutorial demonstrates a common workflow for leveraging DutyLeak's features to proactively manage and optimize your product costs. Remember that all calculations are estimates based on the data you provide and the platform's current rules and rates.
