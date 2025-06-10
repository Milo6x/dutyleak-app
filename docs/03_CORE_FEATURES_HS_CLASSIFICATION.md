# Core Features: HS Code Classification

Accurate HS (Harmonized System) code classification is crucial for determining correct duties, taxes, and ensuring trade compliance. DutyLeak provides AI-powered tools to help you classify your products efficiently.

## 3.2.1 Requesting AI Classification (Single Product)

You can request an AI-driven HS code classification for individual products, typically from the product details page.

1.  **Navigate to the Product**: Go to the "Products" section and select the product you wish to classify.
2.  **Find Classification Action**: On the product detail page, look for a button or section related to "HS Code Classification," "Classify Product," or "Get HS Code."
3.  **Initiate AI Classification**: Click the action to start the AI classification process. The system will use the product's information (name, description, category, etc.) to suggest an HS code.
4.  **View Results**: Once the AI processing is complete, the suggested HS code, along with a confidence score and potentially other details, will be displayed.

## 3.2.2 Bulk Classification via Product List or Import Job

For classifying multiple products at once, DutyLeak offers bulk classification capabilities.

*   **From Product List**:
    1.  Go to the "Products" list page.
    2.  Select multiple products using checkboxes.
    3.  Look for a "Bulk Actions" or "Classify Selected" button.
    4.  Confirm to start the bulk classification job. The system will create a background job to process the selected products.
*   **During CSV Import**:
    *   Some import flows may offer an option to automatically classify products as they are being imported from a CSV file. If this option is selected, classifications will be attempted as part of the import job.
*   **Via Dedicated Bulk Classification Job**:
    1.  Navigate to a "Bulk Classification" or "Jobs" section.
    2.  Create a new job, selecting "Bulk Classification" as the type.
    3.  You may need to provide a list of Product IDs or select products based on certain criteria.
    4.  Start the job.
*   **Monitoring Bulk Jobs**: Bulk classification tasks are processed as background jobs. You can monitor their progress on the **Job Monitoring Page** (see Section 3.8 or 4.4).

## 3.2.3 Understanding Classification Results

When a classification is performed, DutyLeak provides several pieces of information:

### 3.2.3.1 HS Codes (HS6, HS8+)
*   **HS Code**: The Harmonized System code suggested for the product. This is a standardized numerical method of classifying traded products.
*   **HS6**: The first six digits of the HS code, which are internationally standardized.
*   **HS8+**: Additional digits (e.g., HS8, HS10, HS12) that provide further country-specific detail. The length of the full HS code can vary by country.

### 3.2.3.2 Confidence Scores
*   The AI provides a confidence score (often a percentage) indicating how certain it is about the suggested HS code.
*   A higher score suggests greater confidence. Lower scores may indicate ambiguity or that the product information was insufficient for a high-confidence match. Products with lower confidence scores should typically be prioritized for human review.

### 3.2.3.3 AI vs. Manual Classification
*   **AI Classification**: HS codes suggested by DutyLeak's AI engine.
*   **Manual Classification**: You or your team members can manually input or override HS codes.
*   The system may distinguish between these types, and manual entries often take precedence or are flagged differently.

## 3.2.4 Reviewing and Overriding AI Classifications

It's good practice to review AI-suggested classifications, especially for products with lower confidence scores or those critical to your business.
1.  **Access Classification Details**: On a product page or in a classification list, view the AI-suggested HS code.
2.  **Review**: Check if the suggested code and its description accurately match your product. You might use external HS code lookup tools for verification if needed.
3.  **Override/Edit**: If you disagree with the AI suggestion or want to input a code manually:
    *   Look for an "Edit," "Override," or "Manually Classify" option.
    *   Enter the correct HS code.
    *   Save your changes. The manually entered/confirmed code will typically become the active classification for that product.
4.  **Review Queue**: Some products, especially those with low AI confidence or flagged by certain criteria, may automatically be sent to a **Review Queue** for dedicated human review (see Section 3.7).

## 3.2.5 Viewing Classification History for a Product

For traceability and auditing, DutyLeak may maintain a history of classifications for each product.
*   On the product detail page, look for a "Classification History" tab or section.
*   This history might show:
    *   Past AI suggestions.
    *   Manual overrides.
    *   Dates of classification.
    *   User who made changes (if applicable).
    *   Changes in confidence scores.

Accurate HS code classification is a cornerstone of international trade compliance and correct duty calculation. Utilize DutyLeak's classification tools and review processes to ensure the accuracy of your product data.
