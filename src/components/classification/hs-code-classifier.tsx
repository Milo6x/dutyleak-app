'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle, Copy, ExternalLink, Search, Upload, Image, Clock, Zap } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { ClassificationRequest, ClassificationResult, ClassificationResponse } from '@/lib/classification/hs-code-classifier'

interface HSCodeClassifierProps {
  onClassificationComplete?: (result: ClassificationResult) => void
}

export default function HSCodeClassifier({ onClassificationComplete }: HSCodeClassifierProps) {
  const [formData, setFormData] = useState({
    productDescription: '',
    productName: '',
    imageUrl: '',
    originCountry: '',
    destinationCountry: '',
    additionalContext: '',
    existingHsCode: '',
    productCategory: '',
    useEnhanced: true
  })
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [response, setResponse] = useState<ClassificationResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  
  const productCategories = [
    'Electronics',
    'Textiles',
    'Machinery',
    'Chemicals',
    'Food & Beverages',
    'Automotive',
    'Medical Devices',
    'Furniture',
    'Toys & Games',
    'Sports Equipment',
    'Other'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.productDescription.trim()) {
      setError('Product description is required')
      return
    }

    if (formData.productDescription.length < 10) {
      setError('Product description must be at least 10 characters long')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)
    setResponse(null)

    try {
      const response = await fetch('/api/classification/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      setResponse(data)

      if (!response.ok) {
        throw new Error(data.error || 'Classification failed')
      }

      if (data.success && data.result) {
        setResult(data.result)
        onClassificationComplete?.(data.result)
      } else {
        throw new Error(data.error || 'No classification result received')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Image file size must be less than 5MB')
      return
    }

    setUploadProgress(0)
    
    try {
      // Create FormData for file upload
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 100)

      // Upload to your image storage service (placeholder)
      // In a real implementation, you'd upload to S3, Cloudinary, etc.
      const uploadResponse = await fetch('/api/upload/image', {
        method: 'POST',
        body: uploadFormData,
      })

      if (uploadResponse.ok) {
        const { imageUrl } = await uploadResponse.json()
        setFormData(prev => ({ ...prev, imageUrl }))
        setUploadProgress(100)
        setTimeout(() => setUploadProgress(0), 1000)
      } else {
        throw new Error('Upload failed')
      }
    } catch (err) {
      setError('Failed to upload image')
      setUploadProgress(0)
      console.error('Image upload error:', err)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  const handleCopyCode = async () => {
    if (result?.hsCode) {
      await navigator.clipboard.writeText(result.hsCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) {return 'bg-green-100 text-green-800'}
    if (confidence >= 60) {return 'bg-yellow-100 text-yellow-800'}
    return 'bg-red-100 text-red-800'
  }

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'openai': return 'bg-blue-100 text-blue-800'
      case 'anthropic': return 'bg-purple-100 text-purple-800'
      case 'customs': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Classification Form */}
      <Card>
        <CardHeader>
          <CardTitle>HS Code Classification</CardTitle>
          <CardDescription>
            Enter your product details to get an accurate HS code classification using AI-powered analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Enhanced Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <div>
                  <Label htmlFor="useEnhanced" className="text-sm font-medium">Enhanced AI Classification</Label>
                  <p className="text-xs text-gray-600">Use advanced multi-model AI with improved accuracy</p>
                </div>
              </div>
              <Switch
                id="useEnhanced"
                checked={formData.useEnhanced}
                onCheckedChange={(checked) => setFormData({ ...formData, useEnhanced: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productDescription">Product Description *</Label>
              <Textarea
                id="productDescription"
                placeholder="Describe your product in detail (e.g., 'Cotton t-shirts, 100% cotton, short sleeve, crew neck, for men')..."
                value={formData.productDescription}
                onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                className="min-h-[100px]"
                maxLength={2000}
              />
              <div className="text-sm text-gray-500">
                {formData.productDescription.length}/2000 characters
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  placeholder="Enter product name"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productCategory">Product Category</Label>
                <Select
                  value={formData.productCategory}
                  onValueChange={(value) => setFormData({ ...formData, productCategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="originCountry">Origin Country</Label>
                <Input
                  id="originCountry"
                  placeholder="e.g., China, USA, Germany"
                  value={formData.originCountry}
                  onChange={(e) => setFormData({ ...formData, originCountry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationCountry">Destination Country</Label>
                <Input
                  id="destinationCountry"
                  placeholder="e.g., USA, UK, Canada"
                  value={formData.destinationCountry}
                  onChange={(e) => setFormData({ ...formData, destinationCountry: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="existingHsCode">Existing HS Code (Reference)</Label>
                <Input
                  id="existingHsCode"
                  placeholder="e.g., 8471.30"
                  value={formData.existingHsCode}
                  onChange={(e) => setFormData({ ...formData, existingHsCode: e.target.value })}
                />
              </div>
            </div>

            {/* Image Upload Section */}
            {formData.useEnhanced && (
              <div className="space-y-2">
                <Label>Product Image (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  {formData.imageUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Image uploaded successfully</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      >
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Image className="h-8 w-8 mx-auto text-gray-400" />
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadProgress > 0}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Image
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                      </div>
                      {uploadProgress > 0 && (
                        <div className="w-full max-w-xs mx-auto">
                          <Progress value={uploadProgress} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1">{uploadProgress}% uploaded</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="additionalContext">Additional Context</Label>
              <Textarea
                id="additionalContext"
                placeholder="Any additional information that might help with classification (materials, intended use, etc.)..."
                value={formData.additionalContext}
                onChange={(e) => setFormData({ ...formData, additionalContext: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            <Button type="submit" disabled={isLoading || !formData.productDescription.trim()} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Classifying...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Classify Product
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Classification Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Classification Result</span>
              <div className="flex items-center space-x-2">
                <Badge className={getSourceBadgeColor(result.source)}>
                  {result.source.toUpperCase()}
                </Badge>
                <Badge className={getConfidenceColor(result.confidence)}>
                  {result.confidence}% confidence
                </Badge>
                {response?.fallbackUsed && (
                  <Badge variant="outline" className="text-xs">
                    Fallback Used
                  </Badge>
                )}
              </div>
            </CardTitle>
            {response && (
              <CardDescription className="flex items-center gap-4 text-xs">
                {result.source && (
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Source: {result.source}
                  </span>
                )}
                {response.fallbackUsed && (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Fallback used
                  </span>
                )}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main HS Code */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">HS Code</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="flex items-center space-x-1"
                >
                  <Copy className="h-4 w-4" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
              <div className="text-2xl font-mono font-bold text-blue-600 mb-2">
                {result.hsCode}
              </div>
              <p className="text-gray-700">{result.description}</p>
            </div>

            {/* Reasoning */}
            {result.reasoning && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Classification Reasoning</h4>
                <p className="text-sm text-gray-700">{result.reasoning}</p>
              </div>
            )}



            {/* Reasoning */}
            <div>
              <h4 className="font-semibold mb-2">Classification Reasoning</h4>
              <p className="text-gray-700 leading-relaxed">{result.reasoning}</p>
            </div>

            {/* Alternative Codes */}
            {result.alternativeCodes && result.alternativeCodes.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Alternative Classifications</h4>
                <div className="space-y-2">
                  {result.alternativeCodes.map((alt, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-semibold">{alt.code}</span>
                        <Badge className={getConfidenceColor(alt.confidence)}>
                          {alt.confidence}%
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{alt.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                View in WTO Database
              </Button>
              <Button variant="outline" size="sm">
                <CheckCircle className="mr-2 h-4 w-4" />
                Save to Products
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setResult(null)
                  setError(null)
                  setFormData({
                    productDescription: '',
                    productName: '',
                    imageUrl: '',
                    originCountry: formData.originCountry,
                    destinationCountry: formData.destinationCountry,
                    additionalContext: '',
                    existingHsCode: '',
                    productCategory: '',
                    useEnhanced: true
                  })
                }}
              >
                Classify Another
              </Button>

            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}