import HSCodeValidator, { ValidationContext } from './hs-code-validation'
import ClassificationEngine, { BusinessLogicContext } from '../business-logic/classification-engine'
import TradeComplianceChecker, { ComplianceCheck } from '../compliance/trade-compliance'
import ConfidenceThresholdManager from '../confidence/threshold-manager'

/**
 * Test suite for validation rules and business logic
 */
export class ValidationTestSuite {
  private validator: HSCodeValidator
  private businessEngine: ClassificationEngine
  private complianceChecker: TradeComplianceChecker
  private confidenceManager: ConfidenceThresholdManager

  constructor() {
    this.validator = new HSCodeValidator()
    this.businessEngine = new ClassificationEngine()
    this.complianceChecker = new TradeComplianceChecker()
    this.confidenceManager = new ConfidenceThresholdManager()
  }

  /**
   * Test HS code format validation
   */
  async testHSCodeValidation(): Promise<void> {
    console.log('Testing HS Code Validation...')
    
    const testCases = [
      {
        context: {
          hsCode: '8517.12.00',
          productDescription: 'Smartphone',
          productCategory: 'Electronics',
          confidence: 85
        } as ValidationContext,
        expected: { valid: true, score: 85 }
      },
      {
        context: {
          hsCode: '1234.56.78',
          productDescription: 'Invalid product',
          productCategory: 'Unknown',
          confidence: 50
        } as ValidationContext,
        expected: { valid: false, score: 0 }
      },
      {
        context: {
          hsCode: '6203.42.40',
          productDescription: 'Cotton trousers',
          productCategory: 'Textiles',
          confidence: 90
        } as ValidationContext,
        expected: { valid: true, score: 90 }
      }
    ]

    for (const testCase of testCases) {
      const result = await this.validator.validateHSCode(testCase.context)
      console.log(`HS Code: ${testCase.context.hsCode}`)
      console.log(`Valid: ${result.errors.length === 0}`)
      console.log(`Score: ${result.score}`)
      console.log(`Warnings: ${result.warnings.length}`)
      console.log('---')
    }
  }

  /**
   * Test business logic classification
   */
  async testBusinessLogic(): Promise<void> {
    console.log('Testing Business Logic...')
    
    const businessContext: BusinessLogicContext = {
      productDescription: 'Apple iPhone 15 Pro smartphone with 256GB storage',
      productName: 'iPhone 15 Pro',
      productCategory: 'Electronics',
      originCountry: 'CN',
      destinationCountry: 'US',
      value: 1200,
      weight: 0.2,
      materials: ['aluminum', 'glass', 'silicon'],
      manufacturer: 'Apple Inc.',
      brandName: 'Apple',
      intendedUse: 'personal communication'
    }

    const aiSuggestions = [
      {
        hsCode: '8517.12.00',
        confidence: 92,
        reasoning: 'Smartphone classification based on cellular communication capability'
      },
      {
        hsCode: '8471.30.01',
        confidence: 75,
        reasoning: 'Portable digital automatic data processing machine'
      }
    ]

    const decision = await this.businessEngine.processClassification(
      businessContext,
      aiSuggestions
    )

    console.log('Business Decision:')
    console.log(`Selected HS Code: ${decision.hsCode}`)
    console.log(`Confidence: ${decision.confidence}`)
    console.log(`Source: ${decision.source}`)
    console.log(`Reasoning: ${decision.reasoning}`)
    console.log(`Flags: ${decision.flags.length}`)
    console.log('---')
  }

  /**
   * Test trade compliance checking
   */
  async testTradeCompliance(): Promise<void> {
    console.log('Testing Trade Compliance...')
    
    const complianceChecks = [
      {
        hsCode: '8517.12.00',
        originCountry: 'CN',
        destinationCountry: 'US',
        productValue: 1200,
        productWeight: 0.2,
        intendedUse: 'personal use'
      } as ComplianceCheck,
      {
        hsCode: '2710.12.25',
        originCountry: 'RU',
        destinationCountry: 'US',
        productValue: 50000,
        productWeight: 1000,
        intendedUse: 'commercial'
      } as ComplianceCheck
    ]

    for (const check of complianceChecks) {
      const result = await this.complianceChecker.checkCompliance(check)
      console.log(`HS Code: ${check.hsCode}`)
      console.log(`Route: ${check.originCountry} → ${check.destinationCountry}`)
      console.log(`Compliant: ${result.compliant}`)
      console.log(`Risk Level: ${result.riskLevel}`)
      console.log(`Warnings: ${result.warnings.length}`)
      console.log(`Requirements: ${result.requirements.length}`)
      if (result.estimatedDutyRate) {
        console.log(`Estimated Duty: ${result.estimatedDutyRate}%`)
      }
      console.log('---')
    }
  }

