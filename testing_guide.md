# DutyLeak Testing Guide

## Overview

This guide provides comprehensive instructions for running and understanding the test suite for the DutyLeak application. The testing strategy covers multiple layers including unit tests, integration tests, end-to-end tests, performance tests, and security tests.

## Quick Start

### Running All Tests
```bash
# Run the complete test suite
./scripts/run-tests.sh

# Run tests without E2E (faster)
./scripts/run-tests.sh --skip-e2e

# Generate coverage report only
./scripts/run-tests.sh --coverage-only
```

### Running Specific Test Types
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Performance tests
npm run test:performance

# Security tests
npm run test:security

# End-to-end tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Test Structure

### Directory Organization
```
src/
├── lib/
│   ├── __tests__/
│   │   ├── test-utils.tsx          # Testing utilities and mocks
│   │   ├── performance.test.ts     # Performance tests
│   │   └── security.test.ts        # Security tests
│   └── duty/
│       └── __tests__/
│           └── duty-calculator.test.ts  # Unit tests for duty calculations
├── components/
│   └── fba/
│       └── __tests__/
│           └── fba-fee-calculator.test.tsx  # Component tests
└── app/
    └── api/
        └── __tests__/
            └── calculate-landed-cost.test.ts  # API integration tests
e2e/
└── landed-cost-calculation.spec.ts    # End-to-end tests
```

## Test Types Explained

### 1. Unit Tests

**Purpose**: Test individual functions and components in isolation.

**Location**: `src/lib/duty/__tests__/duty-calculator.test.ts`

**What it tests**:
- `LandedCostCalculator` class functionality
- Basic calculation logic
- Edge cases (zero values, rounding)
- Input validation

**Example**:
```typescript
test('should calculate basic landed cost correctly', () => {
  const calculator = new LandedCostCalculator();
  const result = calculator.calculate({
    productValue: 100,
    dutyRate: 0.1,
    shippingCost: 20
  });
  expect(result.landedCost).toBe(130);
});
```

### 2. Component Tests

**Purpose**: Test React components with user interactions.

**Location**: `src/components/fba/__tests__/fba-fee-calculator.test.tsx`

**What it tests**:
- Component rendering
- User interactions (form filling, button clicks)
- Form validation
- API integration
- Error handling
- Loading states

**Example**:
```typescript
test('should calculate FBA fees when form is submitted', async () => {
  render(<FBAFeeCalculator />);
  
  fireEvent.change(screen.getByLabelText(/product name/i), {
    target: { value: 'Test Product' }
  });
  
  fireEvent.click(screen.getByRole('button', { name: /calculate/i }));
  
  await waitFor(() => {
    expect(screen.getByText(/total fba fee/i)).toBeInTheDocument();
  });
});
```

### 3. Integration Tests

**Purpose**: Test API endpoints and database interactions.

**Location**: `src/app/api/__tests__/calculate-landed-cost.test.ts`

**What it tests**:
- API request/response handling
- Database operations
- Authentication middleware
- Error responses
- Data validation

**Example**:
```typescript
test('POST /api/core/calculate-landed-cost should return calculated cost', async () => {
  const response = await request(app)
    .post('/api/core/calculate-landed-cost')
    .send({
      productValue: 100,
      dutyRate: 0.1,
      shippingCost: 20
    })
    .expect(200);
    
  expect(response.body.landedCost).toBe(130);
});
```

### 4. End-to-End Tests

**Purpose**: Test complete user workflows in a real browser.

**Location**: `e2e/landed-cost-calculation.spec.ts`

**What it tests**:
- Complete user journeys
- Cross-browser compatibility
- Real API interactions
- UI responsiveness
- Mobile compatibility

**Example**:
```typescript
test('should calculate landed cost end-to-end', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  await page.fill('[data-testid="product-value"]', '100');
  await page.fill('[data-testid="duty-rate"]', '10');
  await page.click('[data-testid="calculate-button"]');
  
  await expect(page.locator('[data-testid="landed-cost"]')).toContainText('110');
});
```

### 5. Performance Tests

**Purpose**: Ensure the application performs well under various conditions.

**Location**: `src/lib/__tests__/performance.test.ts`

**What it tests**:
- Calculation speed
- Memory usage
- Bulk operations
- Concurrent requests
- Large dataset handling

