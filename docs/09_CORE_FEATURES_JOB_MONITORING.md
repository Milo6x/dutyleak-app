# Core Features: Background Job Monitoring

DutyLeak performs various complex or time-consuming operations as background jobs to ensure the user interface remains responsive. These jobs include bulk product imports, bulk classifications, data exports, and other analyses. Users with administrative privileges can monitor and manage these jobs.

## 3.8.1 Accessing the Job Monitoring Page

Typically, users with 'Admin' or 'Owner' roles in a workspace can access the Job Monitoring page.
1.  **Navigate to Admin Section**: Look for an "Admin" section in the main navigation sidebar.
2.  **Find Job Monitoring**: Within the Admin section, there should be a link to "Jobs," "Job Queue," or "Job Monitoring" (e.g., `/admin/jobs`).

## 3.8.2 Understanding Job Details and Statuses

The Job Monitoring page displays a list of background jobs with key information for each:

*   **Job ID**: A unique identifier for the job.
*   **Type**: The kind of operation the job is performing (e.g., `bulk_classification`, `data_import`, `duty_optimization`).
*   **Status**: The current state of the job. Common statuses include:
    *   **Pending**: The job is in the queue waiting to be processed.
    *   **Running**: The job is currently being executed.
    *   **Completed**: The job finished successfully.
    *   **Failed**: The job encountered an error and could not complete.
    *   **Cancelled**: The job was manually cancelled before completion.
    *   **Paused**: The job is temporarily stopped and can be resumed.
    *   **Dead Letter**: The job failed multiple times (exhausted retries) and requires manual investigation.
*   **Progress**: A percentage indicating how much of the job has been completed (especially for batch jobs). May also show current item being processed.
*   **Created At**: The date and time when the job was created.
*   **Started At**: The date and time when the job began processing.
*   **Completed At**: The date and time when the job finished (if applicable).
*   **Error**: If a job failed or went to dead letter, this column will display the error message or details.

The list of jobs usually refreshes automatically, allowing you to see real-time updates.

## 3.8.3 Retrying Failed or Dead Letter Jobs

If a job has a status of `failed` or `dead_letter`, you can often attempt to retry it:
1.  **Locate the Failed Job**: Find the job in the list on the Job Monitoring page.
2.  **Retry Action**: Look for a "Retry" button or action associated with the failed job.
3.  **Initiate Retry**: Clicking "Retry" will typically re-queue the job. A new job instance might be created, or the existing job's status might be reset to `pending`.
4.  **Monitor Again**: Observe the job list to see if the retried job processes successfully.

If a job repeatedly fails or ends up in the `dead_letter` queue, it may indicate a more persistent issue with the input data, system configuration, or the job processing logic itself, requiring further investigation.

Effective job monitoring helps ensure that your bulk operations and automated tasks are completing successfully and allows you to address any issues promptly.