  /**
   * Test confidence threshold management
   */
  async testConfidenceThresholds(): Promise<void> {
    console.log('Testing Confidence Thresholds...')
    
    const testScenarios = [
      {
        aiConfidence: 95,
        validationScore: 90,
        businessScore: 88,
        context: {
          productDescription: 'Well-documented smartphone',
          category: 'Electronics',
          productValue: 800
        }
      },
      {
        aiConfidence: 65,
        validationScore: 70,
        businessScore: 60,
        context: {
          productDescription: 'Ambiguous electronic device',
          category: 'Electronics',
          productValue: 200
        }
      },
      {
        aiConfidence: 45,
        validationScore: 40,
        businessScore: 50,
        context: {
          productDescription: 'Unknown product type',
          category: 'Other',
          productValue: 100
        }
      }
    ]

    for (const scenario of testScenarios) {
      const assessment = await this.confidenceManager.assessConfidence(
        scenario.aiConfidence,
        scenario.validationScore,
        scenario.businessScore,
        scenario.context
      )

      const thresholds = await this.confidenceManager.evaluateThresholds(
        assessment.finalScore,
        {
          category: scenario.context.category,
          productValue: scenario.context.productValue
        }
      )

      console.log(`AI: ${scenario.aiConfidence}%, Validation: ${scenario.validationScore}%, Business: ${scenario.businessScore}%`)
      console.log(`Final Score: ${assessment.finalScore}%`)
      console.log(`Thresholds Triggered: ${thresholds.filter(t => t.triggered).length}/${thresholds.length}`)
      console.log(`Reliability: ${assessment.reliability}`)
      console.log('---')
    }
  }

  /**
   * Run comprehensive test suite
   */
  async runAllTests(): Promise<void> {
    console.log('=== Validation Rules and Business Logic Test Suite ===')
    console.log('')

    try {
      await this.testHSCodeValidation()
      await this.testBusinessLogic()
      await this.testTradeCompliance()
      await this.testConfidenceThresholds()
      
      console.log('=== All Tests Completed Successfully ===')
    } catch (error) {
      console.error('Test suite failed:', error)
      throw error
    }
  }

  /**
   * Test integration of all components
   */
  async testIntegration(): Promise<void> {
    console.log('Testing Full Integration...')
    
    const testProduct = {
      productDescription: 'Samsung Galaxy S24 Ultra smartphone with 512GB storage, titanium frame',
      productName: 'Galaxy S24 Ultra',
      productCategory: 'Electronics',
      originCountry: 'KR',
      destinationCountry: 'US',
      value: 1400,
      weight: 0.25,
      materials: ['titanium', 'glass', 'silicon'],
      manufacturer: 'Samsung Electronics',
      brandName: 'Samsung',
      intendedUse: 'personal communication'
    }

    // Step 1: Validation
    const validationContext: ValidationContext = {
      hsCode: '8517.12.00',
      productDescription: testProduct.productDescription,
      productCategory: testProduct.productCategory,
      originCountry: testProduct.originCountry,
      destinationCountry: testProduct.destinationCountry,
      confidence: 90
    }
    
    const validationResult = await this.validator.validateHSCode(validationContext)
    
    // Step 2: Business Logic
    const businessDecision = await this.businessEngine.processClassification(
      testProduct,
      [{
        hsCode: '8517.12.00',
        confidence: 90,
        reasoning: 'Smartphone with cellular capability'
      }]
    )
    
    // Step 3: Compliance
    const complianceResult = await this.complianceChecker.checkCompliance({
      hsCode: businessDecision.hsCode,
      originCountry: testProduct.originCountry,
      destinationCountry: testProduct.destinationCountry,
      productValue: testProduct.value,
      productWeight: testProduct.weight,
      intendedUse: testProduct.intendedUse
    })
    
    // Step 4: Confidence Assessment
    const confidenceAssessment = await this.confidenceManager.assessConfidence(
      90,
      validationResult.score,
      businessDecision.confidence,
      {
        productDescription: testProduct.productDescription,
        category: testProduct.productCategory,
        productValue: testProduct.value
      }
    )

    console.log('=== Integration Test Results ===')
    console.log(`Product: ${testProduct.productName}`)
    console.log(`Final HS Code: ${businessDecision.hsCode}`)
    console.log(`Validation Score: ${validationResult.score}%`)
    console.log(`Business Confidence: ${businessDecision.confidence}%`)
    console.log(`Final Confidence: ${confidenceAssessment.finalScore}%`)
    console.log(`Compliance: ${complianceResult.compliant ? 'PASS' : 'FAIL'}`)
    console.log(`Risk Level: ${complianceResult.riskLevel}`)
    console.log(`Reliability: ${confidenceAssessment.reliability}`)
    console.log('================================')
  }
}

// Export for use in other files
export default ValidationTestSuite