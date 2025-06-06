'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { 
  HardDrive, 
  Download,
  Upload,
  Calendar,
  Database,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

interface Backup {
  id: string
  name: string
  type: 'full' | 'incremental' | 'differential'
  status: 'completed' | 'failed' | 'in-progress' | 'scheduled'
  size: string
  createdAt: string
  duration: string
}

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [backupInProgress, setBackupInProgress] = useState(false)
  const [backupProgress, setBackupProgress] = useState(0)

  useEffect(() => {
    // Simulate loading backup history
    setTimeout(() => {
      setBackups([
        {
          id: '1',
          name: 'Full System Backup - 2024-01-15',
          type: 'full',
          status: 'completed',
          size: '2.4 GB',
          createdAt: '2024-01-15T02:00:00Z',
          duration: '45 minutes'
        },
        {
          id: '2',
          name: 'Incremental Backup - 2024-01-14',
          type: 'incremental',
          status: 'completed',
          size: '156 MB',
          createdAt: '2024-01-14T02:00:00Z',
          duration: '8 minutes'
        },
        {
          id: '3',
          name: 'Full System Backup - 2024-01-13',
          type: 'full',
          status: 'failed',
          size: '0 MB',
          createdAt: '2024-01-13T02:00:00Z',
          duration: '12 minutes'
        },
        {
          id: '4',
          name: 'Incremental Backup - 2024-01-12',
          type: 'incremental',
          status: 'completed',
          size: '89 MB',
          createdAt: '2024-01-12T02:00:00Z',
          duration: '5 minutes'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const startBackup = async (type: 'full' | 'incremental') => {
    setBackupInProgress(true)
    setBackupProgress(0)
    
    // Simulate backup progress
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setBackupInProgress(false)
          // Add new backup to list
          const newBackup: Backup = {
            id: Date.now().toString(),
            name: `${type === 'full' ? 'Full System' : 'Incremental'} Backup - ${new Date().toISOString().split('T')[0]}`,
            type,
            status: 'completed',
            size: type === 'full' ? '2.6 GB' : '124 MB',
            createdAt: new Date().toISOString(),
            duration: type === 'full' ? '42 minutes' : '6 minutes'
          }
          setBackups(prev => [newBackup, ...prev])
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'in-progress': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'scheduled': return <Clock className="h-4 w-4 text-yellow-500" />
      default: return <Database className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'scheduled': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'full': return 'bg-purple-100 text-purple-800'
      case 'incremental': return 'bg-blue-100 text-blue-800'
      case 'differential': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Backup & Restore</h1>
            <p className="text-gray-600 mt-1">Manage system backups and data recovery</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backup & Restore</h1>
          <p className="text-gray-600 mt-1">Manage system backups and data recovery</p>
        </div>
      </div>

      {/* Backup Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Create Backup
            </CardTitle>
            <CardDescription>
              Create a new backup of your system data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button 
                onClick={() => startBackup('full')}
                disabled={backupInProgress}
                className="flex-1"
              >
                <HardDrive className="h-4 w-4 mr-2" />
                Full Backup
              </Button>
              <Button 
                variant="outline"
                onClick={() => startBackup('incremental')}
                disabled={backupInProgress}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Incremental
              </Button>
            </div>
            
            {backupInProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Backup in progress...</span>
                  <span>{backupProgress}%</span>
                </div>
                <Progress value={backupProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restore Data
            </CardTitle>
            <CardDescription>
              Restore system data from a backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Drop backup file here or click to browse</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast.success('Opening file browser...')
                  // TODO: Implement file selection functionality
                  console.log('Select backup file')
                }}
              >
                Select File
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Restoring will overwrite current data</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Backup History ({backups.length})
          </CardTitle>
          <CardDescription>
            View and manage your backup files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center">
                    {getStatusIcon(backup.status)}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{backup.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(backup.createdAt).toLocaleString()}
                      </div>
                      <div>Size: {backup.size}</div>
                      <div>Duration: {backup.duration}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={getTypeBadgeColor(backup.type)}>
                    {backup.type}
                  </Badge>
                  <Badge className={getStatusBadgeColor(backup.status)}>
                    {backup.status}
                  </Badge>
                  {backup.status === 'completed' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        toast.success(`Downloading backup: ${backup.name}`)
                        // TODO: Implement backup download functionality
                        console.log('Download backup:', backup.id)
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {backups.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No backups found. Create your first backup to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}