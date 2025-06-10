# DutyLeak Admin Guide

This guide is intended for users with **Owner** or **Admin** roles within a DutyLeak workspace. It covers administrative functionalities for managing your workspace, users, and other system aspects.

## 4.1 User Management

As an Owner or Admin, you can manage users within your workspace. This is typically done via a "Workspace Settings" or "User Management" section.

### 4.1.1 Viewing Workspace Members
*   You can view a list of all users who are members of your current workspace.
*   This list usually shows their display name, email, and assigned role within the workspace.

### 4.1.2 Managing User Roles
*   **Assigning Roles**: When inviting new members (see Section 2.2.3), you assign them a role.
*   **Changing Roles**: You can typically change the role of existing members.
    *   **Hierarchy**: Owners can change any member's role. Admins can usually change roles of Members and Viewers but cannot change the role of an Owner or another Admin.
    *   Available roles and their general capabilities:
        *   **Owner**: Full control.
        *   **Admin**: Manages users and settings, full data access.
        *   **Member**: Standard user, can use core data features.
        *   **Viewer**: Read-only access.
    *   Refer to Section 2.2.4 for more details on role capabilities.

### 4.1.3 Removing Users from Workspace
*   Owners and Admins can remove users from a workspace.
*   Removing a user revokes their access to that workspace's data and features.
*   Be cautious when removing users, especially if they are actively working on tasks or are the sole owners of certain data (though data is typically owned by the workspace).

## 4.2 Workspace Settings

Owners and Admins may have access to workspace-level settings. These could include:
*   **Workspace Name**: Changing the display name of the workspace.
*   **Billing Information**: (If applicable) Managing subscription details, payment methods, and viewing invoices.
*   **Default Settings**: Configuring default values for certain operations within the workspace (e.g., default destination country for calculations, default confidence thresholds for review queue).
*   **Integrations**: Managing integrations with other third-party services, if supported.
*   **Deleting Workspace**: Only Owners typically have the permission to delete an entire workspace. This is a critical action and usually requires confirmation.

## 4.3 API Key Management (If Applicable)

If DutyLeak provides an API for programmatic access and your role permits, you might manage API keys for your workspace.
*   **Location**: Usually found in "Workspace Settings" or a dedicated "API Keys" section (e.g., `/settings/api-keys`).

### 4.3.1 Creating and Managing API Keys
*   **Generation**: Generate new API keys for different applications or services.
*   **Permissions/Scopes**: API keys might have associated permissions or scopes that define what actions they can perform.
*   **Revocation**: Revoke existing API keys if they are compromised or no longer needed.
*   **Security**: Treat API keys like passwords; keep them secure and do not expose them in client-side code or public repositories.

### 4.3.2 Understanding API Key Permissions
*   API keys typically inherit permissions based on the user who created them or a specific set of scopes assigned during creation.
*   Ensure keys have only the minimum necessary permissions for their intended use.

## 4.4 Background Job Monitoring

Admins and Owners are typically responsible for monitoring the health and status of background jobs that process data for the workspace.
*   This includes tasks like bulk imports, bulk classifications, data exports, and other analyses.
*   For detailed information on accessing the Job Monitoring page, understanding job statuses (including `dead_letter`), and retrying failed jobs, please refer to **Section 3.8: Background Job Monitoring** in the Core Features documentation.

## 4.5 Data Management (Admin Level)

Admins may have access to specific data management features for the workspace.

### 4.5.1 Overview of Import/Export Job History
*   While the main Job Monitoring page shows all job types, there might be dedicated views or logs specifically for data import and export jobs, providing more detail on these operations (e.g., files processed, records succeeded/failed).
*   This is often found under "Settings" -> "Import Jobs" or "Export Jobs".

### 4.5.2 Requesting Data Deletion for the Workspace
*   **User Data Deletion**: Users might have an option in their profile settings to request deletion of their personal data.
*   **Workspace Data Deletion**: Workspace Owners may have the ability to request the deletion of all data associated with their workspace, or the entire workspace itself. This is a permanent action and should be handled with extreme care. The specific mechanism (e.g., a "Delete Workspace" button, contacting support) will be outlined in the application.

This Admin Guide provides an overview of common administrative tasks. Always exercise caution when performing actions that can affect user access, data integrity, or workspace settings.
