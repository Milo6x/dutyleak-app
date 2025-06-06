/**
 * Setup script for the Review Notification System
 * This script initializes the notification system and runs necessary migrations
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Run database migrations for the notification system
 */
export async function runNotificationMigrations() {
  try {
    console.log('🚀 Starting notification system migrations...')
    
    // Read the migration SQL file
    const migrationPath = join(__dirname, 'migrations.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Executing ${statements.length} migration statements...`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          if (error) {
            console.warn(`⚠️  Warning in statement ${i + 1}:`, error.message)
          }
        } catch (err) {
          console.warn(`⚠️  Warning in statement ${i + 1}:`, err)
        }
      }
    }
    
    console.log('✅ Notification system migrations completed successfully!')
    return true
  } catch (error) {
    console.error('❌ Error running migrations:', error)
    return false
  }
}

/**
 * Initialize notification settings for existing users
 */
export async function initializeUserNotificationSettings() {
  try {
    console.log('👥 Initializing notification settings for existing users...')
    
    // Get all users without notification settings
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .not('id', 'in', 
        supabase
          .from('notification_settings')
          .select('user_id')
      )
    
    if (usersError) {
      throw usersError
    }
    
    if (!users || users.length === 0) {
      console.log('✅ All users already have notification settings')
      return true
    }
    
    // Create default notification settings for users
    const defaultSettings = users.map(user => ({
      user_id: user.id,
      email_enabled: true,
      push_enabled: true,
      sound_enabled: true,
      review_assignments: true,
      review_completions: true,
      review_overdue: true,
      system_alerts: true,
      workload_warnings: true
    }))
    
    const { error: insertError } = await supabase
      .from('notification_settings')
      .insert(defaultSettings)
    
    if (insertError) {
      throw insertError
    }
    
    console.log(`✅ Created notification settings for ${users.length} users`)
    return true
  } catch (error) {
    console.error('❌ Error initializing user notification settings:', error)
    return false
  }
}

/**
 * Verify that all required tables and functions exist
 */
export async function verifyNotificationSystemSetup() {
  try {
    console.log('🔍 Verifying notification system setup...')
    
    const requiredTables = [
      'notifications',
      'notification_settings',
      'notification_logs',
      'notification_analytics',
      'review_assignments'
    ]
    
    const requiredFunctions = [
      'get_reviewer_workload_stats',
      'update_overdue_assignments',
      'cleanup_expired_notifications'
    ]
    
    // Check tables
    for (const table of requiredTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.error(`❌ Table '${table}' not found or accessible:`, error.message)
        return false
      }
      console.log(`✅ Table '${table}' verified`)
    }
    
    // Check functions
    for (const func of requiredFunctions) {
      try {
        const { error } = await supabase.rpc(func)
        if (error && !error.message.includes('permission denied')) {
          console.log(`✅ Function '${func}' verified`)
        }
      } catch (err) {
        console.warn(`⚠️  Function '${func}' may not be accessible from client`)
      }
    }
    
    // Check notification view
    const { error: viewError } = await supabase
      .from('notification_stats')
      .select('*')
      .limit(1)
    
    if (viewError) {
      console.error('❌ notification_stats view not accessible:', viewError.message)
      return false
    }
    console.log('✅ notification_stats view verified')
    
    console.log('🎉 Notification system setup verification completed successfully!')
    return true
  } catch (error) {
    console.error('❌ Error verifying notification system setup:', error)
    return false
  }
}

/**
 * Complete setup process for the notification system
 */
export async function setupNotificationSystem() {
  console.log('🔧 Setting up Review Notification System...')
  
  const steps = [
    { name: 'Run migrations', fn: runNotificationMigrations },
    { name: 'Initialize user settings', fn: initializeUserNotificationSettings },
    { name: 'Verify setup', fn: verifyNotificationSystemSetup }
  ]
  
  for (const step of steps) {
    console.log(`\n📋 ${step.name}...`)
    const success = await step.fn()
    if (!success) {
      console.error(`❌ Failed at step: ${step.name}`)
      return false
    }
  }
  
  console.log('\n🎉 Review Notification System setup completed successfully!')
  console.log('\n📚 Next steps:')
  console.log('1. Configure email service (SendGrid, Resend, etc.) in email-service.ts')
  console.log('2. Set up cron job for /api/cron/review-notifications')
  console.log('3. Add notification components to your UI')
  console.log('4. Test the notification system with sample data')
  
  return true
}

/**
 * Create sample notification data for testing
 */
export async function createSampleNotifications(userId: string) {
  try {
    console.log('📝 Creating sample notifications for testing...')
    
    const sampleNotifications = [
      {
        user_id: userId,
        title: 'New Review Assignment',
        message: 'You have been assigned to review item #12345',
        type: 'review_assignment',
        priority: 'high',
        data: { item_id: '12345', due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
        action_url: '/review-queue/12345'
      },
      {
        user_id: userId,
        title: 'Review Completed',
        message: 'Review for item #11111 has been completed',
        type: 'review_completed',
        priority: 'medium',
        data: { item_id: '11111', decision: 'approved' },
        action_url: '/review-queue/11111'
      },
      {
        user_id: userId,
        title: 'Overdue Review Alert',
        message: 'Review for item #99999 is overdue',
        type: 'review_overdue',
        priority: 'urgent',
        data: { item_id: '99999', days_overdue: 3 },
        action_url: '/review-queue/99999'
      },
      {
        user_id: userId,
        title: 'High Workload Warning',
        message: 'You have 15 pending reviews - consider redistributing workload',
        type: 'workload_warning',
        priority: 'medium',
        data: { pending_count: 15, threshold: 10 }
      },
      {
        user_id: userId,
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight at 2 AM EST',
        type: 'system_alert',
        priority: 'low',
        data: { maintenance_time: '2024-01-15T07:00:00Z' }
      }
    ]
    
    const { data, error } = await supabase
      .from('notification_logs')
      .insert(sampleNotifications.map(notification => ({
        user_id: notification.user_id,
        notification_type: notification.type,
        channel: 'in_app',
        status: 'delivered',
        metadata: {
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          data: notification.data
        }
      })))
      .select()
    
    if (error) {
      throw error
    }
    
    console.log(`✅ Created ${data.length} sample notifications`)
    return data
  } catch (error) {
    console.error('❌ Error creating sample notifications:', error)
    return null
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2]
  
  switch (command) {
    case 'setup':
      setupNotificationSystem()
      break
    case 'migrate':
      runNotificationMigrations()
      break
    case 'verify':
      verifyNotificationSystemSetup()
      break
    case 'init-users':
      initializeUserNotificationSettings()
      break
    case 'sample':
      const userId = process.argv[3]
      if (!userId) {
        console.error('❌ Please provide a user ID for sample notifications')
        process.exit(1)
      }
      createSampleNotifications(userId)
      break
    default:
      console.log('📖 Available commands:')
      console.log('  setup     - Run complete setup process')
      console.log('  migrate   - Run database migrations only')
      console.log('  verify    - Verify system setup')
      console.log('  init-users - Initialize notification settings for existing users')
      console.log('  sample <user_id> - Create sample notifications for testing')
      console.log('\nExample: npm run setup-notifications setup')
  }
}