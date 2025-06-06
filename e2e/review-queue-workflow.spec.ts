import { test, expect } from '@playwright/test'

// Mock data for testing
const mockReviewItems = [
  {
    id: 'review-1',
    product: {
      title: 'Wireless Bluetooth Headphones',
      asin: 'B08TEST123',
      category: 'Electronics'
    },
    classification: {
      hs6: '851718',
      hs8: '85171800',
      description: 'Audio receiving apparatus'
    },
    confidence_score: 0.65,
    status: 'pending',
    priority: 'high',
    reason: 'Low confidence score'
  },
  {
    id: 'review-2',
    product: {
      title: 'Cotton T-Shirt',
      asin: 'B09TEST456',
      category: 'Clothing'
    },
    classification: {
      hs6: '610910',
      hs8: '61091000',
      description: 'T-shirts, singlets and other vests'
    },
    confidence_score: 0.55,
    status: 'pending',
    priority: 'medium',
    reason: 'Historical inconsistency'
  }
]

test.describe('Review Queue Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API responses
    await page.route('**/api/review-queue**', async (route) => {
      const url = route.request().url()
      const method = route.request().method()
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: mockReviewItems,
            total: mockReviewItems.length,
            hasMore: false
          })
        })
      } else if (method === 'PATCH') {
        const body = route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: `Review item ${body.action}d successfully`
          })
        })
      }
    })

    // Mock authentication
    await page.route('**/api/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        })
      })
    })

    // Navigate to review queue page
    await page.goto('/review-queue')
  })

  test('displays review queue items correctly', async ({ page }) => {
    // Wait for the page to load
    await page.waitForSelector('[data-testid="review-item"]', { timeout: 10000 })

    // Check that review items are displayed
    const reviewItems = page.locator('[data-testid="review-item"]')
    await expect(reviewItems).toHaveCount(2)

    // Check first item details
    const firstItem = reviewItems.first()
    await expect(firstItem.locator('text=Wireless Bluetooth Headphones')).toBeVisible()
    await expect(firstItem.locator('text=B08TEST123')).toBeVisible()
    await expect(firstItem.locator('text=851718')).toBeVisible()
    await expect(firstItem.locator('text=65%')).toBeVisible()
    await expect(firstItem.locator('text=High')).toBeVisible()

    // Check second item details
    const secondItem = reviewItems.nth(1)
    await expect(secondItem.locator('text=Cotton T-Shirt')).toBeVisible()
    await expect(secondItem.locator('text=B09TEST456')).toBeVisible()
    await expect(secondItem.locator('text=610910')).toBeVisible()
    await expect(secondItem.locator('text=55%')).toBeVisible()
    await expect(secondItem.locator('text=Medium')).toBeVisible()
  })

  test('filters items by status', async ({ page }) => {
    await page.waitForSelector('[data-testid="review-item"]')

    // Click on status filter
    await page.click('[data-testid="status-filter"]')
    await page.click('text=Pending')

    // Verify items are still visible (both are pending)
    const reviewItems = page.locator('[data-testid="review-item"]')
    await expect(reviewItems).toHaveCount(2)

    // Try filtering by approved (should show no items)
    await page.click('[data-testid="status-filter"]')
    await page.click('text=Approved')
    
    // Should show empty state or no items
    await expect(page.locator('text=No review items found')).toBeVisible()
  })

  test('filters items by priority', async ({ page }) => {
    await page.waitForSelector('[data-testid="review-item"]')

    // Filter by high priority
    await page.click('[data-testid="priority-filter"]')
    await page.click('text=High')

    // Should show only high priority item
    const reviewItems = page.locator('[data-testid="review-item"]')
    await expect(reviewItems).toHaveCount(1)
    await expect(reviewItems.locator('text=Wireless Bluetooth Headphones')).toBeVisible()
  })

  test('approves a review item successfully', async ({ page }) => {
    await page.waitForSelector('[data-testid="review-item"]')

    // Click approve button on first item
    const firstItem = page.locator('[data-testid="review-item"]').first()
    await firstItem.locator('[data-testid="approve-button"]').click()

    // Wait for success message
    await expect(page.locator('text=Review item approved successfully')).toBeVisible()

    // Verify the item status is updated
    await expect(firstItem.locator('text=Approved')).toBeVisible()
  })

  test('rejects a review item with notes', async ({ page }) => {
    await page.waitForSelector('[data-testid="review-item"]')

    // Click reject button on first item
    const firstItem = page.locator('[data-testid="review-item"]').first()
    await firstItem.locator('[data-testid="reject-button"]').click()

    // Wait for reject dialog to open
    await expect(page.locator('text=Reject Classification')).toBeVisible()

    // Fill in rejection notes
    await page.fill('[data-testid="rejection-notes"]', 'Incorrect HS code - should be 851712 for wireless headphones')

    // Confirm rejection
    await page.click('[data-testid="confirm-rejection"]')

    // Wait for success message
    await expect(page.locator('text=Review item rejected successfully')).toBeVisible()

    // Verify the item status is updated
    await expect(firstItem.locator('text=Rejected')).toBeVisible()
  })

  test('opens override dialog for detailed review', async ({ page }) => {
    await page.waitForSelector('[data-testid="review-item"]')

    // Click on override/edit button
    const firstItem = page.locator('[data-testid="review-item"]').first()
    await firstItem.locator('[data-testid="override-button"]').click()

    // Wait for override dialog to open
    await expect(page.locator('text=Override Classification')).toBeVisible()

    // Check that current classification is displayed
    await expect(page.locator('text=851718')).toBeVisible()
    await expect(page.locator('text=Audio receiving apparatus')).toBeVisible()

    // Check that alternative codes are suggested
    await expect(page.locator('[data-testid="alternative-codes"]')).toBeVisible()

    // Close dialog
    await page.click('[data-testid="close-dialog"]')
    await expect(page.locator('text=Override Classification')).not.toBeVisible()
  })

  test('searches and filters review items', async ({ page }) => {
    await page.waitForSelector('[data-testid="review-item"]')

    // Search for specific product
    await page.fill('[data-testid="search-input"]', 'Bluetooth')
    await page.press('[data-testid="search-input"]', 'Enter')

    // Should show only matching items
    const reviewItems = page.locator('[data-testid="review-item"]')
    await expect(reviewItems).toHaveCount(1)
    await expect(reviewItems.locator('text=Wireless Bluetooth Headphones')).toBeVisible()

    // Clear search
    await page.fill('[data-testid="search-input"]', '')
    await page.press('[data-testid="search-input"]', 'Enter')

    // Should show all items again
    await expect(reviewItems).toHaveCount(2)
  })

  test('displays confidence score indicators correctly', async ({ page }) => {
    await page.waitForSelector('[data-testid="review-item"]')

    const firstItem = page.locator('[data-testid="review-item"]').first()
    const secondItem = page.locator('[data-testid="review-item"]').nth(1)

    // Check confidence score displays
    await expect(firstItem.locator('[data-testid="confidence-score"]')).toContainText('65%')
    await expect(secondItem.locator('[data-testid="confidence-score"]')).toContainText('55%')

    // Check confidence indicators (colors/badges)
    await expect(firstItem.locator('[data-testid="confidence-indicator"]')).toHaveClass(/warning|yellow/)
    await expect(secondItem.locator('[data-testid="confidence-indicator"]')).toHaveClass(/danger|red/)
  })

  test('handles bulk operations', async ({ page }) => {
    await page.waitForSelector('[data-testid="review-item"]')

    // Select multiple items
    await page.check('[data-testid="select-item-0"]')
    await page.check('[data-testid="select-item-1"]')

    // Bulk approve button should be enabled
    await expect(page.locator('[data-testid="bulk-approve"]')).toBeEnabled()
    await expect(page.locator('[data-testid="bulk-reject"]')).toBeEnabled()

    // Perform bulk approval
    await page.click('[data-testid="bulk-approve"]')

    // Confirm bulk action
    await page.click('[data-testid="confirm-bulk-action"]')

    // Wait for success message
    await expect(page.locator('text=2 items approved successfully')).toBeVisible()
  })

  test('displays flagging criteria information', async ({ page }) => {
    await page.waitForSelector('[data-testid="review-item"]')

    const firstItem = page.locator('[data-testid="review-item"]').first()

    // Check flagging criteria badges
    await expect(firstItem.locator('text=Low Confidence')).toBeVisible()
    
    // Click to expand details
    await firstItem.locator('[data-testid="expand-details"]').click()

    // Check detailed flagging information
    await expect(firstItem.locator('[data-testid="flagging-details"]')).toBeVisible()
    await expect(firstItem.locator('text=Confidence below threshold')).toBeVisible()
  })

  test('refreshes data when refresh button is clicked', async ({ page }) => {
    await page.waitForSelector('[data-testid="review-item"]')

    // Click refresh button
    await page.click('[data-testid="refresh-button"]')

    // Should show loading state briefly
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()

    // Data should reload
    await page.waitForSelector('[data-testid="review-item"]')
    const reviewItems = page.locator('[data-testid="review-item"]')
    await expect(reviewItems).toHaveCount(2)
  })

  test('handles empty state correctly', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/review-queue**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          total: 0,
          hasMore: false
        })
      })
    })

    await page.reload()

    // Should show empty state
    await expect(page.locator('text=No review items found')).toBeVisible()
    await expect(page.locator('text=All classifications are up to date')).toBeVisible()
  })

  test('handles API errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('**/api/review-queue**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      })
    })

    await page.reload()

    // Should show error message
    await expect(page.locator('text=Failed to load review items')).toBeVisible()
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()

    // Retry should work
    await page.click('[data-testid="retry-button"]')
  })
})