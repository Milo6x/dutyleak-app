'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

interface CSVImportProps {
  onImportComplete?: (jobId: string) => void
  onClose?: () => void
}

interface ImportJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalRows: number
  validRows: number
  invalidRows: number
  processedRows?: number
  error?: string
}

interface ColumnMapping {
  [key: string]: string | null
}

interface ImportResult {
  success: boolean
  jobId: string
  totalRows: number
  validRows: number
  invalidRows: number
  invalidRowDetails?: any[]
  columnMapping: ColumnMapping
}

const EXPECTED_COLUMNS = [
  { key: 'title', label: 'Product Title', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'sku', label: 'SKU', required: false },
  { key: 'asin', label: 'ASIN', required: false },
  { key: 'price', label: 'Price', required: false },
  { key: 'cost', label: 'Cost', required: false },
  { key: 'weight', label: 'Weight', required: false },
  { key: 'length', label: 'Length', required: false },
  { key: 'width', label: 'Width', required: false },
  { key: 'height', label: 'Height', required: false },
  { key: 'hsCode', label: 'HS Code', required: false },
  { key: 'countryOfOrigin', label: 'Country of Origin', required: false },
  { key: 'yearlyUnits', label: 'Yearly Units', required: false },
]

export default function CSVImport({ onImportComplete, onClose }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [categoryId, setCategoryId] = useState<string>('')
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'complete'>('upload')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importJob, setImportJob] = useState<ImportJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient()

  const processFile = useCallback(async (csvFile: File) => {
    if (!csvFile.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setFile(csvFile)
    setError(null)
    setLoading(true)

    try {
      const text = await csvFile.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      
      // Parse first few rows for preview
      const previewData = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        return row
      }).filter(row => Object.values(row).some(val => val !== ''))

      setCsvHeaders(headers)
      setCsvData(previewData)
      setStep('mapping')
      
      // Auto-map columns using simple string matching
      const autoMapping: ColumnMapping = {}
      EXPECTED_COLUMNS.forEach(expectedCol => {
        const matchedHeader = headers.find(header => 
          header.toLowerCase().includes(expectedCol.key.toLowerCase()) ||
          expectedCol.label.toLowerCase().includes(header.toLowerCase())
        )
        autoMapping[expectedCol.key] = matchedHeader || null
      })
      setColumnMapping(autoMapping)
      
    } catch (err) {
      console.error('Error parsing CSV:', err)
      toast.error('Error parsing CSV file')
      setError('Failed to parse CSV file')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const csvFile = event.target.files?.[0]
    if (!csvFile) {return}
    await processFile(csvFile)
  }, [processFile])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      await processFile(acceptedFiles[0])
    }
  }, [processFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
  })



  const handleColumnMappingChange = (expectedColumn: string, csvColumn: string | null) => {
    setColumnMapping(prev => ({
      ...prev,
      [expectedColumn]: csvColumn
    }))
  }

  const startImport = async () => {
    if (!file) {
      toast.error('No file selected')
      return
    }

    // Validate required mappings
    const requiredColumns = EXPECTED_COLUMNS.filter(col => col.required)
    const missingRequired = requiredColumns.filter(col => !columnMapping[col.key])
    
    if (missingRequired.length > 0) {
      toast.error(`Please map required columns: ${missingRequired.map(col => col.label).join(', ')}`)
      return
    }

    setLoading(true)
    setStep('importing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (categoryId) {
        formData.append('categoryId', categoryId)
      }

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      setImportResult(result)
      
      // Start polling for job status
      if (result.jobId) {
        pollJobStatus(result.jobId)
      }
      
      toast.success(`Import started! Processing ${result.validRows} valid rows.`)
      
    } catch (err: any) {
      console.error('Import error:', err)
      setError(err.message || 'Import failed')
      toast.error(err.message || 'Import failed')
      setStep('mapping')
    } finally {
      setLoading(false)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data: job, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single()

        if (error) {
          console.error('Error fetching job status:', error)
          clearInterval(pollInterval)
          return
        }

        // Transform job data to match ImportJob interface
        const parameters = job.parameters as any
        const transformedJob: ImportJob = {
          id: job.id,
          status: job.status as 'pending' | 'processing' | 'completed' | 'failed',
          totalRows: parameters?.totalRows || 0,
          validRows: parameters?.validRows || 0,
          invalidRows: parameters?.invalidRows || 0,
          processedRows: job.progress || 0,
          error: (job.error as any) || undefined
        }
        setImportJob(transformedJob)

        if (job.status === 'completed') {
          clearInterval(pollInterval)
          setStep('complete')
          toast.success('Import completed successfully!')
          onImportComplete?.(jobId)
        } else if (job.status === 'failed') {
          clearInterval(pollInterval)
          setError((job.parameters as any)?.error || 'Import failed')
          toast.error('Import failed')
        }
      } catch (err) {
        console.error('Error polling job status:', err)
        clearInterval(pollInterval)
      }
    }, 2000)

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000)
  }

  const resetImport = () => {
    setFile(null)
    setCsvData([])
    setCsvHeaders([])
    setColumnMapping({})
    setCategoryId('')
    setStep('upload')
    setImportResult(null)
    setImportJob(null)
    setError(null)
  }

  const renderUploadStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudArrowUpIcon className="h-5 w-5" />
          Upload CSV File
        </CardTitle>
        <CardDescription>
          Upload a CSV file containing your product data. The file should include columns for product information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <div>
            {isDragActive ? (
              <p className="text-blue-600 mb-2">Drop the CSV file here...</p>
            ) : (
              <>
                <p className="text-gray-600 mb-2">Drag & drop a CSV file here, or click to select</p>
                <p className="text-sm text-gray-500">Supports .csv files up to 10MB</p>
              </>
            )}
          </div>
        </div>
        
        {error && (
          <Alert className="mt-4">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )

  const renderMappingStep = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Map CSV Columns</CardTitle>
        <CardDescription>
          Map your CSV columns to the expected product fields. Required fields are marked with *.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CSV Preview */}
        <div>
          <Label className="text-sm font-medium mb-2 block">CSV Preview</Label>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <p className="text-sm text-gray-600">
                File: {file?.name} • {csvData.length} preview rows
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {csvHeaders.map((header, index) => (
                      <th key={index} className="px-4 py-2 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 3).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b">
                      {csvHeaders.map((header, colIndex) => (
                        <td key={colIndex} className="px-4 py-2 text-gray-600">
                          {row[header] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Column Mapping */}
        <div>
          <Label className="text-sm font-medium mb-4 block">Column Mapping</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXPECTED_COLUMNS.map((expectedCol) => (
              <div key={expectedCol.key} className="space-y-2">
                <Label className="text-sm">
                  {expectedCol.label}
                  {expectedCol.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Select
                  value={columnMapping[expectedCol.key] || ''}
                  onValueChange={(value) => handleColumnMappingChange(expectedCol.key, value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select CSV column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Category Selection */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Product Category (Optional)</Label>
          <Input
            placeholder="Enter category name"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
        </div>

        {error && (
          <Alert>
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={resetImport}>
            Start Over
          </Button>
          <Button onClick={startImport} disabled={loading}>
            {loading ? 'Starting Import...' : 'Start Import'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderImportingStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          Importing Products
        </CardTitle>
        <CardDescription>
          Please wait while we process your CSV file and create products.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{importResult.totalRows}</div>
                <div className="text-sm text-gray-600">Total Rows</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{importResult.validRows}</div>
                <div className="text-sm text-gray-600">Valid Rows</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{importResult.invalidRows}</div>
                <div className="text-sm text-gray-600">Invalid Rows</div>
              </div>
            </div>

            {importJob && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>
                    {importJob.processedRows || 0} / {importJob.totalRows}
                  </span>
                </div>
                <Progress 
                  value={((importJob.processedRows || 0) / importJob.totalRows) * 100} 
                  className="w-full"
                />
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Badge variant={importJob.status === 'processing' ? 'default' : 'secondary'}>
                    {importJob.status}
                  </Badge>
                  <span>Job ID: {importJob.id}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <Alert>
            <XCircleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )

  const renderCompleteStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <CheckCircleIcon className="h-5 w-5" />
          Import Complete
        </CardTitle>
        <CardDescription>
          Your CSV file has been successfully processed and products have been created.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {importResult && importJob && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {importJob.processedRows || importResult.validRows}
                </div>
                <div className="text-sm text-gray-600">Products Created</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{importResult.invalidRows}</div>
                <div className="text-sm text-gray-600">Rows Skipped</div>
              </div>
            </div>

            {importResult.invalidRows > 0 && importResult.invalidRowDetails && (
              <Alert>
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertDescription>
                  {importResult.invalidRows} rows were skipped due to validation errors. 
                  Check the job details for more information.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={resetImport}>
            Import Another File
          </Button>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="p-6">
      {step === 'upload' && renderUploadStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'importing' && renderImportingStep()}
      {step === 'complete' && renderCompleteStep()}
    </div>
  )
}