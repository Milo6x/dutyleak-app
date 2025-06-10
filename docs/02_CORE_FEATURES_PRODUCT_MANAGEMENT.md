# Core Features: Product Management

Effective product data management is fundamental to leveraging DutyLeak's capabilities. This section guides you through adding, importing, viewing, and managing your products within the platform.

## 3.1.1 Adding Products Manually

For individual products or small numbers, you can add them directly through the user interface.

1.  **Navigate to the Products Section**: Find "Products" in the main sidebar navigation. This will typically take you to a page listing your existing products (e.g., `/products`).
2.  **Initiate Product Creation**: Look for a button like "Add Product", "New Product", or a "+" icon. Clicking this will usually open a form or a modal.
3.  **Enter Product Details**: Fill in the required and optional fields. Common fields include:
    *   **Product Title/Name**: A descriptive name for your product.
    *   **SKU (Stock Keeping Unit)**: Your internal product identifier.
    *   **Description**: Detailed information about the product.
    *   **ASIN (Amazon Standard Identification Number)**: If applicable, for FBA fee calculations.
    *   **Price (USD)**: The selling price of the product.
    *   **Cost (USD)**: Your cost to acquire or manufacture the product.
    *   **Category**: The product's category (e.g., Electronics, Clothing). This might be a dropdown selection.
    *   **Dimensions (Length, Width, Height, Weight)**: Important for FBA fees and shipping calculations. Ensure units (e.g., inches, lbs) are correct.
    *   **Origin Country**: The country where the product is manufactured or shipped from.
    *   **Image URL**: A link to an image of the product.
4.  **Save the Product**: Once all necessary information is entered, click "Save" or "Create Product". The new product will appear in your product list.

## 3.1.2 Bulk Importing Products via CSV

For larger product catalogs, DutyLeak supports importing products in bulk using a CSV (Comma Separated Values) file.

### 3.1.2.1 CSV File Format and Requirements

*   **File Type**: Must be a `.csv` file.
*   **Headers**: The first row of your CSV file should contain column headers that match the expected product fields (e.g., `title`, `sku`, `description`, `price_usd`, `cost_usd`, `category`, `origin_country`, `length_in`, `width_in`, `height_in`, `weight_lb`, `asin`).
    *   Refer to **Appendix 8.2: Sample CSV Import Template** and **Appendix 8.3: Detailed Data Field Definitions** for the exact header names and data formats.
*   **Encoding**: UTF-8 encoding is recommended to ensure special characters are handled correctly.
*   **Data Integrity**: Ensure data is clean and correctly formatted in each column (e.g., prices and costs are numeric, dimensions are in the expected units).

### 3.1.2.2 Mapping CSV Columns (If Applicable)

Some import interfaces may offer a column mapping step where you can match the columns in your CSV file to the corresponding fields in DutyLeak if your headers don't match exactly. Follow the on-screen instructions if this step is provided.

### 3.1.2.3 Monitoring Import Jobs

1.  **Navigate to the Import Section**: There might be a dedicated "Import Products" or "Bulk Operations" page (e.g., `/products/import`).
2.  **Upload CSV File**: Use the file uploader to select your prepared CSV file.
3.  **Start Import**: Initiate the import process. This will typically create a background job.
4.  **Monitor Progress**:
    *   The system will create a job to process your CSV file. You can usually monitor the status of this import job on the **Job Monitoring Page** (see Section 3.8 or 4.4).
    *   The job status will indicate if it's `pending`, `running`, `completed`, or `failed`.
    *   If the job completes successfully, your products will be added to the platform.
    *   If the job fails, or has partial failures, the job details or an associated log might provide information on which rows caused issues. Common errors include incorrect data formatting, missing required fields, or exceeding data limits.

## 3.1.3 Viewing and Searching Products

*   **Product List**: The main "Products" page will display a list or grid of all products in your current workspace.
*   **Search**: Look for a search bar to find products by name, SKU, ASIN, or other keywords.
*   **Filtering**: Filtering options may be available to narrow down the product list by category, classification status, or other criteria.
*   **Pagination**: If you have many products, the list will be paginated. Use the pagination controls to navigate through pages.

## 3.1.4 Editing Product Details

If you need to update information for an existing product:
1.  Find the product in the product list.
2.  Click on the product or an "Edit" icon/button associated with it. This will usually take you to a product detail page or open an edit form.
3.  Modify the fields as needed.
4.  Save your changes.

## 3.1.5 Deleting Products

To remove a product:
1.  Find the product in the product list.
2.  There will typically be a "Delete" option, either directly on the list item (e.g., via a trash can icon) or on the product detail/edit page.
3.  You may be asked to confirm the deletion, as this action is usually permanent.

Properly managing your product catalog is the first step to accurately calculating duties, taxes, and landed costs with DutyLeak.
