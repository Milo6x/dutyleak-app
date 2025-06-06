'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Image,
  CheckCircle,
  AlertCircle,
  Info,
  Lightbulb,
  Target,
  Search,
  Zap,
  Globe,
  Package,
  FileText,
  Camera,
  Brain,
  Shield
} from 'lucide-react'

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  required: boolean
}

interface ClassificationWizardProps {
  onComplete?: (data: any) => void
  onCancel?: () => void
  initialData?: Partial<WizardFormData>
}

interface WizardFormData {
  // Step 1: Basic Product Info
  productName: string
  productDescription: string
  productCategory: string
  
  // Step 2: Product Details
  materials: string[]
  intendedUse: string
  technicalSpecs: string
  dimensions: string
  weight: string
  
  // Step 3: Trade Information
  originCountry: string
  destinationCountry: string
  manufacturerInfo: string
  brandInfo: string
  
  // Step 4: Images and Documentation
  productImages: File[]
  technicalDocs: File[]
  certificates: File[]
  
  // Step 5: Additional Context
  existingHsCode: string
  previousClassifications: string
  additionalContext: string
  urgencyLevel: 'low' | 'medium' | 'high'
  
  // Step 6: AI Configuration
  useEnhancedAI: boolean
  confidenceThreshold: number
  enableImageAnalysis: boolean
  enableComplianceCheck: boolean
}

const wizardSteps: WizardStep[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Tell us about your product',
    icon: <Package className="h-5 w-5" />,
    required: true
  },
  {
    id: 'details',
    title: 'Product Details',
    description: 'Detailed specifications',
    icon: <FileText className="h-5 w-5" />,
    required: false
  },
  {
    id: 'trade',
    title: 'Trade Information',
    description: 'Origin and destination details',
    icon: <Globe className="h-5 w-5" />,
    required: false
  },
  {
    id: 'media',
    title: 'Images & Documents',
    description: 'Upload supporting materials',
    icon: <Camera className="h-5 w-5" />,
    required: false
  },
  {
    id: 'context',
    title: 'Additional Context',
    description: 'Extra information and preferences',
    icon: <Info className="h-5 w-5" />,
    required: false
  },
  {
    id: 'ai-config',
    title: 'AI Configuration',
    description: 'Configure classification settings',
    icon: <Brain className="h-5 w-5" />,
    required: false
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Review your information',
    icon: <CheckCircle className="h-5 w-5" />,
    required: true
  }
]

const productCategories = [
  'Electronics & Technology',
  'Textiles & Apparel',
  'Machinery & Equipment',
  'Chemicals & Materials',
  'Food & Beverages',
  'Automotive & Transportation',
  'Medical & Healthcare',
  'Furniture & Home Goods',
  'Toys & Recreation',
  'Sports & Fitness',
  'Books & Media',
  'Jewelry & Accessories',
  'Agricultural Products',
  'Construction Materials',
  'Energy & Power',
  'Other'
]

const commonMaterials = [
  'Cotton', 'Polyester', 'Wool', 'Silk', 'Leather',
  'Plastic', 'Metal', 'Wood', 'Glass', 'Ceramic',
  'Rubber', 'Paper', 'Cardboard', 'Silicon', 'Carbon Fiber'
]

