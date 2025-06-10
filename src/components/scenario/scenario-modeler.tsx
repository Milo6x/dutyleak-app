"use client"

import React, { useState, useEffect } from 'react'
// toast import was missing, add it if you plan to use it for save/load feedback
// import { toast } from 'sonner'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Trash2, 
  Copy, 
  Play,
  BarChart3,
  Lightbulb, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Calculator,
  Save,
  Download,
  Upload,
  TableIcon 
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ScenarioInput {
  id: string
  name: string
  productPrice: number
  dimensions: {
    length: number
    width: number
    height: number
    weight: number
  }
  category: string 
  quantity: number
  productId: string
  hsCode: string
  originCountry: string
  destinationCountry: string
  insuranceCost?: number
  shippingCost?: number
  additionalFees?: number,
  shared_with_workspaces?: string[] 
  // This field will store the backend ID once saved, to distinguish new vs existing
  backendId?: string 
}

import type { OptimizationRecommendation } from '@/lib/duty/optimization-engine';

interface ScenarioResult {
  id: string
  name: string
  totalCost: number
  fbaFees: {
    fulfillment: number
    storage: number
    referral: number
    total: number
  }
  landedCost: number
  profitMargin: number
  profitAmount: number
  roi: number
  breakEvenQuantity: number
}

interface ScenarioComparison {
  bestScenario: string
  worstScenario: string
  costDifference: number
  profitDifference: number
  recommendations: string[]
}

interface ScenarioModelerProps {
  className?: string
  onScenarioSave?: (scenario: ScenarioInput) => void // This prop might be deprecated if all saving goes to backend
  onResultsGenerated?: (results: ScenarioResult[]) => void
}

const PRODUCT_CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing & Accessories' },
  { value: 'home-garden', label: 'Home & Garden' },
  { value: 'sports', label: 'Sports & Outdoors' },
  { value: 'books', label: 'Books' },
  { value: 'toys', label: 'Toys & Games' },
  { value: 'health', label: 'Health & Personal Care' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'other', label: 'Other' }
]

const DEFAULT_SCENARIO: Omit<ScenarioInput, 'id' | 'backendId'> = { // Exclude backendId from default
  name: 'New Scenario',
  productId: 'PROD-001', 
  productPrice: 25.00, 
  dimensions: { length: 10, width: 8, height: 2, weight: 1 },
  category: 'electronics',
  quantity: 100,
  hsCode: '851712', 
  originCountry: 'CN', 
  destinationCountry: 'US', 
  insuranceCost: 0,
  shippingCost: 5, 
  additionalFees: 0,
  shared_with_workspaces: [] 
}

const COUNTRY_OPTIONS = [
  { value: 'US', label: 'United States' }, { value: 'CA', label: 'Canada' }, { value: 'MX', label: 'Mexico' },
  { value: 'GB', label: 'United Kingdom' }, { value: 'DE', label: 'Germany' }, { value: 'FR', label: 'France' },
  { value: 'CN', label: 'China' }, { value: 'JP', label: 'Japan' }, { value: 'KR', label: 'South Korea' },
  { value: 'AU', label: 'Australia' },
];

