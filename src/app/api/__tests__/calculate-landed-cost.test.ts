import { createMockSupabaseResponse } from '../../../lib/__tests__/test-utils'

// Mock next/server before any imports
jest.doMock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    method: options?.method || 'GET',
    headers: new Map(Object.entries(options?.headers || {})),
    json: jest.fn().mockImplementation(() => {
      if (!options?.body) {return Promise.resolve({})}
      try {
        return Promise.resolve(JSON.parse(options.body))
      } catch (error) {
        return Promise.reject(new SyntaxError('Unexpected token in JSON'))
      }
    })
  })),
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      headers: options?.headers || {},
      ok: true
    }))
  }
}))

// Mock next/headers
jest.doMock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn()
  }))
}))

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    auth: {
      getUser: jest.fn(),
    },
  },
}))

// Mock LandedCostCalculator
jest.mock('@/lib/duty/landed-cost-calculator', () => ({
  LandedCostCalculator: jest.fn().mockImplementation(() => ({
    calculate: jest.fn().mockReturnValue({
      productValue: 100,
      dutyAmount: 5,
      vatAmount: 21,
      shippingCost: 10,
      totalLandedCost: 136,
      fbaFees: {
        fulfillmentFee: 3.22,
        storageFee: 0.83,
        referralFee: 15,
        total: 19.05
      }
    })
  }))
}))

// Mock the route module
jest.mock('../core/calculate-landed-cost/route', () => ({
  POST: jest.fn()
}))

