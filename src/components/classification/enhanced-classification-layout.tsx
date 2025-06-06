'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import {
  LayoutDashboard,
  Search,
  Wand2,
  BarChart3,
  Eye,
  Settings,
  Maximize2,
  Minimize2,
  Grid3X3,
  List,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

// Import our enhanced components
import EnhancedClassificationDashboard from './enhanced-classification-dashboard'
import ClassificationWizard from './classification-wizard'
import ClassificationComparison from './classification-comparison'
import ConfidenceVisualization from './confidence-visualization'
import ClassificationSearch from './classification-search'
import HSCodeClassifier from './hs-code-classifier'

interface ClassificationItem {
  id: string
  hsCode: string
  productName: string
  productDescription: string
  category: string
  confidence: number
  source: 'ai' | 'manual' | 'historical' | 'expert'
  timestamp: string
  originCountry?: string
  destinationCountry?: string
  riskLevel: 'low' | 'medium' | 'high'
  tags: string[]
  userId?: string
  companyId?: string
  validationStatus: 'pending' | 'validated' | 'rejected'
  complianceFlags: string[]
  alternativeCodes?: string[]
  imageAnalysis?: boolean
  expertReview?: boolean
}

interface ConfidenceData {
  id: string
  hsCode: string
  confidence: number
  source: 'ai' | 'manual' | 'historical' | 'expert'
  timestamp: string
  factors: {
    textAnalysis: number
    imageAnalysis?: number
    historicalMatch: number
    expertValidation?: number
    complianceCheck: number
  }
  breakdown: {
    category: string
    score: number
    weight: number
    explanation: string
  }[]
  thresholds: {
    minimum: number
    recommended: number
    high: number
  }
  risks: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
    mitigation: string[]
  }
}

interface LayoutSettings {
  viewMode: 'grid' | 'list' | 'split'
  showSidebar: boolean
  sidebarWidth: number
  compactMode: boolean
  autoRefresh: boolean
  refreshInterval: number
  defaultTab: string
  showQuickActions: boolean
  theme: 'light' | 'dark' | 'auto'
}

interface EnhancedClassificationLayoutProps {
  initialData?: ClassificationItem[]
  confidenceData?: ConfidenceData[]
  onDataChange?: (data: ClassificationItem[]) => void
  onNewClassification?: (data: any) => void
  settings?: Partial<LayoutSettings>
  userPermissions?: {
    canClassify: boolean
    canValidate: boolean
    canExport: boolean
    canManageSettings: boolean
  }
}

const defaultSettings: LayoutSettings = {
  viewMode: 'grid',
  showSidebar: true,
  sidebarWidth: 300,
  compactMode: false,
  autoRefresh: false,
  refreshInterval: 30,
  defaultTab: 'dashboard',
  showQuickActions: true,
  theme: 'light'
}

const defaultPermissions = {
  canClassify: true,
  canValidate: true,
  canExport: true,
  canManageSettings: true
}

// Mock data for demonstration
const mockClassificationData: ClassificationItem[] = [
  {
    id: '1',
    hsCode: '8471.30.01',
    productName: 'Laptop Computer',
    productDescription: 'Portable computer with 15-inch display',
    category: 'Electronics',
    confidence: 95,
    source: 'ai',
    timestamp: new Date().toISOString(),
    originCountry: 'China',
    destinationCountry: 'USA',
    riskLevel: 'low',
    tags: ['electronics', 'computer', 'portable'],
    validationStatus: 'validated',
    complianceFlags: [],
    alternativeCodes: ['8471.30.02', '8471.41.01'],
    imageAnalysis: true,
    expertReview: false
  },
  {
    id: '2',
    hsCode: '6203.42.40',
    productName: 'Cotton Trousers',
    productDescription: 'Men\'s cotton casual trousers',
    category: 'Textiles',
    confidence: 87,
    source: 'manual',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    originCountry: 'India',
    destinationCountry: 'UK',
    riskLevel: 'medium',
    tags: ['clothing', 'cotton', 'mens'],
    validationStatus: 'pending',
    complianceFlags: ['textile-quota'],
    alternativeCodes: ['6203.42.90'],
    imageAnalysis: false,
    expertReview: true
  }
]

