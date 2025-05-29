import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandedCostCalculator } from '../landed-cost-calculator';

describe('LandedCostCalculator', () => {
  it('should calculate landed cost correctly with all values provided', () => {
    const calculator = new LandedCostCalculator({
      productValue: 1000,
      shippingCost: 100,
      insuranceCost: 50,
      dutyPercentage: 5,
      vatPercentage: 20
    });
    
    const result = calculator.calculate();
    
    // Dutyable value = 1000 + 100 + 50 = 1150
    // Duty amount = 1150 * 5% = 57.5
    // Vatable value = 1150 + 57.5 = 1207.5
    // VAT amount = 1207.5 * 20% = 241.5
    // Total landed cost = 1150 + 57.5 + 241.5 = 1449
    // Effective duty rate = (57.5 / 1000) * 100 = 5.75%
    
    expect(result.dutyAmount).toEqual(57.5);
    expect(result.vatAmount).toEqual(241.5);
    expect(result.totalLandedCost).toEqual(1449);
    expect(result.effectiveDutyRate).toEqual(5.75);
    
    expect(result.breakdown).toEqual({
      productValue: 1000,
      shippingCost: 100,
      insuranceCost: 50,
      dutyableValue: 1150,
      dutyAmount: 57.5,
      vatableValue: 1207.5,
      vatAmount: 241.5
    });
  });
  
  it('should handle zero duty and VAT rates', () => {
    const calculator = new LandedCostCalculator({
      productValue: 1000,
      shippingCost: 100,
      insuranceCost: 50,
      dutyPercentage: 0,
      vatPercentage: 0
    });
    
    const result = calculator.calculate();
    
    expect(result.dutyAmount).toEqual(0);
    expect(result.vatAmount).toEqual(0);
    expect(result.totalLandedCost).toEqual(1150);
    expect(result.effectiveDutyRate).toEqual(0);
  });
  
  it('should handle missing optional values', () => {
    const calculator = new LandedCostCalculator({
      productValue: 1000,
      shippingCost: 0,
      insuranceCost: 0,
      dutyPercentage: 5,
      vatPercentage: 20
    });
    
    const result = calculator.calculate();
    
    // Dutyable value = 1000 + 0 + 0 = 1000
    // Duty amount = 1000 * 5% = 50
    // Vatable value = 1000 + 50 = 1050
    // VAT amount = 1050 * 20% = 210
    // Total landed cost = 1000 + 50 + 210 = 1260
    
    expect(result.dutyAmount).toEqual(50);
    expect(result.vatAmount).toEqual(210);
    expect(result.totalLandedCost).toEqual(1260);
  });
  
  it('should round values to 2 decimal places', () => {
    const calculator = new LandedCostCalculator({
      productValue: 1000.33,
      shippingCost: 100.44,
      insuranceCost: 50.55,
      dutyPercentage: 5.123,
      vatPercentage: 20.456
    });
    
    const result = calculator.calculate();
    
    // Check that all monetary values are rounded to 2 decimal places
    expect(Number.isInteger(result.dutyAmount * 100)).toBe(true);
    expect(Number.isInteger(result.vatAmount * 100)).toBe(true);
    expect(Number.isInteger(result.totalLandedCost * 100)).toBe(true);
    expect(Number.isInteger(result.effectiveDutyRate * 100)).toBe(true);
    
    expect(Number.isInteger(result.breakdown.dutyableValue * 100)).toBe(true);
    expect(Number.isInteger(result.breakdown.dutyAmount * 100)).toBe(true);
    expect(Number.isInteger(result.breakdown.vatableValue * 100)).toBe(true);
    expect(Number.isInteger(result.breakdown.vatAmount * 100)).toBe(true);
  });
});
