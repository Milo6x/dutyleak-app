#!/usr/bin/env node

/**
 * Setup script for the Review Notification System
 * This script provides a CLI interface for setting up and managing the notification system
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, message) {
  log(`\n${step} ${message}`, 'cyan')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

// Check if we're in the right directory
function checkProjectStructure() {
  const requiredFiles = [
    'package.json',
    'src/lib/notifications/setup.ts',
    'src/lib/notifications/migrations.sql'
  ]
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      logError(`Required file not found: ${file}`)
      logError('Please run this script from the project root directory')
      process.exit(1)
    }
  }
}

// Check environment variables
function checkEnvironmentVariables() {
  logStep('🔍', 'Checking environment variables...')
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    logError('Missing required environment variables:')
    missingVars.forEach(varName => logError(`  - ${varName}`))
    logInfo('Please add these to your .env.local file')
    return false
  }
  
  logSuccess('Environment variables configured')
  
  // Check optional email service variables
  const emailServices = {
    'SendGrid': ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
    'Resend': ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'],
    'SMTP': ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']
  }
  
  let emailServiceConfigured = false
  for (const [service, vars] of Object.entries(emailServices)) {
    if (vars.every(varName => process.env[varName])) {
      logSuccess(`${service} email service configured`)
      emailServiceConfigured = true
      break
    }
  }
  
  if (!emailServiceConfigured) {
    logWarning('No email service configured - email notifications will be simulated')
    logInfo('Configure one of: SendGrid, Resend, or SMTP for email notifications')
  }
  
  return true
}

// Install required dependencies
function installDependencies() {
  logStep('📦', 'Checking and installing dependencies...')
  
  const packageJsonPath = path.join(process.cwd(), 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  
  const requiredDeps = {
    '@supabase/supabase-js': '^2.0.0',
    'react': '^18.0.0',
    'react-dom': '^18.0.0'
  }
  
  const optionalDeps = {
    '@sendgrid/mail': '^7.0.0',
    'resend': '^3.0.0',
    'nodemailer': '^6.0.0',
    '@types/nodemailer': '^6.0.0'
  }
  
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
  const missingRequired = Object.keys(requiredDeps).filter(dep => !allDeps[dep])
  
  if (missingRequired.length > 0) {
    logWarning(`Missing required dependencies: ${missingRequired.join(', ')}`)
    logInfo('Installing required dependencies...')
    
    try {
      execSync(`npm install ${missingRequired.join(' ')}`, { stdio: 'inherit' })
      logSuccess('Required dependencies installed')
    } catch (error) {
      logError('Failed to install dependencies')
      logError(error.message)
      return false
    }
  } else {
    logSuccess('All required dependencies are installed')
  }
  
  // Check for email service dependencies
  const emailDeps = Object.keys(optionalDeps).filter(dep => allDeps[dep])
  if (emailDeps.length > 0) {
    logSuccess(`Email service dependencies found: ${emailDeps.join(', ')}`)
  } else {
    logInfo('No email service dependencies found - install one of:')
    logInfo('  - npm install @sendgrid/mail (for SendGrid)')
    logInfo('  - npm install resend (for Resend)')
    logInfo('  - npm install nodemailer @types/nodemailer (for SMTP)')
  }
  
  return true
}

// Run TypeScript compilation to check for errors
function checkTypeScript() {
  logStep('🔧', 'Checking TypeScript compilation...')
  
  try {
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' })
    logSuccess('TypeScript compilation successful')
    return true
  } catch (error) {
    logWarning('TypeScript compilation has issues - continuing anyway')
    logInfo('You may need to fix TypeScript errors before the system works properly')
    return true // Don't fail the setup for TS errors
  }
}

// Run the notification system setup
function runNotificationSetup() {
  logStep('🚀', 'Running notification system setup...')
  
  try {
    // Use ts-node to run the TypeScript setup file
    execSync('npx ts-node src/lib/notifications/setup.ts setup', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    })
    logSuccess('Notification system setup completed')
    return true
  } catch (error) {
    logError('Failed to run notification system setup')
    logError(error.message)
    return false
  }
}

// Create sample data for testing
function createSampleData() {
  logStep('📝', 'Creating sample notification data...')
  
  // This would need a user ID - for now, just show instructions
  logInfo('To create sample notifications for testing, run:')
  logInfo('  npx ts-node src/lib/notifications/setup.ts sample <user-id>')
  logInfo('Replace <user-id> with an actual user ID from your database')
  
  return true
}

// Show next steps
function showNextSteps() {
  logStep('🎉', 'Setup completed successfully!')
  
  log('\n📚 Next steps:', 'bright')
  log('\n1. Configure Email Service:')
  log('   - Edit src/lib/notifications/email-service.ts')
  log('   - Uncomment and configure your preferred email service')
  log('   - Add the required environment variables')
  
  log('\n2. Set up Cron Jobs:')
  log('   - Add a cron job to call /api/cron/review-notifications')
  log('   - Recommended frequency: every 15 minutes')
  log('   - Set CRON_SECRET environment variable')
  
  log('\n3. Add to Your UI:')
  log('   - Import and use ReviewNotifications component')
  log('   - Use useReviewNotifications hook for custom implementations')
  
  log('\n4. Test the System:')
  log('   - Create sample notifications: npm run setup-notifications sample <user-id>')
  log('   - Test email delivery with your configured service')
  log('   - Verify real-time notifications in the browser')
  
  log('\n5. Monitor and Maintain:')
  log('   - Check notification_logs table for delivery status')
  log('   - Monitor notification_analytics for usage patterns')
  log('   - Set up alerts for failed notifications')
  
  log('\n📖 Documentation:')
  log('   - Full documentation: src/lib/notifications/README.md')
  log('   - API reference: Check the README for endpoint details')
  log('   - Troubleshooting: See the README troubleshooting section')
}

// Main setup function
function main() {
  const command = process.argv[2] || 'setup'
  
  log('🔧 Review Notification System Setup', 'bright')
  log('=====================================\n')
  
  switch (command) {
    case 'setup':
      checkProjectStructure()
      
      const steps = [
        { name: 'Environment check', fn: checkEnvironmentVariables },
        { name: 'Dependencies', fn: installDependencies },
        { name: 'TypeScript check', fn: checkTypeScript },
        { name: 'Database setup', fn: runNotificationSetup },
        { name: 'Sample data info', fn: createSampleData }
      ]
      
      let allSuccessful = true
      for (const step of steps) {
        if (!step.fn()) {
          allSuccessful = false
          break
        }
      }
      
      if (allSuccessful) {
        showNextSteps()
      } else {
        logError('Setup failed - please check the errors above')
        process.exit(1)
      }
      break
      
    case 'check':
      checkProjectStructure()
      checkEnvironmentVariables()
      checkTypeScript()
      break
      
    case 'deps':
      installDependencies()
      break
      
    case 'sample':
      const userId = process.argv[3]
      if (!userId) {
        logError('Please provide a user ID: npm run setup-notifications sample <user-id>')
        process.exit(1)
      }
      try {
        execSync(`npx ts-node src/lib/notifications/setup.ts sample ${userId}`, { stdio: 'inherit' })
      } catch (error) {
        logError('Failed to create sample data')
        process.exit(1)
      }
      break
      
    case 'verify':
      try {
        execSync('npx ts-node src/lib/notifications/setup.ts verify', { stdio: 'inherit' })
      } catch (error) {
        logError('Verification failed')
        process.exit(1)
      }
      break
      
    default:
      log('📖 Available commands:', 'bright')
      log('  setup   - Run complete setup process (default)')
      log('  check   - Check environment and dependencies only')
      log('  deps    - Install required dependencies')
      log('  sample <user-id> - Create sample notifications for testing')
      log('  verify  - Verify the notification system setup')
      log('\nExample: npm run setup-notifications setup')
  }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  logError('Unexpected error occurred:')
  logError(error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled promise rejection:')
  logError(reason)
  process.exit(1)
})

if (require.main === module) {
  main()
}

module.exports = {
  checkProjectStructure,
  checkEnvironmentVariables,
  installDependencies,
  checkTypeScript,
  runNotificationSetup
}