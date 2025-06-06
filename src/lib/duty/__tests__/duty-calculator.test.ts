import { LandedCostCalculator } from '../landed-cost-calculator';
import type { LandedCostCalculatorOptions, BasicLandedCostResult } from '../landed-cost-calculator';

describe('LandedCostCalculator', () => {
  describe('Basic Calculation', () => {
    test('should calculate basic landed cost correctly', () => {
      const options: LandedCostCalculatorOptions = {
        productValue: 100,
        shippingCost: 20,
        insuranceCost: 5,
        dutyPercentage: 0.1, // 10%
        vatPercentage: 0.2, // 20%
        fbaFeeAmount: 15
      };

      const calculator = new LandedCostCalculator(options);
      const result: BasicLandedCostResult = calculator.calculate();

      expect(result).toBeDefined();
      expect(result.totalLandedCost).toBeGreaterThan(100);
      expect(result.dutyAmount).toBeGreaterThanOrEqual(0);
      expect(result.vatAmount).toBeGreaterThanOrEqual(0);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.productValue).toBe(100);
    });

    test('should handle minimal input', () => {
      const options: LandedCostCalculatorOptions = {
        productValue: 50,
        shippingCost: 0,
        insuranceCost: 0,
        dutyPercentage: 0.05, // 5%
        vatPercentage: 0
      };

      const calculator = new LandedCostCalculator(options);
      const result = calculator.calculate();

      expect(result).toBeDefined();
      expect(result.totalLandedCost).toBeGreaterThanOrEqual(50);
      expect(result.breakdown.productValue).toBe(50);
    });

    test('should handle zero duty and VAT', () => {
      const options: LandedCostCalculatorOptions = {
        productValue: 100,
        shippingCost: 10,
        insuranceCost: 0,
        dutyPercentage: 0,
        vatPercentage: 0
      };

      const calculator = new LandedCostCalculator(options);
      const result = calculator.calculate();

      expect(result).toBeDefined();
      expect(result.dutyAmount).toBe(0);
      expect(result.vatAmount).toBe(0);
      expect(result.totalLandedCost).toBe(110); // 100 + 10 shipping
    });

    test('should include proper breakdown structure', () => {
      const options: LandedCostCalculatorOptions = {
        productValue: 200,
        shippingCost: 30,
        insuranceCost: 10,
        dutyPercentage: 0.15, // 15%
        vatPercentage: 0.25, // 25%
        fbaFeeAmount: 20
      };

      const calculator = new LandedCostCalculator(options);
      const result = calculator.calculate();

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.productValue).toBe(200);
      expect(result.breakdown.shippingCost).toBe(30);
      expect(result.breakdown.insuranceCost).toBe(10);
      expect(result.breakdown.dutyAmount).toBeGreaterThan(0);
      expect(result.breakdown.vatAmount).toBeGreaterThan(0);
      expect(result.breakdown.fbaFeeAmount).toBe(20);
    });
  });
});