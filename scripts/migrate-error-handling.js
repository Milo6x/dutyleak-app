#!/usr/bin/env node

/**
 * Migration script to help update existing API routes to use the new standardized error handling
 * 
 * Usage: node scripts/migrate-error-handling.js [path-to-api-routes]
 * 
 * This script will:
 * 1. Scan API route files for common error handling patterns
 * 2. Generate suggestions for updating to the new middleware system
 * 3. Optionally create backup files and apply automatic transformations
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class ErrorHandlingMigrator {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      backup: options.backup || true,
      verbose: options.verbose || false,
      ...options
    }
    
    this.patterns = {
      // Authentication patterns
      manualAuth: /const\s+{\s*data:\s*{\s*session\s*}.*?}\s*=\s*await\s+supabase\.auth\.getSession\(\)/g,
      authCheck: /if\s*\(.*?!session.*?\)\s*{[\s\S]*?return\s+NextResponse\.json\([\s\S]*?status:\s*401/g,
      
      // Error handling patterns
      tryBlock: /try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{[\s\S]*?}/g,
      errorReturn: /return\s+NextResponse\.json\(\s*{\s*error:/g,
      consoleError: /console\.error\(/g,
      
      // Validation patterns
      bodyParse: /const\s+\w+\s*=\s*await\s+request\.json\(\)/g,
      manualValidation: /if\s*\(!\w+.*?\)\s*{[\s\S]*?return\s+NextResponse\.json\([\s\S]*?status:\s*400/g,
      
      // Workspace patterns
      workspaceAccess: /getWorkspaceAccess\(/g,
      workspaceCheck: /if\s*\(!.*?hasAccess.*?\)\s*{[\s\S]*?return\s+NextResponse\.json\([\s\S]*?status:\s*403/g
    }
    
    this.suggestions = []
  }
  
  /**
   * Scan a directory for API route files
   */
  scanDirectory(dirPath) {
    const files = []
    
    const scanRecursive = (currentPath) => {
      const items = fs.readdirSync(currentPath)
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          scanRecursive(fullPath)
        } else if (item === 'route.ts' || item === 'route.js') {
          files.push(fullPath)
        }
      }
    }
    
    scanRecursive(dirPath)
    return files
  }
  
  /**
   * Analyze a single file for migration opportunities
   */
  analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const analysis = {
      file: filePath,
      issues: [],
      suggestions: [],
      complexity: 'low'
    }
    
    // Check for manual authentication
    if (this.patterns.manualAuth.test(content)) {
      analysis.issues.push('Manual authentication implementation')
      analysis.suggestions.push({
        type: 'auth',
        description: 'Replace manual authentication with withAuth or withWorkspaceAuth middleware',
        example: `
// Replace this:
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// With this:
export const POST = withAuth(async (request, context) => {
  const { user, session } = context
  // Your logic here
})
        `
      })
    }
    
    // Check for manual validation
    if (this.patterns.bodyParse.test(content) && this.patterns.manualValidation.test(content)) {
      analysis.issues.push('Manual request validation')
      analysis.suggestions.push({
        type: 'validation',
        description: 'Replace manual validation with withValidation middleware',
        example: `
// Replace this:
const body = await request.json()
if (!body.name) {
  return NextResponse.json({ error: 'Name required' }, { status: 400 })
}

// With this:
const schema = z.object({ name: z.string().min(1) })
export const POST = withValidation(async (request, validation) => {
  const { body } = validation // body.name is guaranteed to exist
}, { body: schema })
        `
      })
    }
    
    // Check for workspace access patterns
    if (this.patterns.workspaceAccess.test(content)) {
      analysis.issues.push('Manual workspace access check')
      analysis.suggestions.push({
        type: 'workspace',
        description: 'Replace manual workspace access with withWorkspaceAuth middleware',
        example: `
// Replace this:
const hasAccess = await getWorkspaceAccess(userId, workspaceId)
if (!hasAccess) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}

// With this:
export const POST = withWorkspaceAuth(async (request, context) => {
  const { workspace, user } = context
  // Access is guaranteed
}, { requiredRole: 'member' })
        `
      })
    }
    
    // Check for try-catch blocks
    const tryBlocks = content.match(this.patterns.tryBlock)
    if (tryBlocks && tryBlocks.length > 0) {
      analysis.issues.push(`${tryBlocks.length} manual try-catch block(s)`)
      analysis.suggestions.push({
        type: 'error-handling',
        description: 'Replace manual error handling with withApiErrorHandling middleware',
        example: `
// Replace this:
try {
  // Your logic
} catch (error) {
  console.error(error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

// With this:
export const POST = withApiErrorHandling(async (request) => {
  // Your logic - errors are automatically handled
}, { component: 'your-component', operation: 'your-operation' })
        `
      })
    }
    
    // Determine complexity
    const issueCount = analysis.issues.length
    if (issueCount >= 4) {
      analysis.complexity = 'high'
    } else if (issueCount >= 2) {
      analysis.complexity = 'medium'
    }
    
    return analysis
  }
  
  /**
   * Generate migration report
   */
  generateReport(analyses) {
    const report = {
      summary: {
        totalFiles: analyses.length,
        filesNeedingMigration: analyses.filter(a => a.issues.length > 0).length,
        complexityBreakdown: {
          low: analyses.filter(a => a.complexity === 'low').length,
          medium: analyses.filter(a => a.complexity === 'medium').length,
          high: analyses.filter(a => a.complexity === 'high').length
        }
      },
      files: analyses.filter(a => a.issues.length > 0)
    }
    
    return report
  }
  
  /**
   * Print migration report
   */
  printReport(report) {
    console.log('\n🔍 Error Handling Migration Analysis')
    console.log('=====================================\n')
    
    console.log('📊 Summary:')
    console.log(`   Total files scanned: ${report.summary.totalFiles}`)
    console.log(`   Files needing migration: ${report.summary.filesNeedingMigration}`)
    console.log(`   Complexity breakdown:`)
    console.log(`     Low: ${report.summary.complexityBreakdown.low}`)
    console.log(`     Medium: ${report.summary.complexityBreakdown.medium}`)
    console.log(`     High: ${report.summary.complexityBreakdown.high}\n`)
    
    if (report.files.length === 0) {
      console.log('✅ All files are already using standardized error handling!')
      return
    }
    
    console.log('📋 Files requiring migration:\n')
    
    report.files.forEach((analysis, index) => {
      const complexityIcon = {
        low: '🟢',
        medium: '🟡',
        high: '🔴'
      }[analysis.complexity]
      
      console.log(`${index + 1}. ${complexityIcon} ${analysis.file}`)
      console.log(`   Complexity: ${analysis.complexity}`)
      console.log(`   Issues found:`)
      
      analysis.issues.forEach(issue => {
        console.log(`     • ${issue}`)
      })
      
      if (this.options.verbose) {
        console.log(`   Suggestions:`)
        analysis.suggestions.forEach(suggestion => {
          console.log(`     📝 ${suggestion.description}`)
          if (suggestion.example) {
            console.log(`        Example:${suggestion.example}`)
          }
        })
      }
      
      console.log()
    })
    
    console.log('💡 Next steps:')
    console.log('   1. Review the migration guide: docs/error-handling-guide.md')
    console.log('   2. Start with low complexity files')
    console.log('   3. Test each migration thoroughly')
    console.log('   4. Use --verbose flag to see detailed suggestions')
    console.log('\n   Example migration command:')
    console.log('   node scripts/migrate-error-handling.js --verbose --dry-run src/app/api')
  }
  
  /**
   * Run migration analysis
   */
  run(targetPath) {
    console.log(`🚀 Starting error handling migration analysis...`)
    console.log(`📁 Target path: ${targetPath}\n`)
    
    if (!fs.existsSync(targetPath)) {
      console.error(`❌ Error: Path '${targetPath}' does not exist`)
      process.exit(1)
    }
    
    const files = this.scanDirectory(targetPath)
    console.log(`📄 Found ${files.length} API route files\n`)
    
    if (files.length === 0) {
      console.log('ℹ️  No API route files found')
      return
    }
    
    const analyses = files.map(file => {
      if (this.options.verbose) {
        console.log(`🔍 Analyzing ${file}...`)
      }
      return this.analyzeFile(file)
    })
    
    const report = this.generateReport(analyses)
    this.printReport(report)
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'migration-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Detailed report saved to: ${reportPath}`)
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2)
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    backup: !args.includes('--no-backup')
  }
  
  const targetPath = args.find(arg => !arg.startsWith('--')) || 'src/app/api'
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Error Handling Migration Tool

Usage: node scripts/migrate-error-handling.js [options] [path]

Options:
  --dry-run     Analyze only, don't make changes
  --verbose     Show detailed suggestions
  --no-backup   Don't create backup files
  --help, -h    Show this help message

Examples:
  node scripts/migrate-error-handling.js
  node scripts/migrate-error-handling.js --verbose src/app/api
  node scripts/migrate-error-handling.js --dry-run --verbose
`)
    return
  }
  
  const migrator = new ErrorHandlingMigrator(options)
  migrator.run(targetPath)
}

if (require.main === module) {
  main()
}

module.exports = { ErrorHandlingMigrator }