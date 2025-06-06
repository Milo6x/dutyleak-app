'use client'

import { useState, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface ImportResult {
  success: boolean
  message: string
  imported_count?: number
  failed_count?: number
  errors?: string[]
}

export default function ImportProductsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createBrowserClient()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }
    setFile(selectedFile)
    setResult(null)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {return}

    setUploading(true)
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setResult(data)
    } catch (error) {
      console.error('Upload error:', error)
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
      })
    } finally {
      setUploading(false)
    }
  }

  const resetUpload = () => {
    setFile(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            href="/products"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Products
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload a CSV file to import multiple products at once
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">
            CSV Format Requirements
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>Your CSV file should include the following columns:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>title</strong> - Product title (optional)</li>
              <li><strong>asin</strong> - Amazon Standard Identification Number (optional)</li>
              <li><strong>cost</strong> - Product cost in USD (optional)</li>
              <li><strong>weight</strong> - Product weight in pounds (optional)</li>
              <li><strong>category</strong> - Product category (optional)</li>
              <li><strong>subcategory</strong> - Product subcategory (optional)</li>
              <li><strong>dimensions_length</strong> - Length in inches (optional)</li>
              <li><strong>dimensions_width</strong> - Width in inches (optional)</li>
              <li><strong>dimensions_height</strong> - Height in inches (optional)</li>
            </ul>
            <p className="mt-3">
              <strong>Note:</strong> All columns are optional, but at least one should be provided for meaningful data.
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white shadow rounded-lg p-6">
          {!result ? (
            <div className="space-y-6">
              {/* File Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50'
                    : file
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="text-sm">
                      <label className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                        Choose a CSV file
                      </label>
                      <p className="text-gray-500">or drag and drop it here</p>
                    </div>
                    <p className="text-xs text-gray-500">CSV files only, up to 10MB</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={resetUpload}
                  disabled={!file}
                  className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
                <div className="flex space-x-3">
                  <Link
                    href="/products"
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </Link>
                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <div className="flex items-center">
                        <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Importing...
                      </div>
                    ) : (
                      'Import Products'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Results */
            <div className="space-y-6">
              <div className="text-center">
                {result.success ? (
                  <div className="space-y-3">
                    <CheckCircle className="mx-auto h-16 w-16 text-green-400" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Import Successful!
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {result.message}
                      </p>
                    </div>
                    {(result.imported_count || result.failed_count) && (
                      <div className="bg-gray-50 rounded-lg p-4 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          {result.imported_count !== undefined && (
                            <div>
                              <p className="font-medium text-green-600">
                                {result.imported_count} Imported
                              </p>
                            </div>
                          )}
                          {result.failed_count !== undefined && result.failed_count > 0 && (
                            <div>
                              <p className="font-medium text-red-600">
                                {result.failed_count} Failed
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AlertTriangle className="mx-auto h-16 w-16 text-red-400" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Import Failed
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {result.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Details */}
              {result.errors && result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    Error Details:
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {result.errors.map((error, index) => (
                      <li key={index} className="flex items-start">
                        <span className="flex-shrink-0 w-4 h-4 mt-0.5 mr-2">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Import Another File
                </button>
                <Link
                  href="/products"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  View Products
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sample CSV */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Sample CSV Format
          </h3>
          <div className="bg-white border rounded-md p-4 text-sm font-mono overflow-x-auto">
            <div className="text-gray-600">
              title,asin,cost,weight,category,subcategory,dimensions_length,dimensions_width,dimensions_height<br/>
              &quot;Wireless Headphones&quot;,&quot;B08XYZ123&quot;,29.99,0.5,&quot;Electronics&quot;,&quot;Audio&quot;,8,6,3<br/>
              &quot;Coffee Mug&quot;,&quot;B09ABC456&quot;,12.50,0.8,&quot;Home & Kitchen&quot;,&quot;Drinkware&quot;,4,4,4<br/>
              &quot;Notebook&quot;,&quot;B07DEF789&quot;,5.99,0.3,&quot;Office Products&quot;,&quot;Paper&quot;,11,8.5,0.5
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Download this as a template and modify it with your product data.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}