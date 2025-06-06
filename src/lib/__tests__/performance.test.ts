import { performance } from 'perf_hooks'
import { LandedCostCalculator } from '../duty/landed-cost-calculator'
import { mockProduct, createMockSupabaseResponse } from './test-utils'

// Mock Supabase for performance tests
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(createMockSupabaseResponse({ id: 'test' })),
    })),
  },
}))

describe('Performance Tests', () => {
  describe('Landed Cost Calculator Performance', () => {
    it('should calculate landed cost within 10ms for single product', () => {
      const calculator = new LandedCostCalculator({
        productValue: 100,
        dutyPercentage: 5,
        vatPercentage: 21,
        shippingCost: 15,
        insuranceCost: 0
      })

      const startTime = performance.now()
      const result = calculator.calculate()
      const endTime = performance.now()

      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(10) // Should complete within 10ms
      expect(result.totalLandedCost).toBeGreaterThan(0)
    })

    it('should handle bulk calculations efficiently', () => {
      const products = Array.from({ length: 1000 }, (_, i) => ({
        productValue: 50 + i,
        dutyPercentage: 5 + (i * 0.1),
        vatPercentage: 21,
        shippingCost: 10 + (i * 0.01),
        insuranceCost: 0
      }))

      const startTime = performance.now()
      
      const results = products.map(product => {
        const calculator = new LandedCostCalculator(product)
        return calculator.calculate()
      })

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(executionTime).toBeLessThan(1000) // Should complete 1000 calculations within 1 second
      expect(results).toHaveLength(1000)
      expect(results.every(result => result.totalLandedCost > 0)).toBe(true)
    })

    it('should maintain consistent performance with complex calculations', () => {
      const complexCalculations = Array.from({ length: 100 }, (_, i) => {
        const calculator = new LandedCostCalculator({
          productValue: 1000 + (i * 10),
          dutyPercentage: 5 + (i * 0.1),
          vatPercentage: 21,
          shippingCost: 50 + (i * 0.5),
          insuranceCost: 0,
          fbaFeeAmount: 3.22 + (i * 0.01)
        })

        const startTime = performance.now()
        const result = calculator.calculate()
        const endTime = performance.now()

        return {
          result,
          executionTime: endTime - startTime
        }
      })

      const averageTime = complexCalculations.reduce((sum, calc) => sum + calc.executionTime, 0) / complexCalculations.length
      const maxTime = Math.max(...complexCalculations.map(calc => calc.executionTime))

      expect(averageTime).toBeLessThan(5) // Average should be under 5ms
      expect(maxTime).toBeLessThan(20) // No single calculation should exceed 20ms
    })
  })

  describe('Memory Usage Tests', () => {
    it('should not cause memory leaks with repeated calculations', () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Perform many calculations
      for (let i = 0; i < 10000; i++) {
        const calculator = new LandedCostCalculator({
          productValue: 100 + i,
          dutyPercentage: 5,
          vatPercentage: 21,
          shippingCost: 0,
          insuranceCost: 0
        })
        calculator.calculate()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should handle large datasets without excessive memory usage', () => {
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: `product-${i}`,
        name: `Product ${i}`,
        value: 50 + (i * 0.1),
        dutyRate: 0.05 + (i * 0.0001),
        calculations: []
      }))

      const startMemory = process.memoryUsage().heapUsed

      // Process the large dataset
      largeDataset.forEach(product => {
        const calculator = new LandedCostCalculator({
          productValue: product.value,
          dutyPercentage: product.dutyRate * 100,
          vatPercentage: 21,
          shippingCost: 0,
          insuranceCost: 0
        })
        product.calculations.push(calculator.calculate())
      })

      const endMemory = process.memoryUsage().heapUsed
      const memoryUsed = endMemory - startMemory

      // Should not use more than 100MB for 5000 products
      expect(memoryUsed).toBeLessThan(100 * 1024 * 1024)
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent calculations efficiently', async () => {
      const concurrentCalculations = Array.from({ length: 50 }, (_, i) => {
        return new Promise<{ result: any; time: number }>((resolve) => {
          const startTime = performance.now()
          
          const calculator = new LandedCostCalculator({
            productValue: 100 + i,
            dutyPercentage: 5,
            vatPercentage: 21,
            shippingCost: 15,
            insuranceCost: 0
          })
          
          const result = calculator.calculate()
          const endTime = performance.now()
          
          resolve({
            result,
            time: endTime - startTime
          })
        })
      })

      const startTime = performance.now()
      const results = await Promise.all(concurrentCalculations)
      const totalTime = performance.now() - startTime

      expect(totalTime).toBeLessThan(100) // All 50 concurrent calculations should complete within 100ms
      expect(results).toHaveLength(50)
      expect(results.every(r => r.result.totalLandedCost > 0)).toBe(true)
    })
  })

  describe('Data Processing Performance', () => {
    it('should process CSV data efficiently', () => {
      const csvData = Array.from({ length: 1000 }, (_, i) => 
        `Product ${i},Description ${i},123456789${i % 10},CN,${50 + i},${0.5 + (i * 0.001)}`
      ).join('\n')

      const startTime = performance.now()
      
      // Simulate CSV parsing and processing
      const lines = csvData.split('\n')
      const products = lines.map(line => {
        const [name, description, hsCode, country, price, weight] = line.split(',')
        return {
          name,
          description,
          hsCode,
          country,
          price: parseFloat(price),
          weight: parseFloat(weight)
        }
      })

      // Process each product
      const calculations = products.map(product => {
        const calculator = new LandedCostCalculator({
          productValue: product.price,
          dutyPercentage: 5,
          vatPercentage: 21,
          shippingCost: 0,
          insuranceCost: 0
        })
        return calculator.calculate()
      })

      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(processingTime).toBeLessThan(2000) // Should process 1000 products within 2 seconds
      expect(calculations).toHaveLength(1000)
    })

    it('should handle large JSON responses efficiently', () => {
      const largeResponse = {
        products: Array.from({ length: 2000 }, (_, i) => ({
          id: `product-${i}`,
          name: `Product ${i}`,
          calculations: Array.from({ length: 10 }, (_, j) => ({
            id: `calc-${i}-${j}`,
            totalLandedCost: 100 + (i * j),
            dutyAmount: 5 + (i * 0.1),
            createdAt: new Date().toISOString()
          }))
        }))
      }

      const startTime = performance.now()
      
      // Simulate JSON processing
      const jsonString = JSON.stringify(largeResponse)
      const parsed = JSON.parse(jsonString)
      
      // Process the data
      const totalCalculations = parsed.products.reduce((sum: number, product: any) => {
        return sum + product.calculations.length
      }, 0)

      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(processingTime).toBeLessThan(500) // Should process large JSON within 500ms
      expect(totalCalculations).toBe(20000) // 2000 products * 10 calculations each
    })
  })

  describe('Algorithm Efficiency', () => {
    it('should scale linearly with input size', () => {
      const testSizes = [100, 500, 1000, 2000]
      const results: { size: number; time: number }[] = []

      testSizes.forEach(size => {
        const startTime = performance.now()
        
        for (let i = 0; i < size; i++) {
          const calculator = new LandedCostCalculator({
            productValue: 100 + i,
            dutyPercentage: 5,
            vatPercentage: 21,
            shippingCost: 0,
            insuranceCost: 0
          })
          calculator.calculate()
        }
        
        const endTime = performance.now()
        results.push({ size, time: endTime - startTime })
      })

      // Check that time scales roughly linearly
      const timeRatios = []
      for (let i = 1; i < results.length; i++) {
        const sizeRatio = results[i].size / results[i-1].size
        const timeRatio = results[i].time / results[i-1].time
        timeRatios.push(timeRatio / sizeRatio)
      }

      // Time ratio should be close to size ratio (linear scaling)
      // Allow some variance due to system overhead
      timeRatios.forEach(ratio => {
        expect(ratio).toBeGreaterThan(0.5)
        expect(ratio).toBeLessThan(3.0)
      })
    })

    it('should maintain performance with complex duty calculations', () => {
      const complexScenarios = [
        { dutyPercentage: 5, vatPercentage: 21, complexity: 'simple' },
        { dutyPercentage: 15, vatPercentage: 25, complexity: 'compound' },
        { dutyPercentage: 8, vatPercentage: 19, complexity: 'complex' }
      ]

      const performanceResults = complexScenarios.map(scenario => {
        const startTime = performance.now()
        
        for (let i = 0; i < 1000; i++) {
          const calculator = new LandedCostCalculator({
            productValue: 100 + i,
            dutyPercentage: scenario.dutyPercentage,
            vatPercentage: scenario.vatPercentage,
            shippingCost: 15,
            insuranceCost: 0
          })
          calculator.calculate()
        }
        
        const endTime = performance.now()
        return {
          complexity: scenario.complexity,
          time: endTime - startTime
        }
      })

      // All scenarios should complete within reasonable time
      performanceResults.forEach(result => {
        expect(result.time).toBeLessThan(1000) // 1000 calculations within 1 second
      })

      // Complex calculations shouldn't be significantly slower
      const simpleTime = performanceResults.find(r => r.complexity === 'simple')?.time || 0
      const complexTime = performanceResults.find(r => r.complexity === 'complex')?.time || 0
      
      if (simpleTime > 0 && complexTime > 0) {
        const slowdownRatio = complexTime / simpleTime
        expect(slowdownRatio).toBeLessThan(2.0) // Complex calculations shouldn't be more than 2x slower
      }
    })
  })
})