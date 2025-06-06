import { test, expect } from '@playwright/test';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123'
};

const testProduct = {
  name: 'Test Electronics Product',
  description: 'A sample electronics product for testing',
  hsCode: '8517120000',
  countryOfOrigin: 'CN',
  unitPrice: '25.99',
  weight: '0.5',
  length: '10',
  width: '8',
  height: '5'
};

test.describe('Landed Cost Calculation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should complete full landed cost calculation workflow', async ({ page }) => {
    // Step 1: Navigate to sign up if not authenticated
    await page.click('text=Get Started');
    
    // Check if we're on auth page
    await expect(page).toHaveURL(/.*auth.*/);
    
    // Try to sign up (or sign in if user exists)
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    // Click sign up button
    await page.click('button:has-text("Sign Up")');
    
    // Wait for potential redirect to dashboard
    await page.waitForTimeout(2000);
    
    // If still on auth page, try signing in instead
    if (page.url().includes('auth')) {
      await page.click('text=Sign In');
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      await page.click('button:has-text("Sign In")');
    }
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Step 2: Navigate to Products section
    await page.click('text=Products');
    await expect(page).toHaveURL(/.*products.*/);
    
    // Step 3: Add a new product
    await page.click('button:has-text("Add Product")');
    
    // Fill product form
    await page.fill('input[name="name"]', testProduct.name);
    await page.fill('textarea[name="description"]', testProduct.description);
    await page.fill('input[name="hs_code"]', testProduct.hsCode);
    await page.selectOption('select[name="country_of_origin"]', testProduct.countryOfOrigin);
    await page.fill('input[name="unit_price"]', testProduct.unitPrice);
    await page.fill('input[name="weight"]', testProduct.weight);
    await page.fill('input[name="length"]', testProduct.length);
    await page.fill('input[name="width"]', testProduct.width);
    await page.fill('input[name="height"]', testProduct.height);
    
    // Save product
    await page.click('button:has-text("Save Product")');
    
    // Wait for product to be saved
    await page.waitForSelector(`text=${testProduct.name}`, { timeout: 5000 });
    
    // Step 4: Calculate landed cost for the product
    await page.click(`[data-testid="product-${testProduct.name}"] button:has-text("Calculate")`);
    
    // Fill calculation form
    await page.fill('input[name="shipping_cost"]', '15.00');
    await page.fill('input[name="insurance_cost"]', '2.50');
    await page.selectOption('select[name="destination_country"]', 'US');
    
    // Submit calculation
    await page.click('button:has-text("Calculate Landed Cost")');
    
    // Wait for results
    await page.waitForSelector('[data-testid="calculation-results"]', { timeout: 10000 });
    
    // Step 5: Verify calculation results
    const productValue = await page.textContent('[data-testid="product-value"]');
    const dutyAmount = await page.textContent('[data-testid="duty-amount"]');
    const totalLandedCost = await page.textContent('[data-testid="total-landed-cost"]');
    
    expect(productValue).toContain('$25.99');
    expect(dutyAmount).toMatch(/\$\d+\.\d{2}/);
    expect(totalLandedCost).toMatch(/\$\d+\.\d{2}/);
    
    // Step 6: Save calculation
    await page.click('button:has-text("Save Calculation")');
    
    // Verify success message
    await expect(page.locator('text=Calculation saved successfully')).toBeVisible();
    
    // Step 7: Navigate to Analytics to view saved calculation
    await page.click('text=Analytics');
    await expect(page).toHaveURL(/.*analytics.*/);
    
    // Verify the calculation appears in analytics
    await expect(page.locator(`text=${testProduct.name}`)).toBeVisible();
  });

  test('should handle FBA fee calculation', async ({ page }) => {
    // Assume user is already authenticated from previous test
    await page.goto('/fba-calculator');
    
    // Fill FBA calculator form
    await page.fill('input[name="product_name"]', 'FBA Test Product');
    await page.fill('input[name="selling_price"]', '29.99');
    await page.fill('input[name="weight"]', '0.8');
    await page.fill('input[name="length"]', '12');
    await page.fill('input[name="width"]', '9');
    await page.fill('input[name="height"]', '6');
    await page.selectOption('select[name="category"]', 'Electronics');
    
    // Calculate FBA fees
    await page.click('button:has-text("Calculate FBA Fees")');
    
    // Wait for results
    await page.waitForSelector('[data-testid="fba-results"]', { timeout: 10000 });
    
    // Verify FBA fee components
    const fulfillmentFee = await page.textContent('[data-testid="fulfillment-fee"]');
    const storageFee = await page.textContent('[data-testid="storage-fee"]');
    const referralFee = await page.textContent('[data-testid="referral-fee"]');
    const totalFees = await page.textContent('[data-testid="total-fba-fees"]');
    
    expect(fulfillmentFee).toMatch(/\$\d+\.\d{2}/);
    expect(storageFee).toMatch(/\$\d+\.\d{2}/);
    expect(referralFee).toMatch(/\$\d+\.\d{2}/);
    expect(totalFees).toMatch(/\$\d+\.\d{2}/);
  });

  test('should handle scenario modeling', async ({ page }) => {
    await page.goto('/scenario-modeler');
    
    // Create a new scenario
    await page.click('button:has-text("New Scenario")');
    
    // Fill scenario details
    await page.fill('input[name="scenario_name"]', 'Test Scenario');
    await page.fill('input[name="product_price"]', '50.00');
    await page.fill('input[name="quantity"]', '100');
    await page.fill('input[name="duty_rate"]', '0.05');
    await page.fill('input[name="shipping_cost"]', '200.00');
    
    // Run scenario
    await page.click('button:has-text("Run Scenario")');
    
    // Wait for results
    await page.waitForSelector('[data-testid="scenario-results"]', { timeout: 10000 });
    
    // Verify scenario calculations
    const totalCost = await page.textContent('[data-testid="total-cost"]');
    const profitMargin = await page.textContent('[data-testid="profit-margin"]');
    const roi = await page.textContent('[data-testid="roi"]');
    
    expect(totalCost).toMatch(/\$\d+\.\d{2}/);
    expect(profitMargin).toMatch(/\d+\.\d{1,2}%/);
    expect(roi).toMatch(/\d+\.\d{1,2}%/);
    
    // Save scenario
    await page.click('button:has-text("Save Scenario")');
    await expect(page.locator('text=Scenario saved successfully')).toBeVisible();
  });

  test('should handle bulk optimization', async ({ page }) => {
    await page.goto('/optimization');
    
    // Upload CSV file for bulk processing
    const fileInput = page.locator('input[type="file"]');
    
    // Create a test CSV content
    const csvContent = [
      'Product Name,Description,HS Code,Country of Origin,Unit Price,Weight',
      'Bulk Product 1,Test Description 1,1234567890,CN,15.99,0.3',
      'Bulk Product 2,Test Description 2,0987654321,US,25.50,0.7',
      'Bulk Product 3,Test Description 3,1122334455,DE,35.00,1.2'
    ].join('\n');
    
    // Note: In a real test, you'd upload an actual file
    // For this example, we'll simulate the upload process
    await page.click('button:has-text("Upload CSV")');
    
    // Wait for upload processing
    await page.waitForSelector('[data-testid="upload-success"]', { timeout: 15000 });
    
    // Start optimization
    await page.click('button:has-text("Start Optimization")');
    
    // Wait for optimization to complete
    await page.waitForSelector('[data-testid="optimization-complete"]', { timeout: 30000 });
    
    // Verify optimization results
    const optimizedProducts = await page.locator('[data-testid="optimized-product"]').count();
    expect(optimizedProducts).toBeGreaterThan(0);
    
    // Check for savings suggestions
    await expect(page.locator('text=Potential Savings')).toBeVisible();
    await expect(page.locator('[data-testid="total-savings"]')).toBeVisible();
  });

  test('should display analytics and insights', async ({ page }) => {
    await page.goto('/analytics');
    
    // Wait for analytics to load
    await page.waitForSelector('[data-testid="analytics-dashboard"]', { timeout: 10000 });
    
    // Verify key metrics are displayed
    await expect(page.locator('[data-testid="total-products"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-calculations"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-savings"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-duty-rate"]')).toBeVisible();
    
    // Verify charts are rendered
    await expect(page.locator('[data-testid="profitability-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="cost-breakdown-chart"]')).toBeVisible();
    
    // Test date range filter
    await page.click('[data-testid="date-range-picker"]');
    await page.click('text=Last 30 days');
    
    // Wait for data to refresh
    await page.waitForTimeout(2000);
    
    // Verify data updates
    const updatedMetrics = await page.locator('[data-testid="total-calculations"]').textContent();
    expect(updatedMetrics).toBeTruthy();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/core/calculate-landed-cost', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Server error' })
      });
    });
    
    await page.goto('/products');
    
    // Try to calculate landed cost (should fail)
    await page.click('button:has-text("Calculate")');
    await page.fill('input[name="shipping_cost"]', '15.00');
    await page.click('button:has-text("Calculate Landed Cost")');
    
    // Verify error message is displayed
    await expect(page.locator('text=Server error')).toBeVisible();
    
    // Test retry functionality
    await page.click('button:has-text("Retry")');
    
    // Verify error persists (since we're still mocking the error)
    await expect(page.locator('text=Server error')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Verify mobile navigation
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Navigate to products on mobile
    await page.click('text=Products');
    await expect(page).toHaveURL(/.*products.*/);
    
    // Verify mobile-friendly layout
    const productCard = page.locator('[data-testid="product-card"]').first();
    await expect(productCard).toBeVisible();
    
    // Test mobile form interaction
    await page.click('button:has-text("Add Product")');
    
    // Verify form is usable on mobile
    await page.fill('input[name="name"]', 'Mobile Test Product');
    await page.fill('input[name="unit_price"]', '19.99');
    
    // Verify mobile keyboard doesn't break layout
    const formContainer = page.locator('[data-testid="product-form"]');
    await expect(formContainer).toBeVisible();
  });
});