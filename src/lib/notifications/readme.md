# Review Notification System

A comprehensive notification system for the DutyLeak review queue, supporting both email and in-app notifications for review assignments, completions, overdue alerts, workload warnings, and system notifications.

## Features

### 🔔 Notification Types
- **Review Assignments**: Notify reviewers of new assignments
- **Review Completions**: Notify stakeholders when reviews are completed
- **Overdue Alerts**: Alert about overdue reviews
- **Workload Warnings**: Warn when reviewer workload exceeds thresholds
- **System Alerts**: General system notifications

### 📧 Delivery Channels
- **Email Notifications**: HTML and plain text email templates
- **In-App Notifications**: Real-time browser notifications
- **Toast Notifications**: Non-intrusive UI alerts
- **Sound Notifications**: Audio alerts for important notifications

### ⚙️ User Preferences
- Granular control over notification types
- Channel-specific preferences (email, push, sound)
- Per-notification-type settings
- Real-time preference updates

## Architecture

### Core Components

```
src/lib/notifications/
├── email-service.ts          # Email notification service
├── in-app-service.ts         # In-app notification service
├── notification-manager.ts   # Central notification coordinator
├── migrations.sql            # Database schema and setup
├── setup.ts                  # Setup and migration scripts
└── README.md                 # This documentation
```

### API Endpoints

```
src/app/api/
├── notifications/
│   ├── route.ts              # General notifications CRUD
│   └── [notificationId]/
│       └── read/route.ts     # Mark specific notification as read
├── review-queue/
│   └── notifications/
│       └── route.ts          # Review-specific notifications
├── settings/
│   └── notifications/
│       └── route.ts          # Notification preferences
└── cron/
    └── review-notifications/
        └── route.ts          # Background notification jobs
```

### Frontend Components

```
src/components/review/
├── assignment-notifications.tsx  # Notification display component
└── review-notifications.tsx      # Review-specific notifications

src/hooks/
└── use-review-notifications.ts   # React hook for notifications
```

## Database Schema

### Tables

#### `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  read BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  action_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `notification_settings`
```sql
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id),
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  review_assignments BOOLEAN DEFAULT true,
  review_completions BOOLEAN DEFAULT true,
  review_overdue BOOLEAN DEFAULT true,
  system_alerts BOOLEAN DEFAULT true,
  workload_warnings BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `review_assignments`
```sql
CREATE TABLE review_assignments (
  id UUID PRIMARY KEY,
  item_id UUID REFERENCES review_queue(id),
  reviewer_id UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  completed_at TIMESTAMP WITH TIME ZONE,
  decision VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `notification_logs`
```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  notification_type VARCHAR(50) NOT NULL,
  channels_used JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `notification_analytics`
```sql
CREATE TABLE notification_analytics (
  id UUID PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  total_notifications INTEGER DEFAULT 0,
  type_breakdown JSONB DEFAULT '{}',
  priority_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Functions

- `get_reviewer_workload_stats()`: Get reviewer workload statistics
- `update_overdue_assignments()`: Update overdue assignment statuses
- `cleanup_expired_notifications()`: Remove expired notifications

### Views

- `notification_stats`: Aggregated notification statistics per user

## Setup Instructions

### 1. Database Setup

```bash
# Run the complete setup process
npm run setup-notifications setup

# Or run individual steps
npm run setup-notifications migrate     # Run migrations only
npm run setup-notifications init-users  # Initialize user settings
npm run setup-notifications verify      # Verify setup
```

### 2. Environment Variables

Add the following to your `.env.local`:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Service (choose one)
# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Resend
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Nodemailer (SMTP)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=noreply@yourdomain.com

# Cron Jobs
CRON_SECRET=your_secure_cron_secret

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Email Service Configuration

Choose and configure one email service in `src/lib/notifications/email-service.ts`:

#### Option A: SendGrid
```bash
npm install @sendgrid/mail
```

#### Option B: Resend
```bash
npm install resend
```

#### Option C: Nodemailer
```bash
npm install nodemailer @types/nodemailer
```

### 4. Cron Job Setup

Set up a cron job to run background notification tasks:

```bash
# Add to your cron scheduler (e.g., Vercel Cron, GitHub Actions, etc.)
# Run every 15 minutes
*/15 * * * * curl -X POST https://yourdomain.com/api/cron/review-notifications \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 5. Frontend Integration

Add notification components to your UI:

```tsx
import { ReviewNotifications } from '@/components/review/review-notifications'
import { useReviewNotifications } from '@/hooks/use-review-notifications'

function Dashboard() {
  const { notifications, unreadCount } = useReviewNotifications()
  
  return (
    <div>
      {/* Notification bell with count */}
      <ReviewNotifications variant="bell" />
      
      {/* Full notification list */}
      <ReviewNotifications variant="list" />
    </div>
  )
}
```

## Usage Examples

### Creating Notifications

```typescript
import { notificationManager } from '@/lib/notifications/notification-manager'

// Notify about new review assignment
await notificationManager.notifyReviewAssignment(
  'reviewer-user-id',
  'item-id',
  'assigner-user-id',
  new Date(Date.now() + 24 * 60 * 60 * 1000) // Due in 24 hours
)

// Notify about review completion
await notificationManager.notifyReviewCompletion(
  'stakeholder-user-id',
  'item-id',
  'reviewer-user-id',
  'approved'
)

// Send workload warning
await notificationManager.notifyWorkloadWarning(
  'reviewer-user-id',
  15, // current assignments
  10  // threshold
)
```

### Managing User Preferences

```typescript
import { notificationManager } from '@/lib/notifications/notification-manager'

// Update notification preferences
await notificationManager.updateNotificationPreferences('user-id', {
  email_enabled: true,
  sound_enabled: false,
  review_assignments: true,
  workload_warnings: false
})

// Get notification statistics
const stats = await notificationManager.getNotificationStats('user-id')
console.log(`Unread notifications: ${stats.unread_count}`)
```

### Using the React Hook

```tsx
import { useReviewNotifications } from '@/hooks/use-review-notifications'

function NotificationComponent() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch
  } = useReviewNotifications({
    filter: { type: 'review_assignment', unread: true },
    limit: 10
  })
  
  return (
    <div>
      <h3>Notifications ({unreadCount})</h3>
      {notifications.map(notification => (
        <div key={notification.id}>
          <h4>{notification.title}</h4>
          <p>{notification.message}</p>
          <button onClick={() => markAsRead(notification.id)}>
            Mark as Read
          </button>
        </div>
      ))}
    </div>
  )
}
```

## API Reference

### REST Endpoints

#### GET `/api/notifications`
Fetch user notifications with optional filtering.

**Query Parameters:**
- `type`: Filter by notification type
- `unread`: Filter by read status (true/false)
- `limit`: Number of notifications to return
- `offset`: Pagination offset

#### POST `/api/notifications`
Create a new notification.

**Body:**
```json
{
  "user_id": "uuid",
  "title": "string",
  "message": "string",
  "type": "review_assignment|review_completed|review_overdue|workload_warning|system_alert",
  "priority": "low|medium|high|urgent",
  "data": {},
  "action_url": "string"
}
```

#### PATCH `/api/notifications`
Mark notifications as read/unread.

**Body:**
```json
{
  "notification_ids": ["uuid1", "uuid2"],
  "read": true
}
```

#### DELETE `/api/notifications`
Delete notifications.

**Body:**
```json
{
  "notification_ids": ["uuid1", "uuid2"]
}
```

#### GET `/api/review-queue/notifications`
Fetch review-specific notifications.

#### POST `/api/review-queue/notifications`
Create review-specific notifications.

#### GET `/api/settings/notifications`
Get user notification preferences.

#### PUT `/api/settings/notifications`
Update user notification preferences.

## Testing

### Create Sample Data

```bash
# Create sample notifications for testing
npm run setup-notifications sample USER_ID
```

### Manual Testing

```typescript
// Test email service
import { EmailNotificationService } from '@/lib/notifications/email-service'

