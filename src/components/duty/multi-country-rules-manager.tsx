'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalculatorIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface DutyRule {
  id: string
  classification_id: string
  country_code: string
  origin_country_code?: string
  duty_percentage: number
  vat_percentage: number
  trade_agreement?: string
  preferential_rate?: number
  additional_fees: Record<string, any>
  rule_source: 'manual' | 'api' | 'ml' | 'government'
  confidence_score: number
  effective_date: string
  expiry_date?: string
  notes?: string
  hs6?: string
  hs8?: string
  classification_description?: string
  country_name?: string
  tax_rate?: number
  tax_type?: string
  tax_name?: string
}

interface TradeAgreement {
  id: string
  code: string
  name: string
  countries: string[]
  hs_code_benefits: Record<string, number>
  requirements: string[]
  effective_date: string
  expiry_date?: string
}

interface CalculationRequest {
  hsCode: string
  destinationCountry: string
  originCountry?: string
  tradeAgreement?: string
  productValue?: number
  weight?: number
  includeAdditionalFees: boolean
}

interface CalculationResult {
  dutyRate: number
  vatRate: number
  preferentialTreatment: boolean
  tradeAgreementApplied?: string
  confidence: number
  calculatedAmounts?: {
    dutyAmount: number
    vatAmount: number
    additionalFees: Record<string, number>
    totalTax: number
    totalLandedCost: number
  }
  ruleDetails?: {
    ruleSource: string
    effectiveDate: string
    expiryDate?: string
    notes?: string
  }
  recommendations?: string[]
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' }
]

const RULE_SOURCES = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'api', label: 'API Import' },
  { value: 'ml', label: 'ML Prediction' },
  { value: 'government', label: 'Government Source' }
]

