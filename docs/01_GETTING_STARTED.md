# Getting Started with DutyLeak

Welcome to DutyLeak! This guide will walk you through the initial steps to get your account set up, create your first workspace, and understand the basic navigation of the platform.

## 2.1 Account Management

Managing your DutyLeak account is straightforward. Here’s how to handle common account-related tasks.

### 2.1.1 Creating a New Account (Signup Process)

To start using DutyLeak, you'll need to create an account.
1.  Navigate to the DutyLeak signup page (typically `your-app-url/auth/signup`).
2.  You will be prompted to enter your email address and choose a secure password.
3.  After submitting the signup form, you may need to verify your email address. Check your inbox for a verification email and click the link provided.
4.  Upon successful verification, your account will be created. The application uses an "Improved Signup Flow" which may guide you directly into creating your first workspace as part of the signup.

### 2.1.2 Logging In and Out

*   **Logging In**:
    1.  Go to the DutyLeak login page (typically `your-app-url/auth/login`).
    2.  Enter your registered email address and password.
    3.  Click "Login". You will be redirected to your dashboard.
*   **Logging Out**:
    1.  You can usually find a "Logout" option in your user profile menu (often accessible by clicking your name or avatar in the top navigation bar) or in the main navigation sidebar.

### 2.1.3 Password Management (Forgot Password)

If you forget your password:
1.  Go to the login page.
2.  Look for a "Forgot Password?" or "Reset Password" link.
3.  Enter your registered email address.
4.  You will receive an email with instructions and a link to reset your password. Follow the instructions to set a new password.

### 2.1.4 Profile Settings

You can manage your user profile settings, which may include:
*   Changing your name or display name.
*   Updating your email address (this might require re-verification).
*   Changing your password.
*   Managing notification preferences.
To access your profile settings, look for a "Profile" or "Settings" link, often under your user menu in the navigation bar (e.g., `/settings/profile`).

## 2.2 Workspace Management

Workspaces are collaborative environments where you and your team can manage products, classifications, and analytics.

### 2.2.1 Understanding Workspaces

*   A workspace isolates your data and allows you to share access with team members.
*   Each user can be a member of one or more workspaces.
*   All data such as products, classifications, scenarios, and analytics are scoped to a specific workspace.

### 2.2.2 Creating Your First Workspace

*   If you haven't created a workspace during the initial signup flow, you will likely be prompted to create one upon your first login.
*   Typically, you'll need to provide a name for your workspace.
*   The user who creates a workspace usually becomes its first **Owner**.

### 2.2.3 Inviting Team Members to a Workspace

Workspace Owners and Admins can invite new members:
1.  Navigate to your workspace settings (often found under a "Settings" or "Workspace Management" section).
2.  Look for an "Invite Members" or "Manage Users" option.
3.  You'll typically need to enter the email address of the person you want to invite and assign them a role.
4.  The invited user will receive an email notification with a link to join the workspace.

### 2.2.4 User Roles and Permissions

DutyLeak uses a role-based access control system within workspaces. The common roles are:
*   **Owner**: Full control over the workspace, including billing, deleting the workspace, and managing all members and settings. Can do everything an Admin can.
*   **Admin**: Can manage users (invite, remove, change roles below their own), manage most workspace settings, and has full access to data features.
*   **Member**: Can access and use core features (e.g., manage products, run classifications, create scenarios, view analytics). Cannot manage users or critical workspace settings.
*   **Viewer**: Read-only access to data and analytics. Cannot make changes or perform actions.

The specific permissions for each role (e.g., `DATA_CREATE`, `ANALYTICS_VIEW`) are defined within the system.

### 2.2.5 Switching Between Workspaces (if applicable)

If you are a member of multiple workspaces, there will typically be a dropdown menu or a section in your user profile/settings area that allows you to switch your active workspace.

## 2.3 Navigating the Dashboard

Once logged in and in a workspace, you'll interact with the DutyLeak platform primarily through its dashboard and navigation system.

### 2.3.1 Main Dashboard Overview

*   The main dashboard (often the landing page after login, e.g., `/dashboard`) provides a high-level overview of your key metrics, recent activity, and quick access to important features.
*   It typically includes summary cards for total products, savings, pending reviews, active jobs, etc.
*   You might also see charts for trends and quick links to other sections.

### 2.3.2 Sidebar Navigation

*   A persistent sidebar is usually present on the left side of the screen.
*   This sidebar contains links to all major sections of the application, such as:
    *   Dashboard
    *   Products
    *   Classification
    *   Scenario Modeler
    *   Analytics
    *   Review Queue
    *   Settings (User Profile, Workspace Settings)
    *   Admin (Job Monitoring, User Management - for admin roles)

### 2.3.3 Common UI Elements

As you use DutyLeak, you'll encounter common UI elements:
*   **Filters**: Used on list pages (e.g., products, jobs) to narrow down results.
*   **Date Pickers**: Used in analytics and reporting to select time ranges.
*   **Tabs**: Used to organize content within a page (e.g., different views in the Analytics Dashboard or Scenario Modeler).
*   **Buttons**: For actions like "Create", "Save", "Export", "Retry".
*   **Tables**: For displaying lists of data. Often include sorting and pagination.
*   **Badges**: To indicate status (e.g., job status, product status).
*   **Modals/Dialogs**: For forms (e.g., creating a new product) or confirmations.

This guide should help you get started with DutyLeak. Refer to the subsequent sections for more detailed information on specific features.