const emailService = new EmailNotificationService()
await emailService.sendNotificationEmail(
  'user@example.com',
  'Test Notification',
  'This is a test notification',
  'review_assignment',
  { item_id: 'test-123' }
)

// Test in-app service
import { InAppNotificationService } from '@/lib/notifications/in-app-service'

const inAppService = new InAppNotificationService()
await inAppService.createNotification({
  user_id: 'user-id',
  title: 'Test Notification',
  message: 'This is a test',
  type: 'system_alert'
})
```

## Monitoring and Analytics

### Notification Logs
All notification attempts are logged in the `notification_logs` table for debugging and analytics.

### Analytics Dashboard
View notification statistics:

```sql
-- Daily notification summary
SELECT * FROM notification_analytics ORDER BY date DESC;

-- User notification stats
SELECT * FROM notification_stats WHERE user_id = 'user-id';

-- Recent notification activity
SELECT 
  nl.*,
  u.email
FROM notification_logs nl
JOIN auth.users u ON u.id = nl.user_id
ORDER BY nl.created_at DESC
LIMIT 100;
```

## Troubleshooting

### Common Issues

1. **Notifications not sending**
   - Check email service configuration
   - Verify user notification preferences
   - Check notification logs for errors

2. **Real-time notifications not working**
   - Verify Supabase real-time is enabled
   - Check browser permissions for notifications
   - Ensure WebSocket connection is established

3. **Database permission errors**
   - Verify RLS policies are correctly set
   - Check user authentication status
   - Ensure service role key has proper permissions

### Debug Mode

Enable debug logging:

```typescript
// In your environment variables
NODE_ENV=development
DEBUG_NOTIFICATIONS=true
```

## Security Considerations

- All database operations use Row Level Security (RLS)
- Email templates are sanitized to prevent XSS
- Cron endpoints require authentication
- User preferences are validated before saving
- Notification data is encrypted in transit

## Performance Optimization

- Database indexes on frequently queried columns
- Automatic cleanup of expired notifications
- Batched notification processing
- Efficient real-time subscription management
- Pagination for large notification lists

## Contributing

When adding new notification types:

1. Add the type to the `NotificationType` enum
2. Create email templates in `email-service.ts`
3. Add UI handling in notification components
4. Update user preference options
5. Add appropriate database migrations
6. Update this documentation

## License

This notification system is part of the DutyLeak project and follows the same license terms.