export function ScenarioModeler({ 
  className, 
  onScenarioSave, 
  onResultsGenerated 
}: ScenarioModelerProps) {
  const [scenarios, setScenarios] = useState<ScenarioInput[]>([])
  const [results, setResults] = useState<ScenarioResult[]>([])
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null)
  const [isCalculating, setIsCalculating] = useState(false) // Used for both calculation and save/load
  const [activeTab, setActiveTab] = useState('scenarios')
  const [error, setError] = useState<string | null>(null)
  const [optimizationRecs, setOptimizationRecs] = useState<OptimizationRecommendation[]>([])
  const [isLoadingRecs, setIsLoadingRecs] = useState(false)
  const [currentScenarioForRecs, setCurrentScenarioForRecs] = useState<string | null>(null)

  const loadScenariosFromAPI = async () => {
    setError(null);
    setIsCalculating(true); 
    try {
      const response = await fetch('/api/scenarios');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load scenarios from server.');
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const loadedScenarios = result.data.map((apiScenario: any) => ({
          id: apiScenario.id, // Use backend ID as the main ID
          backendId: apiScenario.id, // Store backend ID separately
          name: apiScenario.name || 'Unnamed Scenario',
          productId: apiScenario.product_id || apiScenario.productId || DEFAULT_SCENARIO.productId,
          productPrice: apiScenario.product_value || apiScenario.productPrice || DEFAULT_SCENARIO.productPrice,
          dimensions: apiScenario.parameters?.dimensions || apiScenario.dimensions || DEFAULT_SCENARIO.dimensions,
          category: apiScenario.parameters?.category || apiScenario.category || DEFAULT_SCENARIO.category,
          quantity: apiScenario.parameters?.quantity || apiScenario.quantity || DEFAULT_SCENARIO.quantity,
          hsCode: apiScenario.parameters?.hsCode || apiScenario.hs_code || DEFAULT_SCENARIO.hsCode,
          originCountry: apiScenario.parameters?.originCountry || apiScenario.origin_country || DEFAULT_SCENARIO.originCountry,
          destinationCountry: apiScenario.parameters?.destinationCountry || apiScenario.destination_country || DEFAULT_SCENARIO.destinationCountry,
          insuranceCost: apiScenario.insurance_cost || DEFAULT_SCENARIO.insuranceCost,
          shippingCost: apiScenario.shipping_cost || DEFAULT_SCENARIO.shippingCost,
          additionalFees: apiScenario.parameters?.additionalFees || apiScenario.additional_fees || DEFAULT_SCENARIO.additionalFees,
          shared_with_workspaces: apiScenario.shared_with_workspaces || []
        }));
        
        if (loadedScenarios.length > 0) {
          setScenarios(loadedScenarios);
        } else {
          setScenarios([{ ...DEFAULT_SCENARIO, id: `client-${Date.now()}` }]);
        }
      } else {
        throw new Error(result.error || "Invalid data from server when loading scenarios.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error loading scenarios.";
      setError(errorMessage);
      console.error('Failed to load scenarios from API:', err);
      if (scenarios.length === 0) {
         setScenarios([{ ...DEFAULT_SCENARIO, id: `client-${Date.now()}` }]);
      }
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    loadScenariosFromAPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const addScenario = () => {
    const newScenario: ScenarioInput = {
      ...DEFAULT_SCENARIO,
      id: `client-${Date.now()}`, // Use client-prefix for new, unsaved scenarios
      name: `Scenario ${scenarios.length + 1}`
    }
    setScenarios([...scenarios, newScenario])
  }

  const removeScenario = (id: string) => {
    if (scenarios.length <= 1) {return} 
    setScenarios(scenarios.filter(s => s.id !== id))
    setResults(results.filter(r => r.id !== id))
    // TODO: Add API call to delete scenario from backend if it has a backendId
  }

  const duplicateScenario = (id: string) => {
    const scenario = scenarios.find(s => s.id === id)
    if (!scenario) {return}

    const duplicated: ScenarioInput = {
      ...scenario,
      id: `client-${Date.now()}`, // New client ID, no backendId yet
      backendId: undefined, // Clear backendId for duplicated one
      name: `${scenario.name} (Copy)`
    }
    setScenarios([...scenarios, duplicated])
  }

  const updateScenario = (id: string, updates: Partial<ScenarioInput>) => {
    setScenarios(scenarios.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ))
  }

  const fetchOptimizationRecommendations = async (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario || !scenario.productId) {
      setError("Product ID is missing for this scenario.");
      return;
    }
    setIsLoadingRecs(true);
    setOptimizationRecs([]);
    setCurrentScenarioForRecs(scenarioId);
    setError(null);
    try {
      const response = await fetch('/api/duty/get-optimization-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: scenario.productId }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch optimization recommendations.');
      }
      const result = await response.json();
      if (result.success && result.data) {
        setOptimizationRecs(result.data);
        if (result.data.length === 0) {
          console.log("No specific optimization opportunities found for this product at the moment.");
        }
      } else {
        throw new Error(result.error || 'Invalid response for optimization recommendations.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error fetching recommendations.";
      setError(errorMessage);
      console.error(errorMessage);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const applyRecommendation = (scenarioId: string, recommendation: OptimizationRecommendation) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) { setError("Scenario not found to apply recommendation."); return; }
    let updates: Partial<ScenarioInput> = {};
    if (recommendation.type === 'classification' && recommendation.recommendedHsCode) {
      updates.hsCode = recommendation.recommendedHsCode;
    } else if (recommendation.type === 'origin' && recommendation.description.includes('Source from')) {
      const match = recommendation.description.match(/Source from (\w{2})/);
      if (match && match[1]) { updates.originCountry = match[1]; }
    }
    if (Object.keys(updates).length > 0) {
      updateScenario(scenarioId, updates);
      console.log(`Recommendation applied to scenario: ${scenario.name}. Recalculate to see changes.`, updates);
      if (currentScenarioForRecs === scenarioId) {
        setOptimizationRecs([]);
        setCurrentScenarioForRecs(null);
      }
    } else {
      console.log("This recommendation type does not have automatic updates yet:", recommendation.type);
    }
  };

  const calculateScenarios = async () => {
    setIsCalculating(true); setError(null);
    try {
      const calculationPromises = scenarios.map(async (scenario) => {
        const fbaResponse = await fetch('/api/amazon/calculate-fba-fees', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dimensions: scenario.dimensions, category: scenario.category, productPrice: scenario.productPrice })
        });
        let fbaFees = { fulfillment: 3.22, storage: 0.75, referral: scenario.productPrice * 0.15, total: 0 };
        if (fbaResponse.ok) { const fbaData = await fbaResponse.json(); fbaFees = fbaData.fees; }
        fbaFees.total = fbaFees.fulfillment + fbaFees.storage + fbaFees.referral;

        const dutyCalculationRequest = {
          hsCode: scenario.hsCode, productValue: scenario.productPrice, quantity: scenario.quantity,
          weight: scenario.dimensions.weight, originCountry: scenario.originCountry, destinationCountry: scenario.destinationCountry,
          shippingCost: scenario.shippingCost, includeInsurance: (scenario.insuranceCost || 0) > 0,
          insuranceValue: (scenario.insuranceCost || 0) > 0 ? scenario.productPrice : undefined, isCommercialShipment: true,
        };
        const dutyApiResponse = await fetch('/api/duty/calculate-what-if', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dutyCalculationRequest),
        });
        if (!dutyApiResponse.ok) { const d = await dutyApiResponse.json().catch(() => ({})); throw new Error(d.error || `Duty calc failed: ${scenario.name}`); }
        const dutyApiResult = await dutyApiResponse.json();
        if (!dutyApiResult.success || !dutyApiResult.data) { throw new Error(dutyApiResult.error || `Invalid duty response: ${scenario.name}`); }
        
        const calculatedDutyInfo = dutyApiResult.data;
        const landedCostBeforeFBA = calculatedDutyInfo.totalLandedCost / (scenario.quantity || 1);
        const totalCostPerUnit = landedCostBeforeFBA + fbaFees.total + (scenario.additionalFees || 0);
        const profitAmount = scenario.productPrice - totalCostPerUnit;
        const profitMargin = scenario.productPrice > 0 ? (profitAmount / scenario.productPrice) * 100 : 0;
        const roi = totalCostPerUnit > 0 ? (profitAmount / totalCostPerUnit) * 100 : 0;
        const breakEvenQuantity = profitAmount > 0 ? 0 : Infinity;
        return { id: scenario.id, name: scenario.name, totalCost: totalCostPerUnit * scenario.quantity, fbaFees, landedCost: landedCostBeforeFBA, profitMargin, profitAmount: profitAmount * scenario.quantity, roi, breakEvenQuantity };
      });
      const calculatedResults = await Promise.all(calculationPromises);
      setResults(calculatedResults);
      generateComparison(calculatedResults);
      onResultsGenerated?.(calculatedResults);
      setActiveTab('results');
    } catch (err) { setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally { setIsCalculating(false); }
  };

  const generateComparison = (results: ScenarioResult[]) => {
    if (results.length < 2) { setComparison(null); return; }
    const sortedByProfit = [...results].sort((a, b) => b.profitAmount - a.profitAmount);
    const best = sortedByProfit[0]; const worst = sortedByProfit[sortedByProfit.length - 1];
    const recommendations: string[] = [];
    if (best.profitMargin > 20) { recommendations.push('Consider increasing quantity for the best performing scenario'); }
    if (worst.profitMargin < 10) { recommendations.push('Review pricing strategy for low-margin scenarios'); }
    const avgROI = results.reduce((sum, r) => sum + r.roi, 0) / results.length;
    if (avgROI < 15) { recommendations.push('Consider optimizing product dimensions to reduce FBA fees'); }
    setComparison({ bestScenario: best.name, worstScenario: worst.name, costDifference: worst.totalCost - best.totalCost, profitDifference: best.profitAmount - worst.profitAmount, recommendations });
  };

  const saveScenariosToAPI = async () => {
    localStorage.setItem('dutyleak-scenarios', JSON.stringify(scenarios)); // Backup
    setError(null);
    setIsCalculating(true); // Reuse loading state

    let allSucceeded = true;
    const updatedScenarios = [...scenarios]; // To update with backend IDs if new

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      // Basic: always POST. A real app would PUT if scenario.backendId exists.
      // For POST, API expects certain fields. Map ScenarioInput to API payload.
      const payload = {
        name: scenario.name,
        description: `Scenario for product ${scenario.productId}`, // Or add a description field to ScenarioInput
        productId: scenario.productId,
        // These are for ScenarioEngine's compareClassifications, which POST /api/scenarios uses.
        // This implies scenarios are always comparisons of two classifications.
        // If we want to save a "what-if" scenario not based on comparison, API needs adjustment.
        // For now, let's assume we need placeholder classification IDs or the API handles it.
        baseClassificationId: scenario.hsCode, // Placeholder: using hsCode as base. API needs to handle this.
        alternativeClassificationId: scenario.hsCode, // Placeholder
        destinationCountry: scenario.destinationCountry,
        productValue: scenario.productPrice,
        shippingCost: scenario.shippingCost || 0,
        insuranceCost: scenario.insuranceCost || 0,
        fbaFeeAmount: 0, // FBA fees are calculated client-side, not stored directly in duty_scenarios by engine
        yearlyUnits: scenario.quantity, // Assuming quantity is yearly for this save
        shared_with_workspaces: scenario.shared_with_workspaces || []
      };

      try {
        // TODO: If scenario.backendId exists, use PUT /api/scenarios/{backendId} (needs new endpoint)
        // For now, always POSTing, which will create new entries.
        const response = await fetch('/api/scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to save scenario: ${scenario.name}`);
        }
        const result = await response.json();
        if (result.success && result.scenarioId) {
          // Update client-side scenario with backend ID if it's a new one
          // This part is tricky if POST always creates.
          // For now, we'll just assume it worked. A reload would fetch proper IDs.
          console.log(`Scenario ${scenario.name} saved with ID: ${result.scenarioId}`);
          updatedScenarios[i].backendId = result.scenarioId; // Store backend ID
          updatedScenarios[i].id = result.scenarioId; // Update main ID to backend ID
        } else {
          allSucceeded = false;
          console.error(`Failed to save scenario ${scenario.name}: ${result.error}`);
        }
      } catch (err) {
        allSucceeded = false;
        const errorMessage = err instanceof Error ? err.message : `Unknown error saving ${scenario.name}.`;
        setError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage);
        console.error(errorMessage);
      }
    }
    setIsCalculating(false);
    if (allSucceeded) {
      // toast.success("All scenarios saved successfully!");
      console.log("All scenarios attempt to save completed.");
      setScenarios(updatedScenarios); // Update scenarios with backend IDs
      // Optionally, reload from API to ensure consistency:
      // await loadScenariosFromAPI(); 
    } else {
      // toast.error("Some scenarios failed to save. Check console/errors.");
      console.error("Some scenarios failed to save.");
    }
  };
  
  // This is the old loadScenarios, renamed to avoid conflict with Load button if it's kept for localStorage
  const loadScenariosFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('dutyleak-scenarios')
      if (saved) {
        const parsedScenarios = JSON.parse(saved)
        setScenarios(parsedScenarios)
      }
    } catch (err) {
      console.error('Failed to load scenarios from localStorage:', err)
    }
  }


  const exportResults = () => {
    if (results.length === 0) {return}
    const csvContent = [
      ['Scenario', 'Total Cost', 'Landed Cost', 'FBA Fees', 'Profit Amount', 'Profit Margin %', 'ROI %', 'Break Even Qty'].join(','),
      ...results.map(result => [
        result.name, result.totalCost.toFixed(2), result.landedCost.toFixed(2),
        result.fbaFees.total.toFixed(2), result.profitAmount.toFixed(2),
        result.profitMargin.toFixed(2), result.roi.toFixed(2), result.breakEvenQuantity.toString()
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `scenario-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" /> Scenario Modeler
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadScenariosFromAPI}> {/* Changed to load from API */}
              <Upload className="h-4 w-4 mr-1" /> Load from Cloud
            </Button>
            <Button variant="outline" size="sm" onClick={saveScenariosToAPI}> {/* Changed to save to API */}
              <Save className="h-4 w-4 mr-1" /> Save to Cloud
            </Button>
            {results.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportResults}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Model different scenarios to compare costs, fees, and profitability
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scenarios">Scenarios ({scenarios.length})</TabsTrigger>
            <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Configure Scenarios</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={addScenario}>
                  <Plus className="h-4 w-4 mr-1" /> Add Scenario
                </Button>
                <Button onClick={calculateScenarios} disabled={isCalculating || scenarios.length === 0}>
                  <Play className="h-4 w-4 mr-1" />
                  {isCalculating && scenarios.every(s => s.id.startsWith('client-')) ? 'Saving & Calculating...' : isCalculating ? 'Calculating...' : 'Calculate All'}
                </Button>
              </div>
            </div>

            {isCalculating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing scenarios...</span>
                  <span>{scenarios.length} scenarios</span>
                </div>
                <Progress value={33} className="w-full" /> {/* Progress could be more dynamic */}
              </div>
            )}

            {error && ( <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> )}

            <div className="space-y-4">
              {scenarios.map((scenario, index) => (
                <Card key={scenario.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Input
                          value={scenario.name}
                          onChange={(e) => updateScenario(scenario.id, { name: e.target.value })}
                          className="font-medium max-w-xs"
                        />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => fetchOptimizationRecommendations(scenario.id)}
                          disabled={isLoadingRecs && currentScenarioForRecs === scenario.id}
                        >
                          <Lightbulb className="h-4 w-4 mr-1" />
                          {isLoadingRecs && currentScenarioForRecs === scenario.id ? 'Loading...' : 'Optimize Ideas'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => duplicateScenario(scenario.id)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeScenario(scenario.id)} disabled={scenarios.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4"> 
                      <div className="space-y-2">
                        <Label>Product ID</Label>
                        <Input type="text" value={scenario.productId} placeholder="Enter Product ID" onChange={(e) => updateScenario(scenario.id, { productId: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Product Price (Value)</Label>
                        <Input type="number" step="0.01" value={scenario.productPrice} onChange={(e) => updateScenario(scenario.id, { productPrice: parseFloat(e.target.value) || 0 })} />
                      </div>
                       <div className="space-y-2">
                        <Label>HS Code</Label>
                        <Input type="text" value={scenario.hsCode} onChange={(e) => updateScenario(scenario.id, { hsCode: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input type="number" value={scenario.quantity} onChange={(e) => updateScenario(scenario.id, { quantity: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Origin Country</Label>
                        <Select value={scenario.originCountry} onValueChange={(value) => updateScenario(scenario.id, { originCountry: value })}>
                          <SelectTrigger id={`origin-${scenario.id}`}><SelectValue placeholder="Select Origin..." /></SelectTrigger>
                          <SelectContent>{COUNTRY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Destination Country</Label>
                         <Select value={scenario.destinationCountry} onValueChange={(value) => updateScenario(scenario.id, { destinationCountry: value })}>
                          <SelectTrigger id={`destination-${scenario.id}`}><SelectValue placeholder="Select Destination..." /></SelectTrigger>
                          <SelectContent>{COUNTRY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                       <div className="space-y-2">
                        <Label>Category (for FBA)</Label>
                        <Select value={scenario.category} onValueChange={(value) => updateScenario(scenario.id, { category: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PRODUCT_CATEGORIES.map(cat => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Shipping Cost</Label>
                        <Input type="number" step="0.01" value={scenario.shippingCost || 0} onChange={(e) => updateScenario(scenario.id, { shippingCost: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Insurance Cost</Label>
                        <Input type="number" step="0.01" value={scenario.insuranceCost || 0} onChange={(e) => updateScenario(scenario.id, { insuranceCost: parseFloat(e.target.value) || 0 })} />
                      </div>
                       <div className="space-y-2">
                        <Label>Additional Fees</Label>
                        <Input type="number" step="0.01" value={scenario.additionalFees || 0} onChange={(e) => updateScenario(scenario.id, { additionalFees: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>

                    <Separator />
                    <Label className="text-sm text-muted-foreground">Product Dimensions & Weight (for FBA)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Length (in)</Label>
                        <Input type="number" step="0.1" value={scenario.dimensions.length} onChange={(e) => updateScenario(scenario.id, { dimensions: { ...scenario.dimensions, length: parseFloat(e.target.value) || 0 }})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Width (in)</Label>
                        <Input type="number" step="0.1" value={scenario.dimensions.width} onChange={(e) => updateScenario(scenario.id, { dimensions: { ...scenario.dimensions, width: parseFloat(e.target.value) || 0 }})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Height (in)</Label>
                        <Input type="number" step="0.1" value={scenario.dimensions.height} onChange={(e) => updateScenario(scenario.id, { dimensions: { ...scenario.dimensions, height: parseFloat(e.target.value) || 0 }})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Weight (lbs)</Label>
                        <Input type="number" step="0.1" value={scenario.dimensions.weight} onChange={(e) => updateScenario(scenario.id, { dimensions: { ...scenario.dimensions, weight: parseFloat(e.target.value) || 0 }})} />
                      </div>
                    </div>

                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor={`share-${scenario.id}`}>Share with Workspaces (comma-separated IDs)</Label>
                      <Input
                        id={`share-${scenario.id}`} type="text" placeholder="e.g., ws_id1,ws_id2"
                        value={(scenario.shared_with_workspaces || []).join(',')}
                        onChange={(e) => {
                          const ids = e.target.value.split(',').map(id => id.trim()).filter(id => id);
                          updateScenario(scenario.id, { shared_with_workspaces: ids });
                        }}
                      />
                    </div>

                    {currentScenarioForRecs === scenario.id && optimizationRecs.length > 0 && (
                      <div className="mt-4 p-4 border-t">
                        <h5 className="text-md font-semibold mb-2">Optimization Ideas ({optimizationRecs.length})</h5>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {optimizationRecs.map((rec, recIndex) => (
                            <Card key={recIndex} className="p-3 bg-slate-50">
                              <p className="text-sm font-medium text-slate-700">{rec.type.toUpperCase()}: {rec.description}</p>
                              {rec.recommendedHsCode && <p className="text-xs text-slate-600">New HS Code: {rec.recommendedHsCode} (current: {rec.currentHsCode})</p>}
                              <p className="text-xs text-slate-600">Potential Saving: {formatCurrency(rec.potentialSaving)} ({formatPercentage(rec.savingPercentage)})</p>
                              <p className="text-xs text-slate-500">Confidence: {formatPercentage(rec.confidenceScore * 100)} | Risk: {rec.riskLevel} | Feasibility: {rec.feasibility}</p>
                              <Button size="sm" variant="outline" className="mt-2" onClick={() => applyRecommendation(scenario.id, rec)}>Apply Idea</Button>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    {currentScenarioForRecs === scenario.id && isLoadingRecs && (
                       <div className="mt-4 p-4 border-t text-center text-sm text-muted-foreground">Loading optimization ideas...</div>
                    )}
                     {currentScenarioForRecs === scenario.id && !isLoadingRecs && optimizationRecs.length === 0 && (
                       <div className="mt-4 p-4 border-t text-center text-sm text-muted-foreground">No specific optimization ideas found, or an error occurred.</div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results yet. Configure scenarios and click "Calculate All" to see results.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <Card key={result.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{result.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={result.profitMargin > 20 ? 'default' : result.profitMargin > 10 ? 'secondary' : 'destructive'}>
                            {formatPercentage(result.profitMargin)} margin
                          </Badge>
                          <Badge variant="outline">{formatPercentage(result.roi)} ROI</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-muted rounded-lg"><div className="text-2xl font-bold">{formatCurrency(result.totalCost)}</div><div className="text-sm text-muted-foreground">Total Cost</div></div>
                        <div className="text-center p-3 bg-muted rounded-lg"><div className="text-2xl font-bold">{formatCurrency(result.fbaFees.total)}</div><div className="text-sm text-muted-foreground">FBA Fees</div></div>
                        <div className="text-center p-3 bg-muted rounded-lg"><div className="text-2xl font-bold">{formatCurrency(result.profitAmount)}</div><div className="text-sm text-muted-foreground">Profit/Unit</div></div>
                        <div className="text-center p-3 bg-muted rounded-lg"><div className="text-2xl font-bold">{result.breakEvenQuantity}</div><div className="text-sm text-muted-foreground">Break Even Qty</div></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex justify-between"><span>Fulfillment Fee:</span><span>{formatCurrency(result.fbaFees.fulfillment)}</span></div>
                        <div className="flex justify-between"><span>Storage Fee:</span><span>{formatCurrency(result.fbaFees.storage)}</span></div>
                        <div className="flex justify-between"><span>Referral Fee:</span><span>{formatCurrency(result.fbaFees.referral)}</span></div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            {!comparison ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Add at least 2 scenarios and calculate results to see comparison.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const bestScenarioResult = results.find(r => r.name === comparison.bestScenario);
                  const worstScenarioResult = results.find(r => r.name === comparison.worstScenario);
                  const metricsToCompare = [
                    { label: 'Total Cost (Batch)', key: 'totalCost', format: formatCurrency }, { label: 'Landed Cost (Unit)', key: 'landedCost', format: formatCurrency },
                    { label: 'FBA Fees (Unit)', key: 'fbaFees', subKey: 'total', format: formatCurrency }, { label: 'Profit Amount (Batch)', key: 'profitAmount', format: formatCurrency },
                    { label: 'Profit Margin %', key: 'profitMargin', format: formatPercentage }, { label: 'ROI %', key: 'roi', format: formatPercentage },
                    { label: 'Break Even Qty', key: 'breakEvenQuantity', format: (val: number) => val === Infinity ? 'N/A' : val.toString() },
                  ];
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-4 border-green-200 bg-green-50"><div className="flex items-center gap-2 mb-2"><TrendingUp className="h-5 w-5 text-green-600" /><span className="font-semibold text-green-800">Best Scenario (by Profit)</span></div><div className="text-lg font-bold text-green-900">{comparison.bestScenario}</div></Card>
                        <Card className="p-4 border-red-200 bg-red-50"><div className="flex items-center gap-2 mb-2"><TrendingDown className="h-5 w-5 text-red-600" /><span className="font-semibold text-red-800">Worst Scenario (by Profit)</span></div><div className="text-lg font-bold text-red-900">{comparison.worstScenario}</div></Card>
                      </div>
                      {bestScenarioResult && worstScenarioResult && (
                        <Card>
                          <CardHeader><CardTitle className="flex items-center"><TableIcon className="mr-2 h-5 w-5" /> Side-by-Side Comparison</CardTitle></CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right text-green-700">{bestScenarioResult.name}</TableHead><TableHead className="text-right text-red-700">{worstScenarioResult.name}</TableHead><TableHead className="text-right">Difference</TableHead></TableRow></TableHeader>
                              <TableBody>
                                {metricsToCompare.map(metric => {
                                  const bestVal = metric.subKey ? (bestScenarioResult[metric.key as keyof ScenarioResult] as any)?.[metric.subKey] : bestScenarioResult[metric.key as keyof ScenarioResult];
                                  const worstVal = metric.subKey ? (worstScenarioResult[metric.key as keyof ScenarioResult]as any)?.[metric.subKey] : worstScenarioResult[metric.key as keyof ScenarioResult];
                                  let diffVal: number | string = 'N/A';
                                  if (typeof bestVal === 'number' && typeof worstVal === 'number') {
                                    diffVal = bestVal - worstVal;
                                    if (metric.key === 'totalCost' || metric.key === 'landedCost' || metric.key === 'fbaFees') { diffVal = worstVal - bestVal; }
                                  }
                                  return (<TableRow key={metric.key}><TableCell className="font-medium">{metric.label}</TableCell><TableCell className="text-right">{metric.format(bestVal as number)}</TableCell><TableCell className="text-right">{metric.format(worstVal as number)}</TableCell><TableCell className="text-right">{typeof diffVal === 'number' ? metric.format(diffVal) : diffVal}</TableCell></TableRow>);
                                })}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg"><div className="text-2xl font-bold">{formatCurrency(comparison.costDifference)}</div><div className="text-sm text-muted-foreground">Cost Difference (Worst - Best)</div></div>
                        <div className="text-center p-4 bg-muted rounded-lg"><div className="text-2xl font-bold">{formatCurrency(comparison.profitDifference)}</div><div className="text-sm text-muted-foreground">Profit Difference (Best - Worst)</div></div>
                      </div>
                    </>
                  );
                })()}
                {comparison.recommendations.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3">General Recommendations</h4>
                    <ul className="space-y-2">
                      {comparison.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" /><span className="text-sm">{rec}</span></li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
