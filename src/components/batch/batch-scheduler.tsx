'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/external/sonner-mock'
import { Calendar, Clock, Play, Pause, Trash2, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface ScheduledJob {
  id: string
  name: string
  type: 'classification' | 'fba_calculation' | 'data_export' | 'data_import'
  schedule: {
    type: 'once' | 'daily' | 'weekly' | 'monthly'
    time: string // HH:MM format
    date?: string // YYYY-MM-DD format for 'once' type
    dayOfWeek?: number // 0-6 for weekly (0 = Sunday)
    dayOfMonth?: number // 1-31 for monthly
  }
  parameters: {
    productIds?: string[]
    filters?: Record<string, any>
    priority: 'low' | 'medium' | 'high'
  }
  isActive: boolean
  lastRun?: string
  nextRun?: string
  createdAt: string
}

interface BatchSchedulerProps {
  onClose?: () => void
}

export function BatchScheduler({ onClose }: BatchSchedulerProps) {
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // New job form state
  const [newJob, setNewJob] = useState({
    name: '',
    type: 'classification' as ScheduledJob['type'],
    scheduleType: 'daily' as ScheduledJob['schedule']['type'],
    time: '09:00',
    date: '',
    dayOfWeek: 1,
    dayOfMonth: 1,
    priority: 'medium' as ScheduledJob['parameters']['priority'],
    filters: {}
  })

  // Load scheduled jobs
  useEffect(() => {
    loadScheduledJobs()
  }, [])

  const loadScheduledJobs = async () => {
    setIsLoading(true)
    try {
      // In a real implementation, this would fetch from an API
      // For now, we'll use localStorage as a mock
      const stored = localStorage.getItem('scheduledJobs')
      if (stored) {
        setScheduledJobs(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load scheduled jobs:', error)
      toast.error('Failed to load scheduled jobs')
    } finally {
      setIsLoading(false)
    }
  }

  const saveScheduledJobs = (jobs: ScheduledJob[]) => {
    localStorage.setItem('scheduledJobs', JSON.stringify(jobs))
    setScheduledJobs(jobs)
  }

  const createScheduledJob = () => {
    if (!newJob.name.trim()) {
      toast.error('Job name is required')
      return
    }

    const schedule: ScheduledJob['schedule'] = {
      type: newJob.scheduleType,
      time: newJob.time
    }

    if (newJob.scheduleType === 'once') {
      if (!newJob.date) {
        toast.error('Date is required for one-time jobs')
        return
      }
      schedule.date = newJob.date
    } else if (newJob.scheduleType === 'weekly') {
      schedule.dayOfWeek = newJob.dayOfWeek
    } else if (newJob.scheduleType === 'monthly') {
      schedule.dayOfMonth = newJob.dayOfMonth
    }

    const job: ScheduledJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newJob.name,
      type: newJob.type,
      schedule,
      parameters: {
        priority: newJob.priority,
        filters: newJob.filters
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      nextRun: calculateNextRun(schedule)
    }

    const updatedJobs = [...scheduledJobs, job]
    saveScheduledJobs(updatedJobs)
    
    // Reset form
    setNewJob({
      name: '',
      type: 'classification',
      scheduleType: 'daily',
      time: '09:00',
      date: '',
      dayOfWeek: 1,
      dayOfMonth: 1,
      priority: 'medium',
      filters: {}
    })
    
    setIsCreateDialogOpen(false)
    toast.success('Scheduled job created successfully')
  }

  const calculateNextRun = (schedule: ScheduledJob['schedule']): string => {
    const now = new Date()
    const [hours, minutes] = schedule.time.split(':').map(Number)
    
    let nextRun = new Date()
    nextRun.setHours(hours, minutes, 0, 0)
    
    switch (schedule.type) {
      case 'once':
        if (schedule.date) {
          nextRun = new Date(`${schedule.date}T${schedule.time}:00`)
        }
        break
      
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1)
        }
        break
      
      case 'weekly':
        const targetDay = schedule.dayOfWeek || 1
        const currentDay = nextRun.getDay()
        let daysUntilTarget = targetDay - currentDay
        
        if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextRun <= now)) {
          daysUntilTarget += 7
        }
        
        nextRun.setDate(nextRun.getDate() + daysUntilTarget)
        break
      
      case 'monthly':
        const targetDate = schedule.dayOfMonth || 1
        nextRun.setDate(targetDate)
        
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1)
        }
        break
    }
    
    return nextRun.toISOString()
  }

  const toggleJobStatus = (jobId: string) => {
    const updatedJobs = scheduledJobs.map(job => 
      job.id === jobId 
        ? { ...job, isActive: !job.isActive }
        : job
    )
    saveScheduledJobs(updatedJobs)
    toast.success('Job status updated')
  }

  const deleteJob = (jobId: string) => {
    const updatedJobs = scheduledJobs.filter(job => job.id !== jobId)
    saveScheduledJobs(updatedJobs)
    toast.success('Scheduled job deleted')
  }

  const formatSchedule = (schedule: ScheduledJob['schedule']) => {
    const timeStr = schedule.time
    
    switch (schedule.type) {
      case 'once':
        return `Once on ${schedule.date} at ${timeStr}`
      case 'daily':
        return `Daily at ${timeStr}`
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return `Weekly on ${days[schedule.dayOfWeek || 1]} at ${timeStr}`
      case 'monthly':
        return `Monthly on day ${schedule.dayOfMonth} at ${timeStr}`
      default:
        return 'Unknown schedule'
    }
  }

  const getJobTypeColor = (type: ScheduledJob['type']) => {
    switch (type) {
      case 'classification': return 'bg-blue-100 text-blue-800'
      case 'fba_calculation': return 'bg-green-100 text-green-800'
      case 'data_export': return 'bg-purple-100 text-purple-800'
      case 'data_import': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: ScheduledJob['parameters']['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Batch Job Scheduler</h2>
          <p className="text-gray-600">Schedule and manage automated batch operations</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Schedule Job
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule New Job</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="jobName">Job Name</Label>
                  <Input
                    id="jobName"
                    value={newJob.name}
                    onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                    placeholder="Enter job name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="jobType">Job Type</Label>
                  <Select value={newJob.type} onValueChange={(value: ScheduledJob['type']) => setNewJob({ ...newJob, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classification">Classification</SelectItem>
                      <SelectItem value="fba_calculation">FBA Calculation</SelectItem>
                      <SelectItem value="data_export">Data Export</SelectItem>
                      <SelectItem value="data_import">Data Import</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="scheduleType">Schedule Type</Label>
                  <Select value={newJob.scheduleType} onValueChange={(value: ScheduledJob['schedule']['type']) => setNewJob({ ...newJob, scheduleType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newJob.time}
                    onChange={(e) => setNewJob({ ...newJob, time: e.target.value })}
                  />
                </div>
                
                {newJob.scheduleType === 'once' && (
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newJob.date}
                      onChange={(e) => setNewJob({ ...newJob, date: e.target.value })}
                    />
                  </div>
                )}
                
                {newJob.scheduleType === 'weekly' && (
                  <div>
                    <Label htmlFor="dayOfWeek">Day of Week</Label>
                    <Select value={newJob.dayOfWeek.toString()} onValueChange={(value) => setNewJob({ ...newJob, dayOfWeek: parseInt(value) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {newJob.scheduleType === 'monthly' && (
                  <div>
                    <Label htmlFor="dayOfMonth">Day of Month</Label>
                    <Input
                      id="dayOfMonth"
                      type="number"
                      min="1"
                      max="31"
                      value={newJob.dayOfMonth}
                      onChange={(e) => setNewJob({ ...newJob, dayOfMonth: parseInt(e.target.value) })}
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newJob.priority} onValueChange={(value: ScheduledJob['parameters']['priority']) => setNewJob({ ...newJob, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={createScheduledJob} className="flex-1">
                    Create Job
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
      
      {/* Scheduled Jobs List */}
      <div className="space-y-4">
        {scheduledJobs.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Jobs</h3>
                <p className="text-gray-600 mb-4">Create your first scheduled job to automate batch operations.</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Job
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          scheduledJobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={job.isActive}
                        onCheckedChange={() => toggleJobStatus(job.id)}
                      />
                      <span className={`text-sm ${job.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                        {job.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Badge className={getJobTypeColor(job.type)}>
                        {job.type.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(job.parameters.priority)}>
                        {job.parameters.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteJob(job.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <CardTitle className="text-lg">{job.name}</CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatSchedule(job.schedule)}</span>
                  </div>
                  
                  {job.nextRun && (
                    <div className="text-sm">
                      <span className="text-gray-600">Next run: </span>
                      <span className="font-medium">
                        {new Date(job.nextRun).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {job.lastRun && (
                    <div className="text-sm">
                      <span className="text-gray-600">Last run: </span>
                      <span className="font-medium">
                        {new Date(job.lastRun).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}