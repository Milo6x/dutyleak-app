'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Settings, 
  FileText, 
  Database, 
  Key, 
  HardDrive,
  ArrowRight 
} from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()

  const adminSections = [
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: Users,
      action: () => router.push('/admin/users'),
      available: true
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings',
      icon: Settings,
      action: () => router.push('/settings'),
      available: true
    },
    {
      title: 'Audit Logs',
      description: 'View system audit logs',
      icon: FileText,
      action: () => router.push('/admin/logs'),
      available: true
    },
    {
      title: 'Data Management',
      description: 'Manage data imports and exports',
      icon: Database,
      action: () => router.push('/settings/data'),
      available: true
    },
    {
      title: 'API Keys',
      description: 'Manage API keys and integrations',
      icon: Key,
      action: () => router.push('/settings/api-keys'),
      available: true
    },
    {
      title: 'Backup & Restore',
      description: 'Backup and restore system data',
      icon: HardDrive,
      action: () => router.push('/admin/backup'),
      available: true
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage system settings and administrative functions</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section, index) => {
          const Icon = section.icon
          return (
            <Card key={index} className={`transition-all duration-200 ${section.available ? 'hover:shadow-lg cursor-pointer' : 'opacity-60'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-blue-600" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant={section.available ? "ghost" : "outline"}
                  className="w-full justify-between"
                  onClick={section.available ? section.action : undefined}
                  disabled={!section.available}
                >
                  {section.available ? 'Access' : 'Coming Soon'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}