export default function MultiCountryRulesManager() {
  const [activeTab, setActiveTab] = useState('rules')
  const [dutyRules, setDutyRules] = useState<DutyRule[]>([])
  const [tradeAgreements, setTradeAgreements] = useState<TradeAgreement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Rule management state
  const [selectedRule, setSelectedRule] = useState<DutyRule | null>(null)
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false)
  const [ruleForm, setRuleForm] = useState<Partial<DutyRule>>({})
  
  // Calculation state
  const [calculationRequest, setCalculationRequest] = useState<CalculationRequest>({
    hsCode: '',
    destinationCountry: '',
    originCountry: '',
    tradeAgreement: '',
    productValue: 0,
    weight: 0,
    includeAdditionalFees: true
  })
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  
  // Filters
  const [filters, setFilters] = useState({
    countryCode: '',
    originCountryCode: '',
    tradeAgreement: '',
    hsCode: '',
    includeExpired: false
  })

  useEffect(() => {
    loadDutyRules()
    loadTradeAgreements()
  }, [filters])

  const loadDutyRules = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {params.append(key, value.toString())}
      })
      
      const response = await fetch(`/api/duty-rules?${params}`)
      if (!response.ok) {
        throw new Error('Failed to load duty rules')
      }
      
      const data = await response.json()
      setDutyRules(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      toast.error('Failed to load duty rules')
    } finally {
      setLoading(false)
    }
  }

  const loadTradeAgreements = async () => {
    try {
      const response = await fetch('/api/duty-rules/calculate')
      if (response.ok) {
        const data = await response.json()
        setTradeAgreements(data.data || [])
      }
    } catch (err) {
      console.error('Failed to load trade agreements:', err)
    }
  }

  const handleSaveRule = async () => {
    if (!ruleForm.classification_id || !ruleForm.country_code || 
        ruleForm.duty_percentage === undefined || ruleForm.vat_percentage === undefined) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const method = selectedRule ? 'PUT' : 'POST'
      const url = selectedRule ? `/api/duty-rules?id=${selectedRule.id}` : '/api/duty-rules'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classificationId: ruleForm.classification_id,
          countryCode: ruleForm.country_code,
          originCountryCode: ruleForm.origin_country_code,
          dutyPercentage: ruleForm.duty_percentage,
          vatPercentage: ruleForm.vat_percentage,
          tradeAgreement: ruleForm.trade_agreement,
          preferentialRate: ruleForm.preferential_rate,
          additionalFees: ruleForm.additional_fees || {},
          ruleSource: ruleForm.rule_source || 'manual',
          confidenceScore: ruleForm.confidence_score || 0.8,
          effectiveDate: ruleForm.effective_date,
          expiryDate: ruleForm.expiry_date,
          notes: ruleForm.notes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save duty rule')
      }

      toast.success(selectedRule ? 'Rule updated successfully' : 'Rule created successfully')
      setIsRuleDialogOpen(false)
      setSelectedRule(null)
      setRuleForm({})
      loadDutyRules()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save rule')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) {return}

    setLoading(true)
    try {
      const response = await fetch(`/api/duty-rules?id=${ruleId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete duty rule')
      }

      toast.success('Rule deleted successfully')
      loadDutyRules()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete rule')
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateDuty = async () => {
    if (!calculationRequest.hsCode || !calculationRequest.destinationCountry) {
      toast.error('Please provide HS code and destination country')
      return
    }

    setIsCalculating(true)
    try {
      const response = await fetch('/api/duty-rules/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calculationRequest)
      })

      if (!response.ok) {
        throw new Error('Failed to calculate duty')
      }

      const data = await response.json()
      setCalculationResult(data.data)
      toast.success('Duty calculation completed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to calculate duty')
      setCalculationResult(null)
    } finally {
      setIsCalculating(false)
    }
  }

  const openRuleDialog = (rule?: DutyRule) => {
    setSelectedRule(rule || null)
    setRuleForm(rule ? { ...rule } : {
      rule_source: 'manual',
      confidence_score: 0.8,
      effective_date: new Date().toISOString().split('T')[0],
      additional_fees: {}
    })
    setIsRuleDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multi-Country Duty Rules</h1>
          <p className="text-muted-foreground">
            Manage duty rates, tax rules, and trade agreements across multiple countries
          </p>
        </div>
        <Button onClick={() => openRuleDialog()} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <DocumentTextIcon className="h-4 w-4" />
            Duty Rules
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <CalculatorIcon className="h-4 w-4" />
            Rate Calculator
          </TabsTrigger>
          <TabsTrigger value="agreements" className="flex items-center gap-2">
            <GlobeAltIcon className="h-4 w-4" />
            Trade Agreements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="country-filter">Destination Country</Label>
                  <Select value={filters.countryCode} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, countryCode: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All countries</SelectItem>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="origin-filter">Origin Country</Label>
                  <Select value={filters.originCountryCode} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, originCountryCode: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="All origins" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All origins</SelectItem>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="hs-filter">HS Code</Label>
                  <Input
                    id="hs-filter"
                    placeholder="Enter HS code"
                    value={filters.hsCode}
                    onChange={(e) => setFilters(prev => ({ ...prev, hsCode: e.target.value }))}
                  />
                </div>
                
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="include-expired"
                    checked={filters.includeExpired}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, includeExpired: checked }))
                    }
                  />
                  <Label htmlFor="include-expired">Include expired rules</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rules Table */}
          <Card>
            <CardHeader>
              <CardTitle>Duty Rules ({dutyRules.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading rules...</div>
              ) : dutyRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No duty rules found. Try adjusting your filters or add a new rule.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HS Code</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>Duty Rate</TableHead>
                      <TableHead>VAT Rate</TableHead>
                      <TableHead>Trade Agreement</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dutyRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rule.hs6 || rule.hs8}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {rule.classification_description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.country_code}</Badge>
                        </TableCell>
                        <TableCell>
                          {rule.origin_country_code ? (
                            <Badge variant="secondary">{rule.origin_country_code}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Any</span>
                          )}
                        </TableCell>
                        <TableCell>{rule.duty_percentage}%</TableCell>
                        <TableCell>{rule.vat_percentage}%</TableCell>
                        <TableCell>
                          {rule.trade_agreement ? (
                            <Badge>{rule.trade_agreement}</Badge>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.rule_source === 'government' ? 'default' : 'secondary'}>
                            {RULE_SOURCES.find(s => s.value === rule.rule_source)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${
                              rule.confidence_score >= 0.8 ? 'bg-green-500' :
                              rule.confidence_score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            {Math.round(rule.confidence_score * 100)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRuleDialog(rule)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calculation Form */}
            <Card>
              <CardHeader>
                <CardTitle>Duty Rate Calculator</CardTitle>
                <CardDescription>
                  Calculate effective duty rates considering trade agreements and preferential treatment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="calc-hs-code">HS Code *</Label>
                  <Input
                    id="calc-hs-code"
                    placeholder="e.g., 8471604000"
                    value={calculationRequest.hsCode}
                    onChange={(e) => setCalculationRequest(prev => ({ ...prev, hsCode: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="calc-destination">Destination Country *</Label>
                  <Select value={calculationRequest.destinationCountry} onValueChange={(value) => 
                    setCalculationRequest(prev => ({ ...prev, destinationCountry: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="calc-origin">Origin Country</Label>
                  <Select value={calculationRequest.originCountry} onValueChange={(value) => 
                    setCalculationRequest(prev => ({ ...prev, originCountry: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select origin (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not specified</SelectItem>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="calc-value">Product Value (USD)</Label>
                  <Input
                    id="calc-value"
                    type="number"
                    placeholder="0.00"
                    value={calculationRequest.productValue || ''}
                    onChange={(e) => setCalculationRequest(prev => ({ 
                      ...prev, 
                      productValue: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-fees"
                    checked={calculationRequest.includeAdditionalFees}
                    onCheckedChange={(checked) => 
                      setCalculationRequest(prev => ({ ...prev, includeAdditionalFees: checked }))
                    }
                  />
                  <Label htmlFor="include-fees">Include additional fees</Label>
                </div>
                
                <Button 
                  onClick={handleCalculateDuty} 
                  disabled={isCalculating}
                  className="w-full"
                >
                  {isCalculating ? 'Calculating...' : 'Calculate Duty'}
                </Button>
              </CardContent>
            </Card>

            {/* Calculation Results */}
            <Card>
              <CardHeader>
                <CardTitle>Calculation Results</CardTitle>
              </CardHeader>
              <CardContent>
                {calculationResult ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Duty Rate</Label>
                        <div className="text-2xl font-bold">{calculationResult.dutyRate}%</div>
                      </div>
                      <div>
                        <Label>VAT Rate</Label>
                        <div className="text-2xl font-bold">{calculationResult.vatRate}%</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {calculationResult.preferentialTreatment ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <InformationCircleIcon className="h-5 w-5 text-blue-500" />
                      )}
                      <span className={calculationResult.preferentialTreatment ? 'text-green-700' : 'text-blue-700'}>
                        {calculationResult.preferentialTreatment ? 'Preferential treatment applied' : 'Standard rates applied'}
                      </span>
                    </div>
                    
                    {calculationResult.tradeAgreementApplied && (
                      <div>
                        <Label>Trade Agreement</Label>
                        <Badge>{calculationResult.tradeAgreementApplied}</Badge>
                      </div>
                    )}
                    
                    <div>
                      <Label>Confidence Score</Label>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          calculationResult.confidence >= 0.8 ? 'bg-green-500' :
                          calculationResult.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        {Math.round(calculationResult.confidence * 100)}%
                      </div>
                    </div>
                    
                    {calculationResult.calculatedAmounts && (
                      <div className="space-y-2">
                        <Separator />
                        <Label>Cost Breakdown</Label>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Duty Amount:</span>
                            <span>${calculationResult.calculatedAmounts.dutyAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>VAT Amount:</span>
                            <span>${calculationResult.calculatedAmounts.vatAmount.toFixed(2)}</span>
                          </div>
                          {Object.entries(calculationResult.calculatedAmounts.additionalFees).map(([fee, amount]) => (
                            <div key={fee} className="flex justify-between">
                              <span>{fee}:</span>
                              <span>${amount.toFixed(2)}</span>
                            </div>
                          ))}
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Total Tax:</span>
                            <span>${calculationResult.calculatedAmounts.totalTax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Total Landed Cost:</span>
                            <span>${calculationResult.calculatedAmounts.totalLandedCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {calculationResult.recommendations && calculationResult.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <Separator />
                        <Label>Recommendations</Label>
                        <ul className="space-y-1 text-sm">
                          {calculationResult.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <InformationCircleIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Enter calculation parameters and click &quot;Calculate Duty&quot; to see results
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agreements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade Agreements</CardTitle>
              <CardDescription>
                Active trade agreements that may provide preferential duty rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tradeAgreements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No trade agreements loaded
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tradeAgreements.map((agreement) => (
                    <Card key={agreement.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{agreement.name}</CardTitle>
                        <Badge variant="outline">{agreement.code}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <Label>Countries</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {agreement.countries.map(country => (
                              <Badge key={country} variant="secondary" className="text-xs">
                                {country}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <Label>HS Code Benefits</Label>
                          <div className="text-sm text-muted-foreground">
                            {Object.keys(agreement.hs_code_benefits).length} HS codes covered
                          </div>
                        </div>
                        
                        <div>
                          <Label>Effective Date</Label>
                          <div className="text-sm">{agreement.effective_date}</div>
                        </div>
                        
                        {agreement.requirements.length > 0 && (
                          <div>
                            <Label>Requirements</Label>
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                              {agreement.requirements.slice(0, 2).map((req, index) => (
                                <li key={index}>{req}</li>
                              ))}
                              {agreement.requirements.length > 2 && (
                                <li>+{agreement.requirements.length - 2} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRule ? 'Edit Duty Rule' : 'Create New Duty Rule'}
            </DialogTitle>
            <DialogDescription>
              {selectedRule ? 'Update the duty rule information' : 'Add a new duty rule to the system'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="classification-id">Classification ID *</Label>
              <Input
                id="classification-id"
                placeholder="UUID of classification"
                value={ruleForm.classification_id || ''}
                onChange={(e) => setRuleForm(prev => ({ ...prev, classification_id: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="country-code">Destination Country *</Label>
              <Select value={ruleForm.country_code} onValueChange={(value) => 
                setRuleForm(prev => ({ ...prev, country_code: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="origin-country-code">Origin Country</Label>
              <Select value={ruleForm.origin_country_code || ''} onValueChange={(value) => 
                setRuleForm(prev => ({ ...prev, origin_country_code: value || undefined }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Any origin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any origin</SelectItem>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="duty-percentage">Duty Rate (%) *</Label>
              <Input
                id="duty-percentage"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={ruleForm.duty_percentage || ''}
                onChange={(e) => setRuleForm(prev => ({ 
                  ...prev, 
                  duty_percentage: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            
            <div>
              <Label htmlFor="vat-percentage">VAT Rate (%) *</Label>
              <Input
                id="vat-percentage"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={ruleForm.vat_percentage || ''}
                onChange={(e) => setRuleForm(prev => ({ 
                  ...prev, 
                  vat_percentage: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            
            <div>
              <Label htmlFor="trade-agreement">Trade Agreement</Label>
              <Input
                id="trade-agreement"
                placeholder="e.g., USMCA"
                value={ruleForm.trade_agreement || ''}
                onChange={(e) => setRuleForm(prev => ({ ...prev, trade_agreement: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="preferential-rate">Preferential Rate (%)</Label>
              <Input
                id="preferential-rate"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={ruleForm.preferential_rate || ''}
                onChange={(e) => setRuleForm(prev => ({ 
                  ...prev, 
                  preferential_rate: parseFloat(e.target.value) || undefined 
                }))}
              />
            </div>
            
            <div>
              <Label htmlFor="rule-source">Rule Source</Label>
              <Select value={ruleForm.rule_source} onValueChange={(value) => 
                setRuleForm(prev => ({ ...prev, rule_source: value as any }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {RULE_SOURCES.map(source => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="confidence-score">Confidence Score</Label>
              <Input
                id="confidence-score"
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="0.80"
                value={ruleForm.confidence_score || ''}
                onChange={(e) => setRuleForm(prev => ({ 
                  ...prev, 
                  confidence_score: parseFloat(e.target.value) || 0.8 
                }))}
              />
            </div>
            
            <div>
              <Label htmlFor="effective-date">Effective Date</Label>
              <Input
                id="effective-date"
                type="date"
                value={ruleForm.effective_date || ''}
                onChange={(e) => setRuleForm(prev => ({ ...prev, effective_date: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="expiry-date">Expiry Date</Label>
              <Input
                id="expiry-date"
                type="date"
                value={ruleForm.expiry_date || ''}
                onChange={(e) => setRuleForm(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this rule..."
              value={ruleForm.notes || ''}
              onChange={(e) => setRuleForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule} disabled={loading}>
              {loading ? 'Saving...' : selectedRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}