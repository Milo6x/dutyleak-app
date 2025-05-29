'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  PlusIcon,
  PlayIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

interface Scenario {
  id: string
  name: string
  description: string
  status: 'draft' | 'running' | 'completed' | 'failed'
  created_at: string
  updated_at: string
  total_products: number
  potential_savings: number
  parameters: {
    origin_country?: string
    destination_country?: string
    product_categories?: string[]
    min_value?: number
    max_value?: number
  }
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

      if (error) throw error
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
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const scenarioData = {
        name: newScenario.name,
        description: newScenario.description,
        workspace_id: profile.workspace_id,
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

      if (error) throw error

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

      if (!response.ok) throw new Error('Failed to run scenario')

      fetchScenarios()
    } catch (error) {
      console.error('Error running scenario:', error)
    }
  }

  const deleteScenario = async (scenarioId: string) => {
    if (!confirm('Are you sure you want to delete this scenario?')) return

    try {
      const { error } = await supabase
        .from('duty_scenarios')
        .delete()
        .eq('id', scenarioId)

      if (error) throw error
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
            <h1 className="text-2xl font-bold text-gray-900">Duty Scenarios</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage duty optimization scenarios
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Scenario
          </button>
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
                      <PlayIcon className="h-3 w-3 mr-1" />
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
                    <TrashIcon className="h-4 w-4" />
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
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
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