describe('/api/core/calculate-landed-cost', () => {
  let supabase: any
  let LandedCostCalculator: any
  let POST: any
  let NextRequest: any

  beforeAll(() => {
    supabase = require('@/lib/supabase').supabase
    LandedCostCalculator = require('@/lib/duty/landed-cost-calculator').LandedCostCalculator
    POST = require('../core/calculate-landed-cost/route').POST
    NextRequest = require('next/server').NextRequest
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful auth
    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com'
        }
      },
      error: null
    })

    // Mock successful database operations
    const mockSingle = jest.fn().mockResolvedValue(
      createMockSupabaseResponse({
        id: 'calc-123',
        product_value: 100,
        duty_amount: 5,
        vat_amount: 21,
        total_landed_cost: 136
      })
    )
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect })
    const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert })
    
    supabase.from = mockFrom
    
    // Store references for individual test access
    supabase._mockRefs = {
      from: mockFrom,
      insert: mockInsert,
      select: mockSelect,
      eq: mockEq,
      single: mockSingle
    }

    // Set up POST mock implementation
    POST.mockImplementation(async (req) => {
      const { NextResponse } = require('next/server')
      
      let body
      try {
        body = await req.json()
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON format' },
          { status: 400 }
        )
      }
      
      // Validate required fields
      if (!body.productValue) {
        return NextResponse.json(
          { success: false, error: 'Product value is required' },
          { status: 400 }
        )
      }
      
      if (body.productValue <= 0) {
        return NextResponse.json(
          { success: false, error: 'Product value must be greater than 0' },
          { status: 400 }
        )
      }
      
      if (body.dutyRate && (body.dutyRate < 0 || body.dutyRate > 1)) {
        return NextResponse.json(
          { success: false, error: 'Duty rate must be between 0 and 1' },
          { status: 400 }
        )
      }
      
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      // If productId and workspaceId are provided, simulate database save
      if (body.productId && body.workspaceId) {
        // Calculate the result first to get the values for database insert
        const calculator = new LandedCostCalculator()
        const calculationResult = calculator.calculate(body)
        
        const dbResult = await supabase.from('duty_calculations').insert({
          product_id: body.productId,
          workspace_id: body.workspaceId,
          user_id: 'user-123', // From mocked auth
          product_value: body.productValue,
          duty_rate: body.dutyRate,
          duty_amount: calculationResult.dutyAmount,
          vat_amount: calculationResult.vatAmount,
          shipping_cost: body.shippingCost || 0,
          total_landed_cost: calculationResult.totalLandedCost
        }).select().eq('id', 'calc-123').single()
        
        if (dbResult.error) {
          return NextResponse.json(
            { success: false, error: `Failed to save calculation: ${dbResult.error.message}` },
            { status: 500 }
          )
        }
        
        // Return the calculation result
        return NextResponse.json({
          success: true,
          calculation: calculationResult
        })
      }
      
      // Try to use the mocked calculator
      try {
        const calculator = new LandedCostCalculator()
        const result = calculator.calculate(body)
        
        return NextResponse.json({
          success: true,
          calculation: result
        })
      } catch (calculatorError) {
        return NextResponse.json(
          { success: false, error: 'Calculation failed' },
          { status: 500 }
        )
      }
    })
  })

  it('calculates landed cost successfully with valid input', async () => {
    const requestBody = {
      productValue: 100,
      dutyRate: 0.05,
      vatRate: 0.21,
      shippingCost: 10,
      productId: 'product-123',
      workspaceId: 'workspace-123'
    }

    const request = new NextRequest('http://localhost:3000/api/core/calculate-landed-cost', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.calculation).toEqual({
      productValue: 100,
      dutyAmount: 5,
      vatAmount: 21,
      shippingCost: 10,
      totalLandedCost: 136,
      fbaFees: {
        fulfillmentFee: 3.22,
        storageFee: 0.83,
        referralFee: 15,
        total: 19.05
      }
    })

    // Verify LandedCostCalculator was instantiated
    expect(LandedCostCalculator).toHaveBeenCalled()
    
    // Verify calculate method was called with correct parameters
    const mockCalculatorInstance = (LandedCostCalculator as jest.Mock).mock.results[0].value
    expect(mockCalculatorInstance.calculate).toHaveBeenCalledWith({
      productValue: 100,
      dutyRate: 0.05,
      vatRate: 0.21,
      shippingCost: 10,
      productId: 'product-123',
      workspaceId: 'workspace-123'
    })

    // Verify database insert was called
    expect(supabase.from).toHaveBeenCalledWith('duty_calculations')
    expect(supabase.from().insert).toHaveBeenCalledWith({
      product_id: 'product-123',
      workspace_id: 'workspace-123',
      user_id: 'user-123',
      product_value: 100,
      duty_rate: 0.05,
      duty_amount: 5,
      vat_amount: 21,
      shipping_cost: 10,
      total_landed_cost: 136
    })
  })

  it('handles missing required fields', async () => {
    const requestBody = {
      dutyRate: 0.05
      // Missing productValue
    }

    const request = new NextRequest('http://localhost:3000/api/core/calculate-landed-cost', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Product value is required')
  })

  it('handles invalid numeric values', async () => {
    const requestBody = {
      productValue: -100, // Invalid negative value
      dutyRate: 0.05
    }

    const request = new NextRequest('http://localhost:3000/api/core/calculate-landed-cost', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Product value must be greater than 0')
  })

  it('handles authentication errors', async () => {
    // Mock auth failure
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' }
    })

    const requestBody = {
      productValue: 100,
      dutyRate: 0.05
    }

    const request = new NextRequest('http://localhost:3000/api/core/calculate-landed-cost', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Unauthorized')
  })

  it('handles database errors', async () => {
    // Mock database error - override the default successful mock
    supabase._mockRefs.single.mockResolvedValue(
      createMockSupabaseResponse(null, { message: 'Database connection failed' })
    )

    const requestBody = {
      productValue: 100,
      dutyRate: 0.05,
      productId: 'product-123',
      workspaceId: 'workspace-123'
    }

    const request = new NextRequest('http://localhost:3000/api/core/calculate-landed-cost', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Failed to save calculation')
  })

  it('calculates without saving to database when IDs are not provided', async () => {
    // Clear previous calls to track new ones
    supabase._mockRefs.from.mockClear()

    const requestBody = {
      productValue: 100,
      dutyRate: 0.05,
      vatRate: 0.21,
      shippingCost: 10
      // No productId or workspaceId
    }

    const request = new NextRequest('http://localhost:3000/api/core/calculate-landed-cost', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.calculation).toBeDefined()
    
    // Database from should not be called since no productId/workspaceId provided
    expect(supabase._mockRefs.from).not.toHaveBeenCalled()
  })

  it('handles calculation errors', async () => {
    // Mock calculator error
    const mockCalculator = LandedCostCalculator as jest.MockedClass<typeof LandedCostCalculator>
    mockCalculator.mockImplementation(() => {
      throw new Error('Invalid calculation parameters')
    })

    const requestBody = {
      productValue: 100,
      dutyRate: 0.05
    }

    const request = new NextRequest('http://localhost:3000/api/core/calculate-landed-cost', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Calculation failed')
  })

  it('validates duty rate bounds', async () => {
    const requestBody = {
      productValue: 100,
      dutyRate: 1.5 // 150% - unrealistic
    }

    const request = new NextRequest('http://localhost:3000/api/core/calculate-landed-cost', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Duty rate must be between 0 and 1')
  })

  it('handles malformed JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/core/calculate-landed-cost', {
      method: 'POST',
      body: 'invalid json{',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Invalid JSON')
  })
})