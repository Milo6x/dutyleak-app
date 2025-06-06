'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Save, 
  FolderOpen, 
  Copy, 
  Trash2, 
  Play, 
  BarChart3, 
  Settings, 
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { ScenarioService } from '@/lib/services/scenario-service'
import { EnhancedScenario, ScenarioGroup, ScenarioTemplate } from '@/types/scenario'
import { createBrowserClient } from '@/lib/supabase'

interface ScenarioManagementUIProps {
  currentState?: any // Current scenario state to save
  onScenarioLoad?: (scenario: EnhancedScenario) => void
  onScenariosSelect?: (scenarios: EnhancedScenario[]) => void
  maxSelectableScenarios?: number
  showComparison?: boolean
}

export default function ScenarioManagementUI({
  currentState,
  onScenarioLoad,
  onScenariosSelect,
  maxSelectableScenarios = 2,
  showComparison = true
}: ScenarioManagementUIProps) {
  const [scenarios, setScenarios] = useState<EnhancedScenario[]>([])
  const [scenarioGroups, setScenarioGroups] = useState<ScenarioGroup[]>([])
  const [scenarioTemplates, setScenarioTemplates] = useState<ScenarioTemplate[]>([])
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'scenarios' | 'groups' | 'templates'>('scenarios')
  
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
    groupId: '',
    tags: [] as string[],
    isTemplate: false
  })
  
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  const scenarioService = new ScenarioService()
  const supabase = createBrowserClient()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please log in to access scenarios')
        return
      }
      setUser(user)
    } catch (error) {
      console.error('Error checking user:', error)
      setError('Authentication error')
    }
  }

  const loadData = async () => {
    if (!user) {return}
    
    try {
      setLoading(true)
      const workspaceId = user.id
      const [scenariosData, groupsData, templatesData] = await Promise.all([
        scenarioService.getScenarios(workspaceId),
        scenarioService.getScenarioGroups(workspaceId),
        scenarioService.getScenarioTemplates(workspaceId)
      ])
      
      setScenarios(scenariosData)
      setScenarioGroups(groupsData)
      setScenarioTemplates(templatesData)
    } catch (error) {
      console.error('Error loading scenario data:', error)
      toast.error('Failed to load scenarios')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveScenario = async () => {
    if (!currentState || !saveForm.name.trim()) {
      toast.error('Please provide a scenario name')
      return
    }

    try {
      setSaving(true)
      
      if (saveForm.isTemplate) {
        await scenarioService.createScenarioTemplate({
          workspace_id: user.id,
          name: saveForm.name,
          description: saveForm.description,
          category: 'analysis',
          configuration: currentState
        })
        toast.success('Scenario template saved successfully')
      } else {
          await scenarioService.createScenario({
            name: saveForm.name,
            description: saveForm.description,
            scenario_type: 'optimization',
            group_id: saveForm.groupId || undefined,
            configuration: currentState,
            product_ids: [],
            workspace_id: user.id
          })
        toast.success('Scenario saved successfully')
      }
      
      setShowSaveDialog(false)
      setSaveForm({ name: '', description: '', groupId: '', tags: [], isTemplate: false })
      await loadData()
    } catch (error) {
      console.error('Error saving scenario:', error)
      toast.error('Failed to save scenario')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) {
      toast.error('Please provide a group name')
      return
    }

    try {
      await scenarioService.createScenarioGroup({
        workspace_id: user.id,
        name: groupForm.name,
        description: groupForm.description,
        metadata: { color: groupForm.color }
      })
      
      setShowGroupDialog(false)
      setGroupForm({ name: '', description: '', color: '#3B82F6' })
      toast.success('Scenario group created successfully')
      await loadData()
    } catch (error) {
      console.error('Error creating group:', error)
      toast.error('Failed to create group')
    }
  }

  const handleLoadScenario = async (scenario: EnhancedScenario) => {
    try {
      if (onScenarioLoad) {
        onScenarioLoad(scenario)
        toast.success(`Loaded scenario: ${scenario.name}`)
      }
    } catch (error) {
      console.error('Error loading scenario:', error)
      toast.error('Failed to load scenario')
    }
  }

  const handleScenarioSelection = (scenarioId: string, selected: boolean) => {
    let newSelection = [...selectedScenarios]
    
    if (selected) {
      if (newSelection.length < maxSelectableScenarios) {
        newSelection.push(scenarioId)
      } else {
        toast.warning(`You can only select up to ${maxSelectableScenarios} scenarios`)
        return
      }
    } else {
      newSelection = newSelection.filter(id => id !== scenarioId)
    }
    
    setSelectedScenarios(newSelection)
    
    if (onScenariosSelect && newSelection.length > 0) {
      const selectedScenarioObjects = scenarios.filter(s => newSelection.includes(s.id))
      onScenariosSelect(selectedScenarioObjects)
    }
  }

  const handleDeleteScenario = async (scenarioId: string) => {
    if (!confirm('Are you sure you want to delete this scenario?')) {return}
    
    try {
      await scenarioService.deleteScenario(scenarioId)
      toast.success('Scenario deleted successfully')
      await loadData()
    } catch (error) {
      console.error('Error deleting scenario:', error)
      toast.error('Failed to delete scenario')
    }
  }

  const handleDuplicateScenario = async (scenario: EnhancedScenario) => {
    try {
      await scenarioService.createScenario({
        name: `${scenario.name} (Copy)`,
        description: scenario.description,
        scenario_type: scenario.scenario_type,
        group_id: scenario.group_id,
        configuration: scenario.configuration,
        product_ids: [],
        workspace_id: user.id
      })
      toast.success('Scenario duplicated successfully')
      await loadData()
    } catch (error) {
      console.error('Error duplicating scenario:', error)
      toast.error('Failed to duplicate scenario')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading scenarios...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Scenario Management
            </CardTitle>
            <CardDescription>
              Save, load, and manage your scenario configurations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {currentState && (
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Current
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Scenario</DialogTitle>
                    <DialogDescription>
                      Save your current scenario configuration for future use
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={saveForm.name}
                        onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter scenario name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={saveForm.description}
                        onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe this scenario"
                      />
                    </div>
                    <div>
                      <Label htmlFor="group">Group (Optional)</Label>
                      <Select
                        value={saveForm.groupId}
                        onValueChange={(value) => setSaveForm(prev => ({ ...prev, groupId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                        <SelectContent>
                          {scenarioGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="template"
                        checked={saveForm.isTemplate}
                        onCheckedChange={(checked) => 
                          setSaveForm(prev => ({ ...prev, isTemplate: checked as boolean }))
                        }
                      />
                      <Label htmlFor="template">Save as template</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveScenario} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            
            <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Scenario Group</DialogTitle>
                  <DialogDescription>
                    Organize your scenarios into groups
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="groupName">Name</Label>
                    <Input
                      id="groupName"
                      value={groupForm.name}
                      onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter group name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="groupDescription">Description</Label>
                    <Textarea
                      id="groupDescription"
                      value={groupForm.description}
                      onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe this group"
                    />
                  </div>
                  <div>
                    <Label htmlFor="groupColor">Color</Label>
                    <Input
                      id="groupColor"
                      type="color"
                      value={groupForm.color}
                      onChange={(e) => setGroupForm(prev => ({ ...prev, color: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateGroup}>
                      Create Group
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'scenarios'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Scenarios ({scenarios.length})
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'groups'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Groups ({scenarioGroups.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Templates ({scenarioTemplates.length})
            </button>
          </div>

          {/* Scenarios Tab */}
          {activeTab === 'scenarios' && (
            <div className="space-y-3">
              {showComparison && selectedScenarios.length > 0 && (
                <Alert>
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription>
                    {selectedScenarios.length} scenario(s) selected for comparison.
                    {selectedScenarios.length === maxSelectableScenarios && (
                      <Button
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          const selectedScenarioObjects = scenarios.filter(s => selectedScenarios.includes(s.id))
                          onScenariosSelect?.(selectedScenarioObjects)
                        }}
                      >
                        Compare Selected
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              {scenarios.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No saved scenarios yet</p>
                  <p className="text-sm">Save your current configuration to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {scenarios.map((scenario) => {
                    const group = scenarioGroups.find(g => g.id === scenario.group_id)
                    const isSelected = selectedScenarios.includes(scenario.id)
                    
                    return (
                      <div
                        key={scenario.id}
                        className={`p-3 border rounded-lg transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {showComparison && (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => 
                                    handleScenarioSelection(scenario.id, checked as boolean)
                                  }
                                  disabled={!isSelected && selectedScenarios.length >= maxSelectableScenarios}
                                />
                              )}
                              <h4 className="font-medium text-sm text-gray-900 truncate">
                                {scenario.name}
                              </h4>
                            </div>
                            {scenario.description && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {scenario.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className={getStatusColor(scenario.status)}>
                                {getStatusIcon(scenario.status)}
                                <span className="ml-1">{scenario.status}</span>
                              </Badge>
                              {group && (
                                <Badge 
                                  variant="outline" 
                                  style={{ borderColor: group.metadata?.color, color: group.metadata?.color }}
                                >
                                  {group.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleLoadScenario(scenario)}
                              className="h-8 w-8 p-0"
                            >
                              <FolderOpen className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDuplicateScenario(scenario)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteScenario(scenario.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(scenario.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Groups Tab */}
          {activeTab === 'groups' && (
            <div className="space-y-3">
              {scenarioGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No scenario groups yet</p>
                  <p className="text-sm">Create groups to organize your scenarios</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scenarioGroups.map((group) => (
                    <div key={group.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: group.metadata?.color }}
                        />
                        <h4 className="font-medium text-sm">{group.name}</h4>
                      </div>
                      {group.description && (
                        <p className="text-xs text-gray-600 mb-2">{group.description}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        {scenarios.filter(s => s.group_id === group.id).length} scenarios
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-3">
              {scenarioTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No scenario templates yet</p>
                  <p className="text-sm">Save scenarios as templates for quick reuse</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scenarioTemplates.map((template) => (
                    <div key={template.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      {template.description && (
                        <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                      )}
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Create scenario from template
                            if (onScenarioLoad) {
                              const scenarioFromTemplate: EnhancedScenario = {
                                id: `template-${template.id}`,
                                workspace_id: template.workspace_id,
                                name: `${template.name} (from template)`,
                                description: template.description,
                                scenario_type: 'optimization',
                                configuration: template.configuration,
                                status: 'draft',
                                results: {
                                  summary: {
                                    total_products: 0,
                                    total_current_cost: 0,
                                    total_optimized_cost: 0,
                                    total_savings: 0,
                                    total_savings_percentage: 0,
                                    average_roi: 0,
                                    execution_time_ms: 0,
                                    last_updated: new Date().toISOString()
                                  },
                                  breakdown: {
                                    duty_savings: 0,
                                    vat_savings: 0,
                                    shipping_savings: 0,
                                    fba_savings: 0,
                                    other_savings: 0
                                  },
                                  recommendations: [],
                                  risk_assessment: {
                                     compliance_risk: 'low',
                                     supplier_risk: 'low',
                                     market_risk: 'low',
                                     operational_risk: 'low',
                                     overall_risk: 'low',
                                     risk_factors: [],
                                     mitigation_strategies: []
                                   },
                                  implementation_timeline: {
                                      phases: [],
                                      total_duration_weeks: 0,
                                      critical_path: [],
                                      milestones: []
                                    },
                                   metadata: {}
                                 },
                                created_by: template.created_by,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                              }
                              onScenarioLoad(scenarioFromTemplate)
                              toast.success(`Loaded template: ${template.name}`)
                            }
                          }}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Use Template
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}