# Tutorial 2: Bulk Classifying a Product Catalog & Reviewing

This tutorial guides you through importing a new product catalog via CSV, performing bulk HS code classification, and then using the Review Queue to manage and verify classifications, especially those with lower AI confidence.

**Goal**: To efficiently classify a large number of products and ensure accuracy through a targeted review process.

**Prerequisites**:
*   You have a DutyLeak account and are logged into an active workspace.
*   You have a product catalog in CSV format, ready for import. (Refer to Section 3.1.2.1 and Appendix 8.2 for CSV format details).

**Steps:**

**Step 1: Prepare Your Product CSV for Import**

1.  **Gather Product Data**: Ensure your CSV file contains essential information for classification, such as:
    *   `sku` (unique product identifier)
    *   `title` (product name)
    *   `description` (detailed product description)
    *   `category` (general product category)
    *   Other relevant fields like `price_usd`, `cost_usd`, `origin_country`.
2.  **Format CSV**: Make sure the CSV adheres to the required format, with correct headers and UTF-8 encoding.

**Step 2: Import Products via CSV**

1.  **Navigate to Import**: Go to the "Products" section and find the "Import Products" or "Bulk Operations" area (e.g., `/products/import`).
2.  **Upload CSV**: Select your prepared CSV file.
3.  **Configure Import Options (if any)**:
    *   You might see an option to "Automatically classify products during import." If available and desired, enable it.
    *   Map CSV columns to DutyLeak product fields if prompted.
4.  **Start Import Job**: Initiate the import. This will create a background job.
5.  **Monitor Import Job**: Go to the **Job Monitoring Page** (see Section 3.8 or 4.4) to track the progress of your import job. Wait for it to complete.

**Step 3: Initiate Bulk Classification (If Not Done During Import)**

If your products were not automatically classified during the import process, or if you want to re-classify a set of existing products:

1.  **Identify Products for Classification**:
    *   You can select products from the main product list.
    *   Alternatively, you might create a dedicated bulk classification job by providing a list of SKUs or Product IDs.
2.  **Start Bulk Classification Job**:
    *   If selecting from the list, use a "Bulk Actions" -> "Classify Selected" option.
    *   If creating a dedicated job, go to the "Jobs" or "Bulk Classification" section, create a new job of type "Bulk Classification," and provide the necessary product identifiers.
3.  **Monitor Classification Job**: Track this job on the **Job Monitoring Page**. Note the Job ID.

**Step 4: Review Classification Results & Low-Confidence Items**

Once the bulk classification job is complete:

1.  **Check Job Status**: Ensure the job status is "Completed" on the Job Monitoring page. Note any errors or partially failed items.
2.  **Navigate to Review Queue**: Go to the "Review Queue" section in the sidebar.
3.  **Filter for Low Confidence (Recommended)**:
    *   The Review Queue might automatically populate with items flagged for review (e.g., AI classifications with confidence scores below a certain threshold).
    *   Use filters if available to specifically view items from your recent bulk classification job (e.g., by date, or if job ID is associated) or items with low confidence scores (e.g., confidence < 70%).
4.  **Process Items in Review Queue**:
    *   For each item:
        *   Click to view product details and the AI-suggested HS code and confidence score.
        *   **Verify**: Use your expertise or external resources to check the accuracy of the suggested code.
        *   **Approve**: If the code is correct, approve it.
        *   **Override/Edit**: If incorrect, edit the classification and input the correct HS code. You may be able to add a reason or note.
        *   The item will then be removed from the pending review list or its status updated.
    *   Prioritize reviewing items with the lowest confidence scores or those for high-value/high-risk products.

**Step 5: Verify Classifications on Product Pages**

1.  After processing items in the Review Queue, you can also spot-check individual product pages to see their updated, active HS codes.
2.  Check the "Classification History" for a product to see the audit trail of AI suggestions and manual changes.

**Benefits of this Workflow:**

*   **Efficiency**: Quickly get initial classifications for a large catalog.
*   **Targeted Review**: Focus human review efforts on items most likely to be incorrect or ambiguous, saving time.
*   **Improved Accuracy**: Combine AI speed with human expertise for more reliable classification data.
*   **Compliance**: Demonstrate a structured process for ensuring HS code accuracy.

By following this tutorial, you can effectively manage the HS code classification lifecycle for your entire product catalog within DutyLeak.