export default function ClassificationWizard({
  onComplete,
  onCancel,
  initialData
}: ClassificationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<WizardFormData>({
    productName: '',
    productDescription: '',
    productCategory: '',
    materials: [],
    intendedUse: '',
    technicalSpecs: '',
    dimensions: '',
    weight: '',
    originCountry: '',
    destinationCountry: '',
    manufacturerInfo: '',
    brandInfo: '',
    productImages: [],
    technicalDocs: [],
    certificates: [],
    existingHsCode: '',
    previousClassifications: '',
    additionalContext: '',
    urgencyLevel: 'medium',
    useEnhancedAI: true,
    confidenceThreshold: 70,
    enableImageAnalysis: true,
    enableComplianceCheck: true,
    ...initialData
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const updateFormData = (updates: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    // Clear related errors
    const newErrors = { ...errors }
    Object.keys(updates).forEach(key => {
      delete newErrors[key]
    })
    setErrors(newErrors)
  }

  const validateStep = (stepIndex: number): boolean => {
    const step = wizardSteps[stepIndex]
    const newErrors: Record<string, string> = {}

    switch (step.id) {
      case 'basic':
        if (!formData.productName.trim()) {
          newErrors.productName = 'Product name is required'
        }
        if (!formData.productDescription.trim()) {
          newErrors.productDescription = 'Product description is required'
        }
        if (formData.productDescription.length < 20) {
          newErrors.productDescription = 'Description must be at least 20 characters'
        }
        break
      case 'trade':
        if (formData.originCountry && formData.destinationCountry && 
            formData.originCountry === formData.destinationCountry) {
          newErrors.destinationCountry = 'Destination must be different from origin'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, wizardSteps.length - 1))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep || validateStep(currentStep)) {
      setCurrentStep(stepIndex)
    }
  }

  const handleFileUpload = (field: keyof WizardFormData, files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files)
      updateFormData({ [field]: fileArray })
    }
  }

  const handleMaterialToggle = (material: string) => {
    const currentMaterials = formData.materials
    const newMaterials = currentMaterials.includes(material)
      ? currentMaterials.filter(m => m !== material)
      : [...currentMaterials, material]
    updateFormData({ materials: newMaterials })
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {return}

    setIsSubmitting(true)
    try {
      // Prepare form data for submission
      const submissionData = {
        ...formData,
        // Convert files to base64 or upload URLs as needed
        productImages: formData.productImages.map(f => f.name),
        technicalDocs: formData.technicalDocs.map(f => f.name),
        certificates: formData.certificates.map(f => f.name)
      }
      
      await onComplete?.(submissionData)
    } catch (error) {
      console.error('Submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStepProgress = () => {
    return ((currentStep + 1) / wizardSteps.length) * 100
  }

  const renderStepContent = () => {
    const step = wizardSteps[currentStep]

    switch (step.id) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                placeholder="Enter the product name"
                value={formData.productName}
                onChange={(e) => updateFormData({ productName: e.target.value })}
                className={errors.productName ? 'border-red-500' : ''}
              />
              {errors.productName && (
                <p className="text-sm text-red-600">{errors.productName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="productDescription">Product Description *</Label>
              <Textarea
                id="productDescription"
                placeholder="Provide a detailed description of your product, including materials, features, and intended use..."
                value={formData.productDescription}
                onChange={(e) => updateFormData({ productDescription: e.target.value })}
                className={`min-h-[120px] ${errors.productDescription ? 'border-red-500' : ''}`}
                maxLength={2000}
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{errors.productDescription || 'Be as specific as possible for better accuracy'}</span>
                <span>{formData.productDescription.length}/2000</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productCategory">Product Category</Label>
              <Select
                value={formData.productCategory}
                onValueChange={(value) => updateFormData({ productCategory: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
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

            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> The more detailed your description, the more accurate the classification will be. Include materials, dimensions, intended use, and any technical specifications.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'details':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Materials Used</Label>
              <div className="grid grid-cols-3 gap-2">
                {commonMaterials.map((material) => (
                  <Button
                    key={material}
                    type="button"
                    variant={formData.materials.includes(material) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleMaterialToggle(material)}
                    className="justify-start"
                  >
                    {material}
                  </Button>
                ))}
              </div>
              {formData.materials.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.materials.map((material) => (
                    <Badge key={material} variant="secondary">
                      {material}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="intendedUse">Intended Use</Label>
                <Textarea
                  id="intendedUse"
                  placeholder="How will this product be used?"
                  value={formData.intendedUse}
                  onChange={(e) => updateFormData({ intendedUse: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="technicalSpecs">Technical Specifications</Label>
                <Textarea
                  id="technicalSpecs"
                  placeholder="Technical details, specifications, standards..."
                  value={formData.technicalSpecs}
                  onChange={(e) => updateFormData({ technicalSpecs: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  placeholder="Length x Width x Height (with units)"
                  value={formData.dimensions}
                  onChange={(e) => updateFormData({ dimensions: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  placeholder="Weight (with units)"
                  value={formData.weight}
                  onChange={(e) => updateFormData({ weight: e.target.value })}
                />
              </div>
            </div>
          </div>
        )

      case 'trade':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originCountry">Country of Origin</Label>
                <Input
                  id="originCountry"
                  placeholder="e.g., China, USA, Germany"
                  value={formData.originCountry}
                  onChange={(e) => updateFormData({ originCountry: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinationCountry">Destination Country</Label>
                <Input
                  id="destinationCountry"
                  placeholder="e.g., USA, UK, Canada"
                  value={formData.destinationCountry}
                  onChange={(e) => updateFormData({ destinationCountry: e.target.value })}
                  className={errors.destinationCountry ? 'border-red-500' : ''}
                />
                {errors.destinationCountry && (
                  <p className="text-sm text-red-600">{errors.destinationCountry}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturerInfo">Manufacturer Information</Label>
                <Textarea
                  id="manufacturerInfo"
                  placeholder="Manufacturer name, location, certifications..."
                  value={formData.manufacturerInfo}
                  onChange={(e) => updateFormData({ manufacturerInfo: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandInfo">Brand Information</Label>
                <Textarea
                  id="brandInfo"
                  placeholder="Brand name, model number, series..."
                  value={formData.brandInfo}
                  onChange={(e) => updateFormData({ brandInfo: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <Alert>
              <Globe className="h-4 w-4" />
              <AlertDescription>
                Trade information helps determine applicable tariffs, restrictions, and compliance requirements.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'media':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Product Images</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRefs.current.productImages?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Product Images
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 5MB each</p>
                  {formData.productImages.length > 0 && (
                    <div className="mt-2">
                      <Badge variant="secondary">
                        {formData.productImages.length} file(s) selected
                      </Badge>
                    </div>
                  )}
                </div>
                <input
                  ref={(el) => { fileInputRefs.current.productImages = el }}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload('productImages', e.target.files)}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <Label>Technical Documentation</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRefs.current.technicalDocs?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Technical Docs
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">PDF, DOC, TXT up to 10MB each</p>
                  {formData.technicalDocs.length > 0 && (
                    <div className="mt-2">
                      <Badge variant="secondary">
                        {formData.technicalDocs.length} file(s) selected
                      </Badge>
                    </div>
                  )}
                </div>
                <input
                  ref={(el) => { fileInputRefs.current.technicalDocs = el }}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  multiple
                  onChange={(e) => handleFileUpload('technicalDocs', e.target.files)}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <Label>Certificates & Compliance Docs</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Shield className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRefs.current.certificates?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Certificates
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">CE, FCC, ISO certificates, etc.</p>
                  {formData.certificates.length > 0 && (
                    <div className="mt-2">
                      <Badge variant="secondary">
                        {formData.certificates.length} file(s) selected
                      </Badge>
                    </div>
                  )}
                </div>
                <input
                  ref={(el) => { fileInputRefs.current.certificates = el }}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={(e) => handleFileUpload('certificates', e.target.files)}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        )

      case 'context':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="existingHsCode">Existing HS Code (if known)</Label>
              <Input
                id="existingHsCode"
                placeholder="e.g., 8471.30.0100"
                value={formData.existingHsCode}
                onChange={(e) => updateFormData({ existingHsCode: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousClassifications">Previous Classifications</Label>
              <Textarea
                id="previousClassifications"
                placeholder="Any previous HS codes used for similar products..."
                value={formData.previousClassifications}
                onChange={(e) => updateFormData({ previousClassifications: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalContext">Additional Context</Label>
              <Textarea
                id="additionalContext"
                placeholder="Any other information that might help with classification..."
                value={formData.additionalContext}
                onChange={(e) => updateFormData({ additionalContext: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Urgency Level</Label>
              <Select
                value={formData.urgencyLevel}
                onValueChange={(value: 'low' | 'medium' | 'high') => updateFormData({ urgencyLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Standard processing</SelectItem>
                  <SelectItem value="medium">Medium - Priority processing</SelectItem>
                  <SelectItem value="high">High - Urgent classification needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'ai-config':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <div>
                    <Label htmlFor="useEnhancedAI" className="text-sm font-medium">Enhanced AI Classification</Label>
                    <p className="text-xs text-gray-600">Use advanced multi-model AI with improved accuracy</p>
                  </div>
                </div>
                <Switch
                  id="useEnhancedAI"
                  checked={formData.useEnhancedAI}
                  onCheckedChange={(checked) => updateFormData({ useEnhancedAI: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Confidence Threshold: {formData.confidenceThreshold}%</Label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={formData.confidenceThreshold}
                  onChange={(e) => updateFormData({ confidenceThreshold: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>50% (More results)</span>
                  <span>95% (Higher accuracy)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Image className="h-4 w-4" />
                  <div>
                    <Label className="text-sm font-medium">Image Analysis</Label>
                    <p className="text-xs text-gray-600">Analyze product images for better classification</p>
                  </div>
                </div>
                <Switch
                  checked={formData.enableImageAnalysis}
                  onCheckedChange={(checked) => updateFormData({ enableImageAnalysis: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <div>
                    <Label className="text-sm font-medium">Compliance Check</Label>
                    <p className="text-xs text-gray-600">Check for trade restrictions and compliance issues</p>
                  </div>
                </div>
                <Switch
                  checked={formData.enableComplianceCheck}
                  onCheckedChange={(checked) => updateFormData({ enableComplianceCheck: checked })}
                />
              </div>
            </div>

            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                These settings control how the AI processes your classification request. Higher thresholds provide more accurate results but may require manual review for edge cases.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Review Your Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Product:</strong> {formData.productName || 'Not specified'}</div>
                    <div><strong>Category:</strong> {formData.productCategory || 'Not specified'}</div>
                    <div><strong>Description:</strong> {formData.productDescription.substring(0, 100)}{formData.productDescription.length > 100 ? '...' : ''}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Trade Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Origin:</strong> {formData.originCountry || 'Not specified'}</div>
                    <div><strong>Destination:</strong> {formData.destinationCountry || 'Not specified'}</div>
                    <div><strong>Materials:</strong> {formData.materials.length > 0 ? formData.materials.join(', ') : 'Not specified'}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Uploaded Files</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Images:</strong> {formData.productImages.length} files</div>
                    <div><strong>Documents:</strong> {formData.technicalDocs.length} files</div>
                    <div><strong>Certificates:</strong> {formData.certificates.length} files</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">AI Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Enhanced AI:</strong> {formData.useEnhancedAI ? 'Enabled' : 'Disabled'}</div>
                    <div><strong>Confidence Threshold:</strong> {formData.confidenceThreshold}%</div>
                    <div><strong>Image Analysis:</strong> {formData.enableImageAnalysis ? 'Enabled' : 'Disabled'}</div>
                    <div><strong>Compliance Check:</strong> {formData.enableComplianceCheck ? 'Enabled' : 'Disabled'}</div>
                  </CardContent>
                </Card>
              </div>

              {formData.urgencyLevel === 'high' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>High Priority:</strong> This classification will be processed with priority.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )

      default:
        return <div>Step not found</div>
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Classification Wizard</h1>
        <p className="text-gray-600">Step-by-step product classification</p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Step {currentStep + 1} of {wizardSteps.length}</span>
          <span>{Math.round(getStepProgress())}% Complete</span>
        </div>
        <Progress value={getStepProgress()} className="h-2" />
      </div>

      {/* Step Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {wizardSteps.map((step, index) => (
          <Button
            key={step.id}
            variant={index === currentStep ? 'default' : index < currentStep ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => handleStepClick(index)}
            className="flex items-center space-x-1"
            disabled={index > currentStep && !validateStep(currentStep)}
          >
            {step.icon}
            <span className="hidden sm:inline">{step.title}</span>
            {step.required && <span className="text-red-500">*</span>}
          </Button>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {wizardSteps[currentStep].icon}
            <span>{wizardSteps[currentStep].title}</span>
            {wizardSteps[currentStep].required && <span className="text-red-500">*</span>}
          </CardTitle>
          <CardDescription>
            {wizardSteps[currentStep].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onCancel : handlePrevious}
          disabled={isSubmitting}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </Button>

        {currentStep === wizardSteps.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !validateStep(currentStep)}
          >
            {isSubmitting ? (
              <>
                <Target className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Start Classification
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!validateStep(currentStep)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}