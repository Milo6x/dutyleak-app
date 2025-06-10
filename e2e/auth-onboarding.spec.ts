import { test, expect } from '@playwright/test';

test.describe('User Signup and Onboarding Flow', () => {
  const uniqueEmail = `testuser_${Date.now()}@example.com`;
  const password = 'Password123!';
  const workspaceName = `Test Workspace ${Date.now()}`;

  test('should allow a new user to sign up, create a workspace, and land on the dashboard', async ({ page }) => {
    // Navigate to the signup page
    // Assuming the signup page is at '/auth/signup' or the root redirects to signup if not logged in.
    // Adjust the URL as per your application's routing.
    await page.goto('/auth/signup'); 
    await expect(page).toHaveURL(/.*signup/); // Or whatever your signup page URL is

    // Fill out the signup form
    // Replace with actual selectors for your signup form elements
    await page.locator('input[name="email"]').fill(uniqueEmail);
    await page.locator('input[name="password"]').fill(password);
    // If there's a "confirm password" field:
    // await page.locator('input[name="confirmPassword"]').fill(password);
    
    // Click the signup button
    // Replace with actual selector for your signup button
    await page.locator('button[type="submit"]:has-text("Sign Up")').click(); 
    // Or: await page.getByRole('button', { name: /Sign Up/i }).click();

    // Email Verification Step:
    // In a real E2E test environment, this step needs special handling:
    // 1. Using a test email service (e.g., Mailinator, MailHog) to fetch the verification link.
    // 2. A backdoor API in the test environment to mark the user as verified.
    // 3. Disabling email verification in the test environment.
    // For this script, we'll assume verification is handled or bypassed,
    // and the app proceeds to the next step (e.g., workspace creation or dashboard).
    // Add a placeholder wait or navigation if there's an intermediate page.
    // await page.waitForTimeout(2000); // Placeholder for email verification simulation

    // Workspace Creation / Setup Step (if part of onboarding)
    // This depends on your app's flow after signup/verification.
    // The 'improved-signup-flow.tsx' and '/api/auth/setup-workspace/route.ts' suggest this.
    
    // Example: If redirected to a workspace setup page
    // Check if on a page that asks for workspace name
    // Use a more specific selector if possible
    const workspaceInput = page.locator('input[name="workspaceName"]'); // Or similar
    const createWorkspaceButton = page.locator('button:has-text("Create Workspace")'); // Or similar

    // Wait for either the workspace input or the dashboard (if workspace creation is automatic/skipped)
    await Promise.race([
        workspaceInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
        page.waitForURL(/.*dashboard/, { timeout: 10000 }).catch(() => {})
    ]);


    if (await workspaceInput.isVisible()) {
        await expect(page.locator('h1')).toContainText(/Set up your workspace/i); // Or similar heading
        await workspaceInput.fill(workspaceName);
        await createWorkspaceButton.click();
    }
    // If workspace creation is part of a modal or different flow, adjust selectors and actions.

    // Landing on the Dashboard
    // After signup and potential workspace creation, user should land on the dashboard.
    // Replace with the actual URL or a unique element on your dashboard.
    await expect(page).toHaveURL(/.*dashboard/); // e.g., '/dashboard'
    await expect(page.locator('h1')).toContainText(/Dashboard/i); // Or other dashboard heading/element

    // Optional: Verify user email or name is displayed (e.g., in a profile dropdown)
    // const userDropdown = page.locator('#user-profile-dropdown'); // Replace with actual selector
    // await userDropdown.click();
    // await expect(page.locator(`text=${uniqueEmail}`)).toBeVisible();
  });

  // Add more tests for signup variations:
  // - Signup with an existing email
  // - Signup with invalid password format
  // - etc.
});
