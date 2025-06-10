# Core Features: FBA Fee Calculation

For sellers using Fulfillment by Amazon (FBA), understanding and estimating FBA fees is crucial for determining product profitability. DutyLeak provides tools to help you estimate these fees.

## 3.4.1 How FBA Fees are Estimated

FBA fees can be complex and depend on various factors, including:

*   **Product Size Tier**: Determined by the product's dimensions (length, width, height) and weight. Amazon has standard size tiers (e.g., Small Standard-Size, Large Standard-Size, Oversize).
*   **Product Category**: Certain categories (e.g., Apparel, Dangerous Goods) may have different fee structures.
*   **Shipping Weight**: The outbound shipping weight of the packaged item.
*   **Storage Duration**: Monthly storage fees can vary, especially for items stored for longer periods (long-term storage fees).
*   **Referral Fees**: A percentage of the item's selling price, which varies by category.
*   **Other Fees**: Optional services like labeling, packaging, or returns processing can incur additional fees.

DutyLeak's FBA Fee Calculator (`src/lib/amazon/fba-fee-calculator.ts` and the UI component `src/components/amazon/fba-fee-calculator.tsx`) typically uses the product's dimensions, weight, category, and price to estimate:
*   **Fulfillment Fees**: Per-unit fees for picking, packing, and shipping orders.
*   **Monthly Storage Fees**: Based on the daily average volume (measured in cubic feet) for inventory stored in Amazon fulfillment centers.
*   **Referral Fees**: Calculated as a percentage of the selling price.

The platform may use an internal calculation logic based on Amazon's published fee schedules or integrate with Amazon's APIs (like the Selling Partner API) for more precise, real-time estimates if an ASIN is provided.

## 3.4.2 Viewing FBA Fee Estimates

You can typically find FBA fee estimates in the following places within DutyLeak:

*   **Product Detail Page**: If a product has the necessary information (dimensions, weight, category, price, and potentially ASIN), its estimated FBA fees might be displayed.
*   **FBA Fee Calculator Component**: The dedicated UI component (`src/components/amazon/fba-fee-calculator.tsx`) allows you to input product details and get an FBA fee estimate. This component might be accessible as a standalone tool or integrated into other workflows.
*   **Scenario Modeler**: When creating "what-if" scenarios (see Section 3.5), FBA fees are often a component of the total cost calculation, allowing you to see how changes in product dimensions or category affect these fees and overall profitability.
*   **Landed Cost Breakdowns**: FBA fees will be included as a component in the detailed landed cost calculation if applicable for the product and scenario.

**Important Considerations for FBA Fee Estimates:**
*   **Estimates Only**: The fees provided by DutyLeak are estimates. Actual FBA fees charged by Amazon can vary based on real-time factors, changes in Amazon's fee structure, or specific handling requirements.
*   **Data Accuracy**: The accuracy of the FBA fee estimate heavily depends on the accuracy of the product data you provide (dimensions, weight, category, price).
*   **Amazon's Official Resources**: Always refer to Amazon's official FBA fee documentation and your Seller Central account for the most current and definitive fee information.

By utilizing DutyLeak's FBA fee estimation tools, you can gain better insight into this significant cost component for your FBA products.
