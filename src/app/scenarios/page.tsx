'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Play, Trash2, FileText, Clock, CheckCircle, AlertCircle, Calculator, ArrowRight, Bolt as BoltIcon, BarChart3 as ChartBarIcon, DollarSign as CurrencyDollarIcon, Copy as DocumentDuplicateIcon } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'

interface Scenario {
  id: string
  name: string
  description: string
  status: string
  created_at: string
  updated_at: string
  total_products: number | null
  potential_savings: number | null
  parameters: any
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newScenario, setNewScenario] = useState({
    name: '',
    description: '',
    origin_country: '',
    destination_country: 'US',
    product_categories: [] as string[],
    min_value: '',
    max_value: ''
  })
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    try {
      const { data, error } = await supabase
        .from('duty_scenarios')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) { throw error }
      setScenarios(data || [])
    } catch (error) {
      console.error('Error fetching scenarios:', error)
    } finally {
      setLoading(false)
    }
  }

  const createScenario = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { return }

      const { data: workspaceUser } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single()

      if (!workspaceUser) { return }

      const scenarioData = {
        name: newScenario.name,
        description: newScenario.description,
        workspace_id: workspaceUser.workspace_id,
        status: 'draft' as const,
        parameters: {
          origin_country: newScenario.origin_country,
          destination_country: newScenario.destination_country,
          product_categories: newScenario.product_categories,
          min_value: newScenario.min_value ? parseFloat(newScenario.min_value) : undefined,
          max_value: newScenario.max_value ? parseFloat(newScenario.max_value) : undefined
        }
      }

      const { error } = await supabase
        .from('duty_scenarios')
        .insert([scenarioData])

      if (error) { throw error }

      setShowCreateModal(false)
      setNewScenario({
        name: '',
        description: '',
        origin_country: '',
        destination_country: 'US',
        product_categories: [],
        min_value: '',
        max_value: ''
      })
      fetchScenarios()
    } catch (error) {
      console.error('Error creating scenario:', error)
    }
  }

  const runScenario = async (scenarioId: string) => {
    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenario_id: scenarioId })
      })

      if (!response.ok) { throw new Error('Failed to run scenario') }

      fetchScenarios()
    } catch (error) {
      console.error('Error running scenario:', error)
    }
  }

  const deleteScenario = async (scenarioId: string) => {
    if (!confirm('Are you sure you want to delete this scenario?')) { return }

    try {
      const { error } = await supabase
        .from('duty_scenarios')
        .delete()
        .eq('id', scenarioId)

      if (error) { throw error }
      fetchScenarios()
    } catch (error) {
      console.error('Error deleting scenario:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scenarios</h1>
            <p className="text-gray-600">Manage and run duty calculation scenarios</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/scenario-modeler">
              <Button variant="outline" className="flex items-center gap-2">
                <BoltIcon className="h-4 w-4" />
                Enhanced Modeler
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button
               onClick={() => setShowCreateModal(true)}
               className="flex items-center gap-2"
             >
               <Plus className="h-4 w-4" />
               Create Scenario
             </Button>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Enhanced Scenario Modeler</h3>
              <p className="text-sm text-gray-600 mb-4">
                Advanced modeling with batch analysis, multi-scenario comparison, and comprehensive optimization
              </p>
              <Link href="/scenario-modeler">
                <Button className="w-full">
                  Launch Enhanced Modeler
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Quick Scenario</h3>
              <p className="text-sm text-gray-600 mb-4">
                Create and run a simple scenario for immediate analysis
              </p>
              <Button 
                 onClick={() => setShowCreateModal(true)}
                 variant="outline" 
                 className="w-full"
               >
                 Create Quick Scenario
               </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Play className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Saved Scenarios</h3>
              <p className="text-sm text-gray-600 mb-4">
                Access and manage your previously created scenarios
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  toast.success('Loading saved scenarios...')
                  // TODO: Implement view all scenarios functionality
                  console.log('View all saved scenarios')
                }}
              >
                View All ({scenarios.length})
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {scenario.name}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(scenario.status)}`}>
                    {scenario.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                  {scenario.description}
                </p>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <ChartBarIcon className="h-4 w-4 mr-2" />
                    {scenario.total_products || 0} products
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                    ${(scenario.potential_savings || 0).toLocaleString()} potential savings
                  </div>
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => runScenario(scenario.id)}
                      disabled={scenario.status === 'running'}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Run
                    </button>
                    <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
                      <DocumentDuplicateIcon className="h-3 w-3 mr-1" />
                      Clone
                    </button>
                  </div>
                  <button
                    onClick={() => deleteScenario(scenario.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {scenarios.length === 0 && (
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No scenarios</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new duty optimization scenario.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                New Scenario
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Scenario Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Scenario</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newScenario.name}
                    onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Scenario name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newScenario.description}
                    onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe this scenario"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Origin Country</label>
                    <input
                      type="text"
                      value={newScenario.origin_country}
                      onChange={(e) => setNewScenario({ ...newScenario, origin_country: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="CN"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Destination</label>
                    <select
                      value={newScenario.destination_country}
                      onChange={(e) => setNewScenario({ ...newScenario, destination_country: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="DE">Germany</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={createScenario}
                  disabled={!newScenario.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  Create Scenario
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}