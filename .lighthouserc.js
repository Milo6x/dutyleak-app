module.exports = {
  ci: {
    collect: {
      // The CI workflow's e2e-test job already starts the server with `npm start`
      // and waits on http://localhost:3000. So, Lighthouse CI can collect from these URLs.
      // If Lighthouse CI were to start its own server, use:
      // startServerCommand: 'npm start', 
      // startServerReadyPattern: 'ready on', // Adjust if your npm start logs a different ready message
      url: [
        'http://localhost:3000/',         // Home page (likely redirects to login or dashboard)
        'http://localhost:3000/dashboard',
        'http://localhost:3000/products',
        'http://localhost:3000/analytics',
        'http://localhost:3000/scenario-modeler',
        'http://localhost:3000/admin/jobs', // Job monitoring page
        // Add more key authenticated pages if possible.
        // Note: Lighthouse CI runs unauthenticated by default.
        // For authenticated pages, you'd need to configure puppeteerScript to log in first,
        // or test pages that are accessible without login, or use a test setup where auth is bypassed.
        // For now, focusing on pages that might be accessible or a generic logged-in state if CI can achieve it.
      ],
      numberOfRuns: 2, // Run twice for more stable results (3 is common too)
      settings: {
        // preset: 'desktop', // or 'mobile'
        // onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        // chromeFlags: '--no-sandbox --headless --disable-gpu', // Common flags for CI
      }
    },
    assert: {
      preset: 'lighthouse:recommended', // Basic set of assertions
      assertions: {
        // Performance category score: warn if below 0.8 (80)
        'categories:performance': ['warn', { minScore: 0.80 }],
        // Accessibility category score: error if below 0.9 (90)
        'categories:accessibility': ['error', { minScore: 0.90 }],
        // Best Practices category score: warn if below 0.9 (90)
        'categories:best-practices': ['warn', { minScore: 0.90 }],
        // SEO category score: warn if below 0.9 (90)
        'categories:seo': ['warn', { minScore: 0.90 }],

        // Specific metric examples (adjust thresholds as needed)
        // 'first-contentful-paint': ['warn', { maxNumericValue: 2000 }], // ms
        // 'interactive': ['warn', { maxNumericValue: 3500 }], // ms
        // 'speed-index': ['warn', { maxNumericValue: 3000 }],
        // 'cumulative-layout-shift': ['warn', { maxNumericValue: 0.15 }],
        
        // Turn off some noisy or less critical assertions if needed
        // 'uses-responsive-images': 'off',
        // 'uses-webp-images': 'off', // If not using webp
      },
    },
    upload: {
      target: 'temporary-public-storage', // Easiest for viewing reports from PRs
      // Or use 'filesystem' to save reports as artifacts:
      // target: 'filesystem',
      // outputDir: './lhci-reports',
      // reportFilenamePattern: '%%URL_NORMALIZED%%-%%DATETIME%%.html', // Customize report names
    },
    // server: {
    //   // If using a dedicated LHCI server for storing results history
    // },
    // wizard: {
    //   // For initial setup, not needed for CI config usually
    // }
  },
};