const mockConfidenceData: ConfidenceData[] = [
  {
    id: '1',
    hsCode: '8471.30.01',
    confidence: 95,
    source: 'ai',
    timestamp: new Date().toISOString(),
    factors: {
      textAnalysis: 92,
      imageAnalysis: 98,
      historicalMatch: 94,
      complianceCheck: 96
    },
    breakdown: [
      {
        category: 'Product Description Match',
        score: 92,
        weight: 0.3,
        explanation: 'Strong match with laptop computer descriptions'
      },
      {
        category: 'Image Recognition',
        score: 98,
        weight: 0.25,
        explanation: 'High confidence laptop identification from image'
      },
      {
        category: 'Historical Classification',
        score: 94,
        weight: 0.2,
        explanation: 'Similar products classified consistently'
      },
      {
        category: 'Compliance Validation',
        score: 96,
        weight: 0.25,
        explanation: 'No compliance issues detected'
      }
    ],
    thresholds: {
      minimum: 60,
      recommended: 80,
      high: 90
    },
    risks: {
      level: 'low',
      factors: [],
      mitigation: []
    }
  }
]

export default function EnhancedClassificationLayout({
  initialData = mockClassificationData,
  confidenceData = mockConfidenceData,
  onDataChange,
  onNewClassification,
  settings: userSettings = {},
  userPermissions = defaultPermissions
}: EnhancedClassificationLayoutProps) {
  const [data, setData] = useState<ClassificationItem[]>(initialData)
  const [filteredData, setFilteredData] = useState<ClassificationItem[]>(initialData)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState(userSettings.defaultTab || defaultSettings.defaultTab)
  const [settings, setSettings] = useState<LayoutSettings>({ ...defaultSettings, ...userSettings })
  const [showWizard, setShowWizard] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedConfidenceId, setSelectedConfidenceId] = useState<string>()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Handle data updates
  const handleDataChange = useCallback((newData: ClassificationItem[]) => {
    setData(newData)
    onDataChange?.(newData)
  }, [onDataChange])

  const handleFilteredDataChange = useCallback((filtered: ClassificationItem[]) => {
    setFilteredData(filtered)
  }, [])

  const handleNewClassification = useCallback((classificationData: any) => {
    const newItem: ClassificationItem = {
      id: Date.now().toString(),
      hsCode: classificationData.hsCode,
      productName: classificationData.productName,
      productDescription: classificationData.productDescription,
      category: classificationData.category || 'Uncategorized',
      confidence: classificationData.confidence || 0,
      source: 'ai',
      timestamp: new Date().toISOString(),
      originCountry: classificationData.originCountry,
      destinationCountry: classificationData.destinationCountry,
      riskLevel: classificationData.riskLevel || 'low',
      tags: classificationData.tags || [],
      validationStatus: 'pending',
      complianceFlags: classificationData.complianceFlags || [],
      alternativeCodes: classificationData.alternativeCodes,
      imageAnalysis: !!classificationData.imageAnalysis,
      expertReview: false
    }
    
    const updatedData = [newItem, ...data]
    setData(updatedData)
    onNewClassification?.(classificationData)
    setShowWizard(false)
  }, [data, onNewClassification])

  const updateSettings = useCallback(<K extends keyof LayoutSettings>(
    key: K,
    value: LayoutSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  // Quick actions
  const quickActions = useMemo(() => [
    {
      label: 'New Classification',
      icon: Plus,
      action: () => setShowWizard(true),
      disabled: !userPermissions.canClassify,
      variant: 'default' as const
    },
    {
      label: 'Export Data',
      icon: Download,
      action: () => console.log('Export data'),
      disabled: !userPermissions.canExport,
      variant: 'outline' as const
    },
    {
      label: 'Refresh',
      icon: RefreshCw,
      action: () => console.log('Refresh data'),
      disabled: false,
      variant: 'outline' as const
    }
  ], [userPermissions])

  // Sidebar content
  const renderSidebar = () => (
    <div className="h-full flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Classification Tools</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="font-semibold text-blue-600">{data.length}</div>
            <div className="text-gray-600">Total</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-semibold text-green-600">
              {data.filter(item => item.validationStatus === 'validated').length}
            </div>
            <div className="text-gray-600">Validated</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="font-semibold text-yellow-600">
              {data.filter(item => item.validationStatus === 'pending').length}
            </div>
            <div className="text-gray-600">Pending</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="font-semibold text-red-600">
              {data.filter(item => item.riskLevel === 'high').length}
            </div>
            <div className="text-gray-600">High Risk</div>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Quick Actions */}
      {settings.showQuickActions && (
        <div className="p-4 space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Quick Actions</h4>
          <div className="space-y-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant}
                size="sm"
                className="w-full justify-start"
                onClick={action.action}
                disabled={action.disabled}
              >
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      <Separator />
      
      {/* Recent Activity */}
      <div className="p-4 flex-1">
        <h4 className="font-medium text-sm text-gray-700 mb-2">Recent Activity</h4>
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {data.slice(0, 5).map((item) => (
              <div key={item.id} className="p-2 bg-gray-50 rounded text-xs">
                <div className="font-medium">{item.hsCode}</div>
                <div className="text-gray-600 truncate">{item.productName}</div>
                <div className="flex items-center justify-between mt-1">
                  <Badge variant="outline" className="text-xs">
                    {item.confidence}%
                  </Badge>
                  <span className="text-gray-500">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )

  // Main content based on active tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <EnhancedClassificationDashboard
            data={filteredData}
            onItemSelect={(id) => setSelectedItems([id])}
            viewMode={settings.viewMode}
            compactMode={settings.compactMode}
          />
        )
      
      case 'search':
        return (
          <ClassificationSearch
            data={data}
            onResultsChange={handleFilteredDataChange}
            onSelectionChange={setSelectedItems}
            showBulkActions={userPermissions.canValidate}
          />
        )
      
      case 'classify':
        return (
          <HSCodeClassifier
            onClassificationComplete={handleNewClassification}
          />
        )
      
      case 'compare':
        return (
          <ClassificationComparison
            data={filteredData.filter(item => selectedItems.includes(item.id))}
            onSelectionChange={setSelectedItems}
          />
        )
      
      case 'confidence':
        return (
          <ConfidenceVisualization
            data={confidenceData}
            selectedId={selectedConfidenceId}
            onSelectData={setSelectedConfidenceId}
            interactive={true}
          />
        )
      
      default:
        return <div>Tab content not found</div>
    }
  }

  return (
    <div className={`h-screen flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Header */}
      <div className="border-b bg-white">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            {sidebarCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(false)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            
            <div>
              <h1 className="text-2xl font-bold">Enhanced Classification</h1>
              <p className="text-gray-600">
                {filteredData.length} of {data.length} classifications
                {selectedItems.length > 0 && ` • ${selectedItems.length} selected`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 border rounded p-1">
              <Button
                variant={settings.viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => updateSettings('viewMode', 'grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={settings.viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => updateSettings('viewMode', 'list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            
            {userPermissions.canManageSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <span>Search</span>
              </TabsTrigger>
              <TabsTrigger value="classify" className="flex items-center space-x-2">
                <Wand2 className="h-4 w-4" />
                <span>Classify</span>
              </TabsTrigger>
              <TabsTrigger value="compare" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Compare</span>
              </TabsTrigger>
              <TabsTrigger value="confidence" className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Confidence</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          {settings.showSidebar && !sidebarCollapsed && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                <div className="h-full border-r bg-gray-50">
                  {renderSidebar()}
                </div>
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}
          
          {/* Main Content */}
          <ResizablePanel defaultSize={settings.showSidebar && !sidebarCollapsed ? 80 : 100}>
            <div className="h-full overflow-auto p-6">
              {renderMainContent()}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      {/* Classification Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">New Classification</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowWizard(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <ClassificationWizard
                onComplete={handleNewClassification}
                onCancel={() => setShowWizard(false)}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Layout Settings</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Show Sidebar</Label>
                <Switch
                  checked={settings.showSidebar}
                  onCheckedChange={(checked) => updateSettings('showSidebar', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Compact Mode</Label>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(checked) => updateSettings('compactMode', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Show Quick Actions</Label>
                <Switch
                  checked={settings.showQuickActions}
                  onCheckedChange={(checked) => updateSettings('showQuickActions', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Auto Refresh</Label>
                <Switch
                  checked={settings.autoRefresh}
                  onCheckedChange={(checked) => updateSettings('autoRefresh', checked)}
                />
              </div>
              
              {settings.autoRefresh && (
                <div className="space-y-2">
                  <Label>Refresh Interval (seconds)</Label>
                  <Select
                    value={settings.refreshInterval.toString()}
                    onValueChange={(value) => updateSettings('refreshInterval', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Default Tab</Label>
                <Select
                  value={settings.defaultTab}
                  onValueChange={(value) => updateSettings('defaultTab', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="search">Search</SelectItem>
                    <SelectItem value="classify">Classify</SelectItem>
                    <SelectItem value="compare">Compare</SelectItem>
                    <SelectItem value="confidence">Confidence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}