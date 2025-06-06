'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  FileText, 
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  resource: string
  details: string
  status: 'success' | 'error' | 'warning'
  ipAddress: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading audit logs
    setTimeout(() => {
      setLogs([
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00Z',
          user: 'admin@dutyleak.com',
          action: 'LOGIN',
          resource: 'Authentication',
          details: 'User logged in successfully',
          status: 'success',
          ipAddress: '192.168.1.100'
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:25:00Z',
          user: 'user@example.com',
          action: 'PRODUCT_IMPORT',
          resource: 'Products',
          details: 'Imported 150 products from CSV file',
          status: 'success',
          ipAddress: '192.168.1.101'
        },
        {
          id: '3',
          timestamp: '2024-01-15T10:20:00Z',
          user: 'user@example.com',
          action: 'CLASSIFICATION_UPDATE',
          resource: 'HS Codes',
          details: 'Updated HS code for product ID: 12345',
          status: 'success',
          ipAddress: '192.168.1.101'
        },
        {
          id: '4',
          timestamp: '2024-01-15T10:15:00Z',
          user: 'system',
          action: 'BACKUP_FAILED',
          resource: 'Database',
          details: 'Automated backup failed - disk space insufficient',
          status: 'error',
          ipAddress: 'localhost'
        },
        {
          id: '5',
          timestamp: '2024-01-15T10:10:00Z',
          user: 'viewer@example.com',
          action: 'UNAUTHORIZED_ACCESS',
          resource: 'Admin Panel',
          details: 'Attempted to access admin panel without permissions',
          status: 'warning',
          ipAddress: '192.168.1.102'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600 mt-1">View system audit logs and user activities</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">View system audit logs and user activities</p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => {
            toast.success('Exporting logs...')
            // TODO: Implement log export functionality
            console.log('Export system logs')
          }}
        >
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Logs ({filteredLogs.length})
          </CardTitle>
          <CardDescription>
            System activities and user actions are logged here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex items-center justify-center">
                    {getStatusIcon(log.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-gray-900">{log.action}</h3>
                      <Badge className={getStatusBadgeColor(log.status)}>
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{log.details}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.user}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      <div>IP: {log.ipAddress}</div>
                      <div>Resource: {log.resource}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No logs found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}