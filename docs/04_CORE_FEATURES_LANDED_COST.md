# Core Features: Landed Cost Calculation

Understanding the true landed cost of your products is essential for accurate pricing, profitability analysis, and making informed sourcing decisions. DutyLeak helps you calculate and understand these costs.

## 3.3.1 How Landed Cost is Calculated

Landed Cost represents the total cost of a product once it has arrived at the buyer's door (or a designated point, like an FBA warehouse). It typically includes:
*   **Product Cost**: The original cost of goods from your supplier.
*   **Shipping Costs**: Transportation fees from the origin to the destination.
*   **Customs Duties**: Tariffs imposed by the importing country based on the product's HS code and origin.
*   **Taxes**: Import taxes such as VAT (Value Added Tax), GST (Goods and Services Tax), or sales tax, depending on the destination country and product.
*   **Insurance**: Cost of insuring the goods during transit.
*   **FBA Fees (if applicable)**: Fees charged by Amazon for fulfillment and storage if you use FBA.
*   **Other Fees**: Any additional costs such as customs brokerage fees, port fees, or handling charges.

DutyLeak uses the product information (including its HS code, origin, destination, value, shipping costs, etc.) and its internal duty/tax calculation engines to estimate these components and sum them up to provide a comprehensive landed cost.

## 3.3.2 Viewing Landed Cost for a Product

You can typically view the calculated landed cost for a product in several places:

*   **Product Detail Page**: When viewing an individual product, there will often be a section displaying its calculated duties, taxes, and the overall landed cost. This might require an up-to-date HS classification and relevant cost inputs (shipping, insurance).
*   **Scenario Modeler**: When creating "what-if" scenarios (see Section 3.5), the landed cost is a key output metric that changes based on your scenario parameters.
*   **Analytics & Reports**: Landed cost data is often incorporated into profitability reports and other analytics dashboards (see Section 3.6).

The landed cost displayed is an estimate based on the data provided and the platform's calculation rules. Ensure your product data (especially HS codes, value, origin, and shipping costs) is accurate for the most reliable estimates.

## 3.3.3 Components of Landed Cost

DutyLeak aims to provide a breakdown of the landed cost so you can understand each component:

*   **Duties**: Calculated based on the product's HS code, value, and origin, according to the destination country's tariff schedule.
*   **Taxes**: Import taxes (VAT, GST, etc.) applicable in the destination country. Rates can vary by product type and value.
*   **Shipping & Handling**: Costs associated with transporting the goods.
*   **Insurance**: Cost of freight insurance.
*   **FBA Fees**: If applicable and calculated, these will be itemized (e.g., fulfillment fee, storage fee, referral fee).
*   **Other Fees**: Any additional user-inputted fees that contribute to the total cost.

By understanding these components, you can identify areas for potential cost optimization, such as sourcing from countries with preferential trade agreements or optimizing packaging to reduce shipping and FBA fees.