**Example**:
```typescript
test('should calculate landed cost within performance threshold', async () => {
  const startTime = performance.now();
  
  const calculator = new LandedCostCalculator();
  calculator.calculate({ productValue: 100, dutyRate: 0.1 });
  
  const endTime = performance.now();
  expect(endTime - startTime).toBeLessThan(10); // 10ms threshold
});
```

### 6. Security Tests

**Purpose**: Verify security measures and prevent vulnerabilities.

**Location**: `src/lib/__tests__/security.test.ts`

**What it tests**:
- Authentication and authorization
- Input sanitization
- SQL injection prevention
- XSS prevention
- CORS configuration
- Rate limiting

**Example**:
```typescript
test('should reject requests without valid authentication', async () => {
  const response = await request(app)
    .post('/api/core/calculate-landed-cost')
    .send({ productValue: 100 })
    .expect(401);
    
  expect(response.body.error).toBe('Unauthorized');
});
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Playwright Configuration (`playwright.config.ts`)
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

## Test Data and Mocks

### Mock Data (`src/lib/__tests__/test-utils.tsx`)

The test utilities provide:
- Mock product data
- Mock user data
- Mock workspace data
- Mock API responses
- Custom render functions
- Helper utilities

### Supabase Mocking
```typescript
// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    })),
    auth: {
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn()
    }
  }
}));
```

## Coverage Reports

### Generating Coverage
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Coverage Thresholds
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Coverage Exclusions
- Type definition files (`.d.ts`)
- Storybook files (`.stories.ts/.tsx`)
- Configuration files
- Test files themselves

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

## Debugging Tests

### Running Tests in Debug Mode
```bash
# Run specific test file
npx jest src/lib/duty/__tests__/duty-calculator.test.ts

# Run tests in watch mode
npx jest --watch

# Run tests with verbose output
npx jest --verbose

# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Common Issues and Solutions

1. **Tests timing out**
   - Increase timeout: `jest.setTimeout(10000)`
   - Check for unresolved promises
   - Ensure proper cleanup

2. **Mock not working**
   - Verify mock placement
   - Check import paths
   - Clear module cache if needed

3. **Async tests failing**
   - Use `await` properly
   - Use `waitFor` for DOM updates
   - Check for race conditions

## Best Practices

### Writing Good Tests
1. **Descriptive test names**: Clearly describe what is being tested
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Test one thing**: Each test should verify one specific behavior
4. **Use meaningful assertions**: Assert on specific values, not just existence
5. **Clean up**: Ensure tests don't affect each other

### Test Organization
1. **Group related tests**: Use `describe` blocks
2. **Share setup**: Use `beforeEach` for common setup
3. **Isolate tests**: Each test should be independent
4. **Mock external dependencies**: Don't rely on external services

### Performance Considerations
1. **Parallel execution**: Run tests in parallel when possible
2. **Selective testing**: Run only affected tests during development
3. **Efficient mocking**: Mock heavy operations
4. **Resource cleanup**: Prevent memory leaks

## Troubleshooting

### Common Error Messages

1. **"Cannot find module"**
   - Check import paths
   - Verify module name mapping in Jest config
   - Ensure dependencies are installed

2. **"ReferenceError: fetch is not defined"**
   - Add fetch polyfill to Jest setup
   - Use `whatwg-fetch` or similar

3. **"TypeError: Cannot read property of undefined"**
   - Check mock implementations
   - Verify object structure
   - Add proper type checking

### Getting Help

1. **Check test output**: Read error messages carefully
2. **Use debugging tools**: Browser dev tools, Node debugger
3. **Review documentation**: Jest, Playwright, Testing Library docs
4. **Ask for help**: Team members, Stack Overflow, GitHub issues

## Maintenance

### Regular Tasks
1. **Update dependencies**: Keep testing libraries current
2. **Review coverage**: Ensure coverage remains high
3. **Update tests**: When features change, update tests
4. **Performance monitoring**: Watch for test performance degradation
5. **Documentation**: Keep this guide updated

### Test Metrics to Monitor
- Test execution time
- Coverage percentages
- Flaky test frequency
- Test maintenance overhead
- Bug detection rate

---

**Remember**: Good tests are an investment in code quality and developer productivity. They should be maintained with the same care as production code.