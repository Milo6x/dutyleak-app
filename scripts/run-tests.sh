#!/bin/bash

# DutyLeak Testing Script
# This script runs all tests and generates comprehensive reports

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js and npm are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Install dependencies if needed
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ ! -d "node_modules" ]; then
        npm install
    else
        print_status "Dependencies already installed"
    fi
}

# Run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    
    if npm run test:unit 2>/dev/null; then
        print_success "Unit tests passed"
    else
        print_warning "Unit tests failed or npm script not found, trying jest directly"
        if npx jest --testPathPattern="__tests__" --coverage; then
            print_success "Unit tests passed (via jest)"
        else
            print_error "Unit tests failed"
            return 1
        fi
    fi
}

# Run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    if npm run test:integration 2>/dev/null; then
        print_success "Integration tests passed"
    else
        print_warning "Integration tests failed or npm script not found, trying jest directly"
        if npx jest --testPathPattern="api.*test" --testTimeout=10000; then
            print_success "Integration tests passed (via jest)"
        else
            print_error "Integration tests failed"
            return 1
        fi
    fi
}

# Run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    if npm run test:performance 2>/dev/null; then
        print_success "Performance tests passed"
    else
        print_warning "Performance tests failed or npm script not found, trying jest directly"
        if npx jest --testPathPattern="performance.test" --testTimeout=30000; then
            print_success "Performance tests passed (via jest)"
        else
            print_error "Performance tests failed"
            return 1
        fi
    fi
}

# Run security tests
run_security_tests() {
    print_status "Running security tests..."
    
    if npm run test:security 2>/dev/null; then
        print_success "Security tests passed"
    else
        print_warning "Security tests failed or npm script not found, trying jest directly"
        if npx jest --testPathPattern="security.test"; then
            print_success "Security tests passed (via jest)"
        else
            print_error "Security tests failed"
            return 1
        fi
    fi
}

# Run end-to-end tests
run_e2e_tests() {
    print_status "Running end-to-end tests..."
    
    # Check if Playwright is installed
    if ! command -v npx playwright &> /dev/null; then
        print_warning "Playwright not found, installing..."
        npx playwright install
    fi
    
    # Start the development server in background
    print_status "Starting development server..."
    npm run dev &
    DEV_SERVER_PID=$!
    
    # Wait for server to start
    print_status "Waiting for server to start..."
    sleep 10
    
    # Check if server is running
    if curl -f http://localhost:3000 &> /dev/null; then
        print_success "Development server is running"
        
        # Run Playwright tests
        if npm run test:e2e 2>/dev/null; then
            print_success "E2E tests passed"
        else
            print_warning "E2E tests failed or npm script not found, trying playwright directly"
            if npx playwright test; then
                print_success "E2E tests passed (via playwright)"
            else
                print_error "E2E tests failed"
                kill $DEV_SERVER_PID 2>/dev/null || true
                return 1
            fi
        fi
        
        # Stop the development server
        kill $DEV_SERVER_PID 2>/dev/null || true
        print_status "Development server stopped"
    else
        print_error "Development server failed to start"
        kill $DEV_SERVER_PID 2>/dev/null || true
        return 1
    fi
}

# Generate test coverage report
generate_coverage() {
    print_status "Generating coverage report..."
    
    if npx jest --coverage --coverageDirectory=coverage; then
        print_success "Coverage report generated in ./coverage directory"
        
        # Display coverage summary
        if [ -f "coverage/lcov-report/index.html" ]; then
            print_status "Coverage report available at: coverage/lcov-report/index.html"
        fi
    else
        print_error "Failed to generate coverage report"
        return 1
    fi
}

# Run linting
run_linting() {
    print_status "Running linting..."
    
    if npm run lint 2>/dev/null; then
        print_success "Linting passed"
    else
        print_warning "Linting failed or npm script not found, trying eslint directly"
        if npx eslint . --ext .ts,.tsx,.js,.jsx; then
            print_success "Linting passed (via eslint)"
        else
            print_error "Linting failed"
            return 1
        fi
    fi
}

# Run type checking
run_type_check() {
    print_status "Running type checking..."
    
    if npm run type-check 2>/dev/null; then
        print_success "Type checking passed"
    else
        print_warning "Type checking failed or npm script not found, trying tsc directly"
        if npx tsc --noEmit; then
            print_success "Type checking passed (via tsc)"
        else
            print_error "Type checking failed"
            return 1
        fi
    fi
}

# Main execution
main() {
    print_status "Starting DutyLeak test suite..."
    
    # Parse command line arguments
    SKIP_E2E=false
    SKIP_DEPS=false
    COVERAGE_ONLY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-e2e)
                SKIP_E2E=true
                shift
                ;;
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --coverage-only)
                COVERAGE_ONLY=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --skip-e2e      Skip end-to-end tests"
                echo "  --skip-deps     Skip dependency installation"
                echo "  --coverage-only Only generate coverage report"
                echo "  --help          Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Check dependencies
    check_dependencies
    
    # Install dependencies if not skipped
    if [ "$SKIP_DEPS" = false ]; then
        install_dependencies
    fi
    
    if [ "$COVERAGE_ONLY" = true ]; then
        generate_coverage
        exit 0
    fi
    
    # Run all test suites
    TEST_RESULTS=()
    
    # Unit tests
    if run_unit_tests; then
        TEST_RESULTS+=("Unit: PASSED")
    else
        TEST_RESULTS+=("Unit: FAILED")
    fi
    
    # Integration tests
    if run_integration_tests; then
        TEST_RESULTS+=("Integration: PASSED")
    else
        TEST_RESULTS+=("Integration: FAILED")
    fi
    
    # Performance tests
    if run_performance_tests; then
        TEST_RESULTS+=("Performance: PASSED")
    else
        TEST_RESULTS+=("Performance: FAILED")
    fi
    
    # Security tests
    if run_security_tests; then
        TEST_RESULTS+=("Security: PASSED")
    else
        TEST_RESULTS+=("Security: FAILED")
    fi
    
    # Linting
    if run_linting; then
        TEST_RESULTS+=("Linting: PASSED")
    else
        TEST_RESULTS+=("Linting: FAILED")
    fi
    
    # Type checking
    if run_type_check; then
        TEST_RESULTS+=("Type Check: PASSED")
    else
        TEST_RESULTS+=("Type Check: FAILED")
    fi
    
    # E2E tests (if not skipped)
    if [ "$SKIP_E2E" = false ]; then
        if run_e2e_tests; then
            TEST_RESULTS+=("E2E: PASSED")
        else
            TEST_RESULTS+=("E2E: FAILED")
        fi
    else
        TEST_RESULTS+=("E2E: SKIPPED")
    fi
    
    # Generate coverage report
    if generate_coverage; then
        TEST_RESULTS+=("Coverage: GENERATED")
    else
        TEST_RESULTS+=("Coverage: FAILED")
    fi
    
    # Print summary
    echo ""
    print_status "Test Summary:"
    echo "============================================"
    
    FAILED_COUNT=0
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $result == *"FAILED"* ]]; then
            print_error "  $result"
            ((FAILED_COUNT++))
        elif [[ $result == *"PASSED"* ]] || [[ $result == *"GENERATED"* ]]; then
            print_success "  $result"
        else
            print_warning "  $result"
        fi
    done
    
    echo "============================================"
    
    if [ $FAILED_COUNT -eq 0 ]; then
        print_success "All tests completed successfully!"
        exit 0
    else
        print_error "$FAILED_COUNT test suite(s) failed"
        exit 1
    fi
}

# Run main function
main "$@"