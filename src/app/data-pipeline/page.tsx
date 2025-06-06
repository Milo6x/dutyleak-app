'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import CSVImport from '@/components/imports/csv-import'
import { 
  Upload, 
  Database, 
  Settings, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Download,
  FileText,
  Zap
} from 'lucide-react'

interface Job {
  id: string
  name: string
  status: 'running' | 'completed' | 'failed' | 'pending'
  progress: number
  startTime: string
  duration?: string
  type: 'import' | 'sync' | 'analysis' | 'export'
}

interface SPAPIConnection {
  id: string
  name: string
  region: string
  status: 'connected' | 'disconnected' | 'error'
  lastSync: string
  productsCount: number
}

export default function DataPipelinePage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: '1',
      name: 'Product Import - Electronics.csv',
      status: 'running',
      progress: 65,
      startTime: '2024-01-15 14:30:00',
      type: 'import'
    },
    {
      id: '2',
      name: 'SP-API Sync - US East',
      status: 'completed',
      progress: 100,
      startTime: '2024-01-15 13:15:00',
      duration: '12m 34s',
      type: 'sync'
    },
    {
      id: '3',
      name: 'Profitability Analysis',
      status: 'pending',
      progress: 0,
      startTime: '2024-01-15 15:00:00',
      type: 'analysis'
    }
  ])

  const [connections, setConnections] = useState<SPAPIConnection[]>([
    {
      id: '1',
      name: 'US East Region',
      region: 'us-east-1',
      status: 'connected',
      lastSync: '2024-01-15 13:15:00',
      productsCount: 1247
    },
    {
      id: '2',
      name: 'EU West Region',
      region: 'eu-west-1',
      status: 'disconnected',
      lastSync: '2024-01-14 09:30:00',
      productsCount: 892
    }
  ])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      running: 'default',
      completed: 'default',
      failed: 'destructive',
      pending: 'secondary',
      connected: 'default',
      disconnected: 'secondary',
      error: 'destructive'
    } as const
    
    return variants[status as keyof typeof variants] || 'secondary'
  }

  const pipelineStats = [
    {
      title: 'Active Jobs',
      value: jobs.filter(j => j.status === 'running').length.toString(),
      icon: Play,
      color: 'text-blue-600'
    },
    {
      title: 'Completed Today',
      value: jobs.filter(j => j.status === 'completed').length.toString(),
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'SP-API Connections',
      value: connections.filter(c => c.status === 'connected').length.toString(),
      icon: Database,
      color: 'text-purple-600'
    },
    {
      title: 'Total Products',
      value: connections.reduce((sum, c) => sum + c.productsCount, 0).toLocaleString(),
      icon: FileText,
      color: 'text-orange-600'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Pipeline</h1>
          <p className="text-gray-600 mt-1">Manage data imports, API connections, and background processing</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              // Export system logs functionality
              const logs = {
                timestamp: new Date().toISOString(),
                imports: 'CSV import logs...',
                api: 'SP-API connection logs...',
                jobs: 'Background job logs...'
              }
              const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `dutyleak-logs-${new Date().toISOString().split('T')[0]}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
          <Button
            onClick={() => {
              // Navigate to import page or show import modal
              window.location.href = '/products/import'
            }}
          >
            <Zap className="h-4 w-4 mr-2" />
            New Import
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="imports">CSV Imports</TabsTrigger>
          <TabsTrigger value="api">SP-API</TabsTrigger>
          <TabsTrigger value="jobs">Background Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Pipeline Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pipelineStats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Jobs</CardTitle>
                <CardDescription>Latest data processing activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jobs.slice(0, 3).map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <p className="font-medium text-sm">{job.name}</p>
                          <p className="text-xs text-gray-500">{job.startTime}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusBadge(job.status)}>
                          {job.status}
                        </Badge>
                        {job.status === 'running' && (
                          <div className="mt-1">
                            <Progress value={job.progress} className="w-16 h-2" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Connections</CardTitle>
                <CardDescription>SP-API connection status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Database className={`h-4 w-4 ${
                          connection.status === 'connected' ? 'text-green-500' :
                          connection.status === 'error' ? 'text-red-500' :
                          'text-gray-500'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{connection.name}</p>
                          <p className="text-xs text-gray-500">{connection.productsCount} products</p>
                        </div>
                      </div>
                      <Badge variant={getStatusBadge(connection.status)}>
                        {connection.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('imports')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Start CSV Import
                </CardTitle>
                <CardDescription>
                  Import product data from CSV files with automatic mapping
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => {
                    toast.success('Opening file upload interface...')
                    // TODO: Implement file upload functionality
                    console.log('Navigate to file upload')
                  }}
                >
                  Upload Files →
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('api')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Manage SP-API
                </CardTitle>
                <CardDescription>
                  Configure and monitor Amazon SP-API connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => {
                    toast.success('Opening SP-API connections...')
                    // TODO: Implement SP-API connections view
                    console.log('Navigate to SP-API connections')
                  }}
                >
                  View Connections →
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('jobs')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Monitor Jobs
                </CardTitle>
                <CardDescription>
                  Track and manage background processing tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => {
                    toast.success('Opening job management...')
                    // TODO: Implement job management functionality
                    console.log('Navigate to job management')
                  }}
                >
                  Manage Jobs →
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="imports">
          <CSVImport />
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">SP-API Connections</h2>
              <p className="text-gray-600">Manage your Amazon Selling Partner API connections</p>
            </div>
            <Button
              onClick={() => {
                toast.success('Opening connection setup...')
                // TODO: Implement add connection functionality
                console.log('Add new SP-API connection')
              }}
            >
              <Database className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </div>

          <div className="grid gap-6">
            {connections.map((connection) => (
              <Card key={connection.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className={`h-6 w-6 ${
                        connection.status === 'connected' ? 'text-green-500' :
                        connection.status === 'error' ? 'text-red-500' :
                        'text-gray-500'
                      }`} />
                      <div>
                        <CardTitle>{connection.name}</CardTitle>
                        <CardDescription>Region: {connection.region}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={getStatusBadge(connection.status)}>
                      {connection.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium">Products</p>
                      <p className="text-2xl font-bold">{connection.productsCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Sync</p>
                      <p className="text-sm text-gray-600">{connection.lastSync}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-sm capitalize">{connection.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Sync
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Background Jobs</h2>
              <p className="text-gray-600">Monitor and manage data processing tasks</p>
            </div>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <h3 className="font-medium">{job.name}</h3>
                        <p className="text-sm text-gray-600">Started: {job.startTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadge(job.status)}>
                        {job.status}
                      </Badge>
                      {job.status === 'running' && (
                        <Button size="sm" variant="outline">
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {job.status === 'running' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{job.progress}%</span>
                      </div>
                      <Progress value={job.progress} className="w-full" />
                    </div>
                  )}
                  
                  {job.duration && (
                    <p className="text-sm text-gray-600 mt-2">Duration: {job.duration}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}