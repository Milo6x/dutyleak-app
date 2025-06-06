import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Mock ThemeProvider since next-themes is not installed
const ThemeProvider = ({ children }: { children: React.ReactNode; attribute?: string; defaultTheme?: string }) => {
  return <div data-testid="theme-provider">{children}</div>
}

// Mock data for testing
export const mockProduct = {
  id: '1',
  name: 'Test Product',
  description: 'A test product for unit testing',
  hs_code: '1234567890',
  country_of_origin: 'CN',
  unit_price: 10.50,
  weight: 0.5,
  dimensions: {
    length: 10,
    width: 8,
    height: 5
  },
  category: 'Electronics',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  },
  created_at: '2024-01-01T00:00:00Z'
}

export const mockWorkspace = {
  id: 'workspace-123',
  name: 'Test Workspace',
  owner_id: 'user-123',
  created_at: '2024-01-01T00:00:00Z'
}

export const mockDutyRate = {
  hs_code: '1234567890',
  country: 'US',
  rate: 0.05,
  description: 'Test duty rate',
  effective_date: '2024-01-01'
}

export const mockFBAFee = {
  size_tier: 'small_standard',
  fulfillment_fee: 3.22,
  storage_fee: 0.83,
  referral_fee_rate: 0.15
}

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      {children}
    </ThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Helper functions for testing
export const createMockSupabaseResponse = (data: any, error: any = null) => ({
  data,
  error,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK'
})

export const createMockApiResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data))
})

// Mock fetch for API testing
export const mockFetch = (response: any, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve(createMockApiResponse(response, status))
  ) as jest.Mock
}

// Reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks()
  if (global.fetch && typeof global.fetch === 'function') {
    (global.fetch as jest.Mock).mockClear()
  }
}

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock file for testing file uploads
export const createMockFile = (name = 'test.csv', content = 'test,data\n1,2') => {
  const file = new File([content], name, { type: 'text/csv' })
  return file
}

// Mock CSV data
export const mockCSVData = [
  ['Product Name', 'Description', 'HS Code', 'Country of Origin', 'Unit Price', 'Weight'],
  ['Test Product 1', 'Description 1', '1234567890', 'CN', '10.50', '0.5'],
  ['Test Product 2', 'Description 2', '0987654321', 'US', '25.00', '1.2'],
  ['Test Product 3', 'Description 3', '1122334455', 'DE', '15.75', '0.8']
]

export const mockCSVContent = mockCSVData.map(row => row.join(',')).join('\n')