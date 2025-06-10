# Core Features: Review Queue

The Review Queue in DutyLeak is a centralized place for managing items that require human attention and verification, particularly AI-suggested HS code classifications. This ensures data accuracy and compliance.

## 3.7.1 Purpose of the Review Queue

The primary purposes of the Review Queue are:
*   **Quality Control**: To have a human expert review HS code classifications, especially those where the AI has low confidence or for high-value/high-risk products.
*   **Accuracy Improvement**: By reviewing and correcting classifications, you help fine-tune the system (if it incorporates feedback loops) and ensure your duty calculations are based on correct codes.
*   **Compliance**: Maintaining a review process demonstrates due diligence for customs compliance.
*   **Workflow Management**: To streamline the process of identifying, assigning, and resolving items needing review.

Items might be automatically added to the review queue based on:
*   Low AI confidence scores for HS code classifications.
*   Specific product categories or values that require mandatory review.
*   Flags raised by an automated system (e.g., `lib/review/automatic-flagging-system.ts`).
*   Manual submission by users.

## 3.7.2 Accessing and Navigating the Review Queue

1.  **Navigate to Review Queue**: Look for "Review Queue," "Reviews," or a similar label in the main navigation sidebar (e.g., `/review-queue`).
2.  **View Queue Items**: The page will display a list of items awaiting review. Each item might show:
    *   Product Name/ID.
    *   AI-suggested HS Code and confidence score.
    *   Reason for review (e.g., "Low Confidence," "Manual Flag").
    *   Assigned reviewer (if applicable).
    *   Date added to queue.
    *   Status (e.g., "Pending Review," "In Progress").
3.  **Filtering and Sorting**: Options to filter by status, assignee, date, or product category may be available to help manage the queue.

## 3.7.3 Assigning Review Items (if applicable)

If your workspace has multiple users with review responsibilities, the system might allow for assigning items to specific reviewers (`src/components/review/review-assignment-system.tsx`).

*   **Manual Assignment**: Admins or team leads might be able to assign items from the queue to individual team members.
*   **Automatic Assignment**: The system could have rules for auto-assigning items based on workload, expertise, or round-robin.
*   The assigned reviewer would then be responsible for processing that item.

## 3.7.4 Processing Items: Approving, Rejecting, or Overriding

When reviewing an item (typically an HS code classification):
1.  **Examine Details**: Click on an item in the queue to view its full details, including product information, the AI's suggested classification, and any supporting data.
2.  **Verify Classification**: Use your expertise and available resources (e.g., official tariff schedules, internal guidelines) to determine if the AI-suggested HS code is correct.
3.  **Take Action**:
    *   **Approve**: If the AI suggestion is correct, approve it. This confirms the HS code for the product.
    *   **Reject/Edit/Override**: If the AI suggestion is incorrect, you can reject it and provide the correct HS code. The system (`src/components/review/enhanced-override-dialog.tsx`) may allow you to input the correct code, reason for change, and save it. This manually entered code will then typically become the active classification.
    *   **Add Notes**: You might be able to add comments or notes for auditing or team communication.
4.  **Item Resolution**: Once processed, the item's status in the review queue will update (e.g., to "Completed," "Resolved").

## 3.7.5 Notifications for Review Assignments

To ensure timely reviews, DutyLeak may incorporate a notification system (`src/hooks/use-review-notifications.ts`, `src/lib/notifications/notification-manager.ts`):
*   When an item is assigned to a reviewer, they might receive an in-app notification or an email.
*   Notifications could also be sent for overdue items or when a review is completed.
*   Users can typically manage their notification preferences in their profile settings.

A well-managed review queue process is vital for maintaining high-quality classification data, which directly impacts the accuracy of duty calculations and compliance.
